package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	sessionCookie = "chelaa_session"
	sessionTTL    = 30 * 24 * time.Hour
	devPassword   = "chelaa123"

	// A valid bcrypt hash of a random string nobody knows; compared against
	// when the account doesn't exist so login timing stays constant.
	dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
)

// Production runs behind HTTPS; set COOKIE_SECURE=1 there.
var secureCookies = os.Getenv("COOKIE_SECURE") == "1"

// Handles appear in URLs (/people/{handle}) and as avatar seeds — keep them tight.
var (
	handleRe = regexp.MustCompile(`^[a-z0-9-]{2,30}$`)
	emailRe  = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
)

type user struct {
	ID     int64  `json:"-"`
	Handle string `json:"handle"`
	Name   string `json:"name"`
}

// ensureDevPasswords gives seeded users a known password so the app is usable
// immediately in dev. One bcrypt hash shared across all of them.
func ensureDevPasswords(ctx context.Context, pool *pgxpool.Pool) error {
	var missing int
	if err := pool.QueryRow(ctx,
		`select count(*) from users where password_hash = ''`).Scan(&missing); err != nil {
		return err
	}
	if missing == 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(devPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := pool.Exec(ctx,
		`update users set password_hash = $1 where password_hash = ''`, string(hash)); err != nil {
		return err
	}
	log.Printf("dev: seeded users can sign in with password %q", devPassword)
	return nil
}

// purgeExpired trims dead sessions and reset tokens so the tables don't grow
// without bound. Run on boot; a cron can take over later.
func purgeExpired(ctx context.Context, pool *pgxpool.Pool) {
	pool.Exec(ctx, `delete from sessions where expires_at < now()`)
	pool.Exec(ctx, `delete from password_resets where expires_at < now()`)
}

func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *server) setSession(ctx context.Context, w http.ResponseWriter, userID int64) error {
	token, err := newToken()
	if err != nil {
		return err
	}
	expires := time.Now().Add(sessionTTL)
	if _, err := s.db.Exec(ctx,
		`insert into sessions (token, user_id, expires_at) values ($1, $2, $3)`,
		token, userID, expires); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		Secure:   secureCookies,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

// currentUser resolves the session cookie to a user, or nil for anonymous.
func (s *server) currentUser(r *http.Request) *user {
	c, err := r.Cookie(sessionCookie)
	if err != nil || c.Value == "" {
		return nil
	}
	var u user
	err = s.db.QueryRow(r.Context(), `
		select u.id, u.handle, u.name
		from sessions s join users u on u.id = s.user_id
		where s.token = $1 and s.expires_at > now()`, c.Value).
		Scan(&u.ID, &u.Handle, &u.Name)
	if err != nil {
		return nil
	}
	return &u
}

type authInput struct {
	// Login: identifier (email or handle) + password.
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
	// Signup:
	Email     string `json:"email"`
	Handle    string `json:"handle"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// POST /api/auth/signup
func (s *server) signup(w http.ResponseWriter, r *http.Request) {
	var c authInput
	if err := decodeJSON(w, r, &c); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	c.Email = strings.ToLower(strings.TrimSpace(c.Email))
	c.Handle = strings.ToLower(strings.TrimSpace(c.Handle))
	c.FirstName = strings.TrimSpace(c.FirstName)
	c.LastName = strings.TrimSpace(c.LastName)

	switch {
	case !emailRe.MatchString(c.Email):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "enter a valid email"})
		return
	case c.FirstName == "" || c.LastName == "":
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "first and last name are required"})
		return
	case !handleRe.MatchString(c.Handle):
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "username must be 2–30 chars: a–z, 0–9, dashes"})
		return
	case len(c.Password) < 6:
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "password must be at least 6 characters"})
		return
	}

	name := c.FirstName + " " + c.LastName

	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	var id int64
	err = s.db.QueryRow(r.Context(), `
		insert into users (handle, name, email, first_name, last_name, password_hash)
		values ($1, $2, $3, $4, $5, $6) returning id`,
		c.Handle, name, c.Email, c.FirstName, c.LastName, string(hash)).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			msg := "that username is taken"
			if strings.Contains(pgErr.ConstraintName, "email") {
				msg = "that email is already registered"
			}
			writeJSON(w, http.StatusConflict, map[string]string{"error": msg})
			return
		}
		log.Printf("signup: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	if err := s.setSession(r.Context(), w, id); err != nil {
		log.Printf("signup session: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusCreated, user{Handle: c.Handle, Name: name})
}

// GET /api/auth/available?handle=… — live username check for the signup
// form. Handles are public identity, so probing them reveals nothing.
// Deliberately NO email variant: that would let anyone enumerate registered
// emails, defeating the forgot-password endpoint's protection — duplicate
// emails surface only as the signup 409.
func (s *server) available(w http.ResponseWriter, r *http.Request) {
	out := map[string]bool{"handle": true}
	if h := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("handle"))); h != "" {
		var exists bool
		s.db.QueryRow(r.Context(),
			`select exists(select 1 from users where handle = $1)`, h).Scan(&exists)
		out["handle"] = !exists
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/auth/login
func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var c authInput
	if err := decodeJSON(w, r, &c); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	id := strings.ToLower(strings.TrimSpace(c.Identifier))
	if id == "" {
		id = strings.ToLower(strings.TrimSpace(c.Handle))
	}

	var (
		u    user
		hash string
	)
	err := s.db.QueryRow(r.Context(), `
		select id, handle, name, password_hash from users
		where handle = $1 or lower(email) = $1`,
		id).Scan(&u.ID, &u.Handle, &u.Name, &hash)
	if err != nil {
		// Unknown account: burn a bcrypt compare anyway so response timing
		// doesn't reveal whether the identifier exists.
		hash = dummyHash
	}
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password)) != nil {
		writeJSON(w, http.StatusUnauthorized,
			map[string]string{"error": "wrong email/username or password"})
		return
	}

	if err := s.setSession(r.Context(), w, u.ID); err != nil {
		log.Printf("login session: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// POST /api/auth/logout
func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		s.db.Exec(r.Context(), `delete from sessions where token = $1`, c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true,
		Secure: secureCookies, SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/auth/me
func (s *server) me(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not signed in"})
		return
	}
	writeJSON(w, http.StatusOK, u)
}

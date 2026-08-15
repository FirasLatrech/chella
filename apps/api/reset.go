package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const resetTTL = time.Hour

/*
 * Password reset. No mailer exists yet, so the reset link is written to the
 * API log instead of an email — the token flow itself is the production one:
 * single-use, one-hour expiry, all sessions revoked on success, and the
 * forgot endpoint never reveals whether an email exists.
 */

// POST /api/auth/forgot — {email}. Always 200.
func (s *server) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))

	var userID int64
	err := s.db.QueryRow(r.Context(),
		`select id from users where lower(email) = $1`, email).Scan(&userID)
	if err == nil {
		if token, terr := newToken(); terr == nil {
			if _, ierr := s.db.Exec(r.Context(), `
				insert into password_resets (token, user_id, expires_at)
				values ($1, $2, $3)`,
				token, userID, time.Now().Add(resetTTL)); ierr == nil {
				link := fmt.Sprintf("%s/reset-password?token=%s", appURL(), token)
				body := emailShell("Reset your password",
					"<p>Use the button below to choose a new password. "+
						"The link works once and expires in an hour.</p>"+
						"<p>If you didn't ask for this, you can ignore this email.</p>",
					"Reset password", link)
				// Sent asynchronously: a synchronous provider round-trip
				// makes a registered address measurably slower than an
				// unknown one, which enumerates accounts despite the
				// identical response body.
				go func(to, html string) {
					ctx, cancel := context.WithTimeout(
						context.Background(), 15*time.Second)
					defer cancel()
					if merr := s.mail.Send(ctx, to,
						"Reset your Chelaa password", html); merr != nil {
						log.Printf("reset email: %v", merr)
					}
				}(email, body)
			}
		}
	}

	// Identical response whether or not the account exists.
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// POST /api/auth/reset — {token, password}.
func (s *server) resetPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if len(in.Password) < 6 {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "password must be at least 6 characters"})
		return
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer tx.Rollback(r.Context())

	var userID int64
	err = tx.QueryRow(r.Context(), `
		delete from password_resets
		where token = $1 and expires_at > now()
		returning user_id`, in.Token).Scan(&userID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "this reset link is invalid or has expired"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if _, err := tx.Exec(r.Context(),
		`update users set password_hash = $1 where id = $2`, string(hash), userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	// A reset invalidates every existing session for the account.
	if _, err := tx.Exec(r.Context(),
		`delete from sessions where user_id = $1`, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

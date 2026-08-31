package main

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"time"
)

const verifyTTL = 15 * time.Minute

/*
 * Email verification. A 6-digit code (not a link — easier to type from a
 * phone's notification while filling in a signup form on desktop), one
 * active code per user, 15-minute expiry. Signup logs the user in
 * immediately; the frontend gates protected pages on emailVerified until
 * this completes, same two-layer pattern as the session guard.
 */

func newVerificationCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	n := (uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])) % 1000000
	return fmt.Sprintf("%06d", n), nil
}

// sendVerificationCode generates a fresh code, stores it, and emails it.
// Best-effort and async, like every other notification email — a failed
// send must never fail the request that triggered it.
func (s *server) sendVerificationCode(userID int64, email string) {
	code, err := newVerificationCode()
	if err != nil {
		log.Printf("verification code: %v", err)
		return
	}
	if _, err := s.db.Exec(context.Background(), `
		insert into email_verifications (user_id, code, expires_at)
		values ($1, $2, $3)
		on conflict (user_id) do update set code = $2, expires_at = $3`,
		userID, code, time.Now().Add(verifyTTL)); err != nil {
		log.Printf("verification code: %v", err)
		return
	}
	go func(to, code string) {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		body := emailShell("Verify your email",
			fmt.Sprintf(
				"<p>Your Chelaa verification code is:</p>"+
					"<p style=\"font-size:28px;font-weight:600;letter-spacing:4px;margin:16px 0\">%s</p>"+
					"<p>It expires in 15 minutes.</p>", code),
			"", "")
		if err := s.mail.Send(ctx, to, "Your Chelaa verification code", body); err != nil {
			log.Printf("verification email: %v", err)
		}
	}(email, code)
}

// POST /api/auth/verify — {code}. Requires a session.
func (s *server) verifyEmail(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not signed in"})
		return
	}
	var in struct {
		Code string `json:"code"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer tx.Rollback(r.Context())

	tag, err := tx.Exec(r.Context(), `
		delete from email_verifications
		where user_id = $1 and code = $2 and expires_at > now()`,
		u.ID, in.Code)
	if err != nil || tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "that code is invalid or has expired"})
		return
	}
	if _, err := tx.Exec(r.Context(),
		`update users set email_verified = true where id = $1`, u.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// POST /api/auth/verify/resend. Requires a session.
func (s *server) resendVerification(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not signed in"})
		return
	}
	if u.EmailVerified {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	var email string
	if err := s.db.QueryRow(r.Context(),
		`select email from users where id = $1`, u.ID).Scan(&email); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	s.sendVerificationCode(u.ID, email)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

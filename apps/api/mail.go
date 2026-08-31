package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

/*
 * Outbound email.
 *
 * Two backends: Resend when RESEND_API_KEY is set, and a log-only mailer
 * otherwise so development needs no credentials and no messages escape to
 * real inboxes by accident. Swapping providers means one implementation of
 * this interface, not edits scattered through the handlers.
 *
 * Sending is best-effort and off the request path: a failed notification
 * email must never fail the reply that triggered it.
 */

type mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

type logMailer struct{}

func (logMailer) Send(_ context.Context, to, subject, body string) error {
	// The body is logged in full so reset links remain usable in dev.
	log.Printf("[mail] to=%s subject=%q\n%s", to, subject, body)
	return nil
}

type resendMailer struct {
	key  string
	from string
}

func (m resendMailer) Send(ctx context.Context, to, subject, body string) error {
	payload, err := json.Marshal(map[string]any{
		"from":    m.from,
		"to":      []string{to},
		"subject": subject,
		"html":    body,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+m.key)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("resend: status %d", res.StatusCode)
	}
	return nil
}

func newMailer() mailer {
	if key := os.Getenv("RESEND_API_KEY"); key != "" {
		from := env("MAIL_FROM", "Chelaa <noreply@chelaa.tech>")
		log.Printf("mail: using Resend (from %s)", from)
		return resendMailer{key: key, from: from}
	}
	log.Printf("mail: no provider configured, logging messages instead")
	return logMailer{}
}

// appURL is the public web address used in email links.
func appURL() string {
	return strings.TrimSuffix(env("APP_URL", "http://localhost:4100"), "/")
}

/*
 * Templates. Deliberately plain HTML: community mail that renders in every
 * client beats a layout that only survives in Gmail.
 */
func emailShell(heading, body, ctaLabel, ctaURL string) string {
	cta := ""
	if ctaURL != "" {
		cta = fmt.Sprintf(
			`<p style="margin:24px 0"><a href="%s" style="background:#00a5ef;color:#fff;`+
				`padding:10px 18px;border-radius:8px;text-decoration:none;`+
				`font-weight:500;display:inline-block">%s</a></p>`,
			html.EscapeString(ctaURL), html.EscapeString(ctaLabel))
	}
	return fmt.Sprintf(`<div style="font-family:-apple-system,BlinkMacSystemFont,`+
		`'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#111">`+
		`<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">%s</h1>`+
		`<div style="font-size:14px;line-height:1.6;color:#333">%s</div>%s`+
		`<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 12px">`+
		`<p style="font-size:12px;color:#888;margin:0">`+
		`You're receiving this because of activity on your Chelaa account. `+
		`<a href="%s/people" style="color:#888">Manage email preferences</a>.</p></div>`,
		html.EscapeString(heading), body, cta, appURL())
}

// sendNotificationEmail delivers an activity notification, if the recipient
// wants email for it. Runs in its own goroutine — best effort, never blocking
// the mutation that triggered it.
func (s *server) sendNotificationEmail(recipient int64, kind, actor, postTitle string, postID int64) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		var (
			email   string
			name    string
			enabled bool
		)
		err := s.db.QueryRow(ctx, `
			select email, name, email_notifications from users where id = $1`,
			recipient).Scan(&email, &name, &enabled)
		if err != nil || !enabled || email == "" {
			return
		}

		var heading, body string
		link := fmt.Sprintf("%s/post/%d", appURL(), postID)
		title := html.EscapeString(postTitle)
		switch kind {
		case "reply":
			heading = fmt.Sprintf("@%s replied to your post", actor)
			body = fmt.Sprintf("<p>There's a new reply on <strong>%s</strong>.</p>", title)
		case "thread":
			heading = fmt.Sprintf("@%s replied to your comment", actor)
			body = fmt.Sprintf("<p>There's a new reply in your thread on <strong>%s</strong>.</p>", title)
		case "vote":
			heading = fmt.Sprintf("@%s upvoted your post", actor)
			body = fmt.Sprintf("<p><strong>%s</strong> earned an upvote.</p>", title)
		case "accept":
			heading = "Your answer was accepted"
			body = fmt.Sprintf(
				"<p>@%s accepted your answer on <strong>%s</strong> — that's +20 reputation.</p>",
				html.EscapeString(actor), title)
		default:
			return
		}

		if err := s.mail.Send(ctx, email, heading,
			emailShell(heading, body, "View on Chelaa", link)); err != nil {
			log.Printf("notification email: %v", err)
		}
	}()
}

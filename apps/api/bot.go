package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
)

const botHandle = "chelaa_bot"

type botConfig struct {
	Enabled   bool    `json:"enabled"`
	Context   string  `json:"context"`
	RunHour   int     `json:"runHour"`
	Timezone  string  `json:"timezone"`
	LastRunAt *string `json:"lastRunAt,omitempty"`
}

type botSuggestion struct {
	ID        string   `json:"id"`
	Kind      string   `json:"kind"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
	Tags      []string `json:"tags"`
	Rationale string   `json:"rationale"`
	Status    string   `json:"status"`
	Time      string   `json:"time"`
	PostID    string   `json:"postId,omitempty"`
}

type groqSuggestion struct {
	Kind      string   `json:"kind"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
	Tags      []string `json:"tags"`
	Rationale string   `json:"rationale"`
}

var botRunMu sync.Mutex

func ensureBotUser(ctx context.Context, s *server) {
	avatar := strings.TrimRight(env("APP_URL", "http://localhost:4100"), "/") + "/icon.svg"
	email := botHandle + "@chelaa.tn"
	_, err := s.db.Exec(ctx, `
		insert into users (handle, name, email, first_name, last_name, password_hash, email_verified, priority_posting, is_bot, avatar_url)
		values ($1, 'Chelaa Bot', $2, 'Chelaa', 'Bot', '', true, true, true, $3)
		on conflict (handle) do update set
		  name = 'Chelaa Bot',
		  is_bot = true,
		  priority_posting = true,
		  email_verified = true,
		  avatar_url = excluded.avatar_url`, botHandle, email, avatar)
	if err != nil {
		log.Printf("ensure bot user: %v", err)
	}
}

func (s *server) startBotScheduler(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.maybeRunBot(ctx)
			}
		}
	}()
}

func (s *server) loadBotConfig(ctx context.Context) (botConfig, time.Time, error) {
	var cfg botConfig
	var lastRun *time.Time
	err := s.db.QueryRow(ctx, `
		select enabled, context, run_hour, timezone, last_run_at
		from bot_config where id = 1`).Scan(
		&cfg.Enabled, &cfg.Context, &cfg.RunHour, &cfg.Timezone, &lastRun)
	if err != nil {
		return cfg, time.Time{}, err
	}
	if lastRun != nil {
		t := lastRun.UTC().Format(time.RFC3339)
		cfg.LastRunAt = &t
		return cfg, *lastRun, nil
	}
	return cfg, time.Time{}, nil
}

func (s *server) maybeRunBot(ctx context.Context) {
	cfg, lastRun, err := s.loadBotConfig(ctx)
	if err != nil || !cfg.Enabled {
		return
	}
	if strings.TrimSpace(cfg.Context) == "" {
		return
	}
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		loc = time.FixedZone("UTC+1", 3600)
	}
	now := time.Now().In(loc)
	if now.Hour() != cfg.RunHour {
		return
	}
	if !lastRun.IsZero() && lastRun.In(loc).Format("2006-01-02") == now.Format("2006-01-02") {
		return
	}
	s.runBot(ctx)
}

func (s *server) runBot(ctx context.Context) error {
	if !botRunMu.TryLock() {
		return fmt.Errorf("bot run already in progress")
	}
	defer botRunMu.Unlock()

	cfg, _, err := s.loadBotConfig(ctx)
	if err != nil {
		return err
	}
	if strings.TrimSpace(cfg.Context) == "" {
		return fmt.Errorf("bot context is empty")
	}

	suggestions, err := s.fetchGroqSuggestions(ctx, cfg.Context)
	if err != nil {
		log.Printf("bot groq: %v", err)
		return err
	}

	for _, item := range suggestions {
		kind := item.Kind
		if kind != "question" && kind != "project" && kind != "post" {
			kind = "post"
		}
		title := strings.TrimSpace(item.Title)
		body := strings.TrimSpace(item.Body)
		if title == "" || body == "" {
			continue
		}
		if len(title) > 120 {
			title = string([]rune(title)[:120])
		}
		tags := normalizeTags(item.Tags)
		rationale := strings.TrimSpace(item.Rationale)
		if len([]rune(rationale)) > 500 {
			rationale = string([]rune(rationale)[:500])
		}
		_, err := s.db.Exec(ctx, `
			insert into bot_suggestions (kind, title, body, tags, rationale)
			values ($1, $2, $3, $4, $5)`,
			kind, title, body, tags, rationale)
		if err != nil {
			log.Printf("insert bot suggestion: %v", err)
		}
	}

	_, err = s.db.Exec(ctx, `update bot_config set last_run_at = now(), updated_at = now() where id = 1`)
	return err
}

func (s *server) fetchGroqSuggestions(ctx context.Context, contextPrompt string) ([]groqSuggestion, error) {
	key := strings.TrimSpace(os.Getenv("GROQ_API_KEY"))
	if key == "" {
		return nil, fmt.Errorf("GROQ_API_KEY is not set")
	}

	system := `You are Chelaa Bot, a curator for a Tunisian engineering community feed.
Return ONLY valid JSON (no markdown fences) with this shape:
{"suggestions":[{"kind":"post","title":"...","body":"...","tags":["tag1"],"rationale":"..."}]}
Rules:
- Suggest exactly 3 timely posts about news, launches, or discussions relevant today.
- kind must be "post", "question", or "project".
- title: max 120 chars, engaging, no clickbait.
- body: 2-4 short paragraphs, plain text, community tone.
- tags: 1-3 lowercase tags.
- rationale: one sentence on why this fits today.`

	user := fmt.Sprintf(`Today's date: %s
Topics and editorial direction from the admin:
%s`, time.Now().Format("Monday, 2006-01-02"), strings.TrimSpace(contextPrompt))

	payload := map[string]interface{}{
		"model": env("GROQ_MODEL", "llama-3.3-70b-versatile"),
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"temperature": 0.7,
		"max_tokens":  2500,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("groq %d: %s", res.StatusCode, string(raw))
	}

	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if len(out.Choices) == 0 {
		return nil, fmt.Errorf("groq returned no choices")
	}

	content := strings.TrimSpace(out.Choices[0].Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var parsed struct {
		Suggestions []groqSuggestion `json:"suggestions"`
	}
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return nil, fmt.Errorf("parse groq json: %w", err)
	}
	if len(parsed.Suggestions) == 0 {
		return nil, fmt.Errorf("groq returned no suggestions")
	}
	if len(parsed.Suggestions) > 3 {
		parsed.Suggestions = parsed.Suggestions[:3]
	}
	return parsed.Suggestions, nil
}

func (s *server) botUserID(ctx context.Context) (int64, error) {
	var id int64
	err := s.db.QueryRow(ctx, `select id from users where handle = $1`, botHandle).Scan(&id)
	return id, err
}

func (s *server) publishBotSuggestion(ctx context.Context, suggestionID int64, reviewerID int64) (int64, error) {
	var kind, title, body string
	var tags []string
	err := s.db.QueryRow(ctx, `
		select kind::text, title, body, tags
		from bot_suggestions where id = $1 and status = 'pending'`,
		suggestionID).Scan(&kind, &title, &body, &tags)
	if err != nil {
		return 0, err
	}

	botID, err := s.botUserID(ctx)
	if err != nil {
		return 0, err
	}

	blocks, bodyText := buildBlocks(nil, body)
	excerpt := excerptFrom(bodyText, title)

	var postID int64
	err = s.db.QueryRow(ctx, `
		insert into posts (kind, title, excerpt, blocks, tags, author_id, status)
		values ($1, $2, $3, $4, $5, $6, 'approved') returning id`,
		kind, title, excerpt, blocks, tags, botID).Scan(&postID)
	if err != nil {
		return 0, err
	}

	tag, err := s.db.Exec(ctx, `
		update bot_suggestions
		set status = 'accepted', post_id = $1, reviewed_by = $2, reviewed_at = now()
		where id = $3 and status = 'pending'`, postID, reviewerID, suggestionID)
	if err != nil {
		return 0, err
	}
	if tag.RowsAffected() == 0 {
		return 0, pgx.ErrNoRows
	}
	return postID, nil
}

// GET /api/admin/bot/config
func (s *server) getBotConfig(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	cfg, _, err := s.loadBotConfig(r.Context())
	if err != nil {
		log.Printf("bot config: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

// PUT /api/admin/bot/config
func (s *server) updateBotConfig(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	var in struct {
		Enabled  bool   `json:"enabled"`
		Context  string `json:"context"`
		RunHour  int    `json:"runHour"`
		Timezone string `json:"timezone"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	in.Context = strings.TrimSpace(in.Context)
	if len([]rune(in.Context)) > 2000 {
		writeJSON(w, 400, map[string]string{"error": "context must be 2000 characters or less"})
		return
	}
	if in.RunHour < 0 || in.RunHour > 23 {
		writeJSON(w, 400, map[string]string{"error": "runHour must be 0–23"})
		return
	}
	in.Timezone = strings.TrimSpace(in.Timezone)
	if in.Timezone == "" {
		in.Timezone = "Africa/Tunis"
	}
	if _, err := time.LoadLocation(in.Timezone); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid timezone"})
		return
	}

	_, err := s.db.Exec(r.Context(), `
		update bot_config set enabled = $1, context = $2, run_hour = $3, timezone = $4, updated_at = now()
		where id = 1`, in.Enabled, in.Context, in.RunHour, in.Timezone)
	if err != nil {
		log.Printf("update bot config: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	cfg, _, _ := s.loadBotConfig(r.Context())
	writeJSON(w, http.StatusOK, cfg)
}

// GET /api/admin/bot/suggestions
func (s *server) listBotSuggestions(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status == "" {
		status = "pending"
	}
	if status != "pending" && status != "accepted" && status != "rejected" {
		writeJSON(w, 400, map[string]string{"error": "invalid status"})
		return
	}

	rows, err := s.db.Query(r.Context(), `
		select id, kind::text, title, body, tags, rationale, status, post_id, created_at
		from bot_suggestions where status = $1
		order by created_at desc limit 50`, status)
	if err != nil {
		log.Printf("list bot suggestions: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	items := []botSuggestion{}
	for rows.Next() {
		var item botSuggestion
		var id int64
		var postID *int64
		var created time.Time
		if err := rows.Scan(&id, &item.Kind, &item.Title, &item.Body, &item.Tags, &item.Rationale, &item.Status, &postID, &created); err != nil {
			log.Printf("scan bot suggestion: %v", err)
			writeJSON(w, 500, map[string]string{"error": "internal"})
			return
		}
		item.ID = fmt.Sprint(id)
		item.Time = relTime(created)
		if postID != nil {
			item.PostID = fmt.Sprint(*postID)
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, items)
}

// POST /api/admin/bot/run — manual trigger for admins.
func (s *server) runBotNow(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	if err := s.runBot(r.Context()); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) reviewBotSuggestion(w http.ResponseWriter, r *http.Request, accept bool) {
	u := s.requireAdmin(w, r)
	if u == nil {
		return
	}
	id := r.PathValue("id")
	if accept {
		postID, err := s.publishBotSuggestion(r.Context(), parseID(id), u.ID)
		if err != nil {
			if err == pgx.ErrNoRows {
				writeJSON(w, 404, map[string]string{"error": "suggestion not found"})
				return
			}
			log.Printf("accept bot suggestion: %v", err)
			writeJSON(w, 500, map[string]string{"error": "internal"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "accepted", "postId": fmt.Sprint(postID)})
		return
	}
	cmd, err := s.db.Exec(r.Context(), `
		update bot_suggestions set status = 'rejected', reviewed_by = $1, reviewed_at = now()
		where id = $2 and status = 'pending'`, u.ID, parseID(id))
	if err != nil {
		log.Printf("reject bot suggestion: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, 404, map[string]string{"error": "suggestion not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

func (s *server) acceptBotSuggestion(w http.ResponseWriter, r *http.Request) {
	s.reviewBotSuggestion(w, r, true)
}

func (s *server) rejectBotSuggestion(w http.ResponseWriter, r *http.Request) {
	s.reviewBotSuggestion(w, r, false)
}

func parseID(s string) int64 {
	var id int64
	fmt.Sscanf(s, "%d", &id)
	return id
}

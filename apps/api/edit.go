package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

/*
 * Editing and deleting your own content.
 *
 * Authorship is checked in the SQL itself (`where id = $1 and author_id = $2`)
 * rather than in a separate read, so there's no window between the check and
 * the write. A row count of zero means "not yours or not there" — both answer
 * 404, which avoids confirming that someone else's post id exists.
 *
 * Reputation needs no adjustment on delete: leaderboardRows recomputes from
 * the domain tables, so removing a post removes its points automatically.
 * Every dependent row (votes, views, saves, replies, notifications) cascades
 * at the FK level.
 */

// PATCH /api/posts/{id} — edit title, body and tags.
func (s *server) updatePost(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	var in struct {
		Title  string   `json:"title"`
		Body   string   `json:"body"`
		Blocks []block  `json:"blocks"`
		Tags   []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" || len(in.Title) > 120 {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "title must be 1–120 characters"})
		return
	}
	if in.Tags == nil {
		in.Tags = []string{}
	}
	if len(in.Tags) > 3 {
		in.Tags = in.Tags[:3]
	}

	blocks, bodyText := buildBlocks(in.Blocks, in.Body)
	excerpt := excerptFrom(bodyText, in.Title)

	tag, err := s.db.Exec(r.Context(), `
		update posts set title = $3, excerpt = $4, blocks = $5, tags = $6,
		  edited_at = now()
		where id = $1 and author_id = $2`,
		r.PathValue("id"), u.ID, in.Title, excerpt, blocks, in.Tags)
	if err != nil {
		log.Printf("update post: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/posts/{id}
func (s *server) deletePost(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}
	tag, err := s.db.Exec(r.Context(),
		`delete from posts where id = $1 and author_id = $2`,
		r.PathValue("id"), u.ID)
	if err != nil {
		log.Printf("delete post: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// PATCH /api/replies/{id} — edit your own reply.
func (s *server) updateReply(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	var in struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	in.Text = strings.TrimSpace(in.Text)
	if in.Text == "" || len([]rune(in.Text)) > 5000 {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "reply must be 1–5000 characters"})
		return
	}

	tag, err := s.db.Exec(r.Context(), `
		update replies set body = $3, edited_at = now()
		where id = $1 and author_id = $2`,
		r.PathValue("id"), u.ID, in.Text)
	if err != nil {
		log.Printf("update reply: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/replies/{id}
func (s *server) deleteReply(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}
	id := r.PathValue("id")

	// An accepted answer carries the question's "solved" flag; clear it so a
	// question doesn't stay marked solved with no accepted answer left.
	var postID int64
	var accepted bool
	err := s.db.QueryRow(r.Context(), `
		delete from replies where id = $1 and author_id = $2
		returning post_id, accepted`, id, u.ID).Scan(&postID, &accepted)
	if err != nil {
		// No row deleted: not theirs, or gone.
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if accepted {
		if _, err := s.db.Exec(r.Context(),
			`update posts set solved = false where id = $1`, postID); err != nil {
			log.Printf("clear solved: %v", err)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

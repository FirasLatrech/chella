package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

func (s *server) requireUser(w http.ResponseWriter, r *http.Request) *user {
	u := s.currentUser(r)
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "sign in required"})
	}
	return u
}

// POST /api/posts — create a post/question/project.
func (s *server) createPost(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	// Posting is earned by introducing yourself: at least one profile detail
	// (bio, a link or a CV) must be filled in first. Enforced here so the
	// composer's client-side gate can't be bypassed.
	var hasDetails bool
	if err := s.db.QueryRow(r.Context(), `
		select bio <> '' or github <> '' or linkedin <> '' or website <> ''
		    or cv_url <> '' from users where id = $1`, u.ID).
		Scan(&hasDetails); err != nil {
		log.Printf("profile gate: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if !hasDetails {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "complete your profile (a bio, link or CV) before posting"})
		return
	}

	var in struct {
		Kind     string   `json:"kind"`
		Title    string   `json:"title"`
		Body     string   `json:"body"`
		Blocks   []block  `json:"blocks"`
		Tags     []string `json:"tags"`
		ImageURL string   `json:"imageUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Body = strings.TrimSpace(in.Body)
	if in.Kind != "question" && in.Kind != "project" && in.Kind != "post" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid kind"})
		return
	}
	if in.Title == "" || len(in.Title) > 120 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title must be 1–120 characters"})
		return
	}
	if in.Tags == nil {
		in.Tags = []string{}
	}
	if len(in.Tags) > 3 {
		in.Tags = in.Tags[:3]
	}

	// Rich blocks from the editor are whitelisted server-side; a plain body
	// still works and becomes a single paragraph.
	blocks, bodyText := buildBlocks(in.Blocks, in.Body)
	excerpt := excerptFrom(bodyText, in.Title)

	var imageURL *string
	if in.ImageURL != "" {
		if !s.validStoredImage(in.ImageURL) {
			writeJSON(w, http.StatusBadRequest,
				map[string]string{"error": "image must come from the upload endpoint"})
			return
		}
		imageURL = &in.ImageURL
	}

	var id int64
	err := s.db.QueryRow(r.Context(), `
		insert into posts (kind, title, excerpt, blocks, tags, author_id, image_url)
		values ($1, $2, $3, $4, $5, $6, $7) returning id`,
		in.Kind, in.Title, excerpt, blocks, in.Tags, u.ID, imageURL).Scan(&id)
	if err != nil {
		log.Printf("create post: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": fmt.Sprint(id)})
}

// POST /api/posts/{id}/replies — answer or comment.
func (s *server) createReply(w http.ResponseWriter, r *http.Request) {
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
	if in.Text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "reply is empty"})
		return
	}

	var (
		id       int64
		postID   int64
		authorID int64
	)
	err := s.db.QueryRow(r.Context(), `
		insert into replies (post_id, author_id, body)
		values ($1, $2, $3) returning id, post_id`,
		r.PathValue("id"), u.ID, in.Text).Scan(&id, &postID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "post not found"})
		return
	}
	if err := s.db.QueryRow(r.Context(),
		`select author_id from posts where id = $1`, postID).Scan(&authorID); err == nil {
		s.notify(r.Context(), authorID, u.ID, "reply", postID, &id)
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": fmt.Sprint(id)})
}

// POST /api/posts/{id}/vote — {direction: -1 | 0 | 1}; 0 retracts.
// posts.votes stays the seeded base; totals are base + sum(post_votes),
// so re-votes and retractions can never corrupt the aggregate.
func (s *server) votePost(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	var in struct {
		Direction int `json:"direction"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil ||
		in.Direction < -1 || in.Direction > 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "direction must be -1, 0 or 1"})
		return
	}
	postID := r.PathValue("id")

	var prev int
	s.db.QueryRow(r.Context(),
		`select direction from post_votes where user_id = $1 and post_id = $2`,
		u.ID, postID).Scan(&prev)

	var err error
	if in.Direction == 0 {
		_, err = s.db.Exec(r.Context(),
			`delete from post_votes where user_id = $1 and post_id = $2`, u.ID, postID)
	} else {
		_, err = s.db.Exec(r.Context(), `
			insert into post_votes (user_id, post_id, direction)
			values ($1, $2, $3)
			on conflict (user_id, post_id) do update set direction = $3`,
			u.ID, postID, in.Direction)
	}
	if err == nil && in.Direction == 1 && prev != 1 {
		var pid, authorID int64
		if s.db.QueryRow(r.Context(),
			`select id, author_id from posts where id = $1`, postID).
			Scan(&pid, &authorID) == nil {
			s.notify(r.Context(), authorID, u.ID, "vote", pid, nil)
		}
	}
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "post not found"})
		return
	}

	var votes int
	s.db.QueryRow(r.Context(), `
		select p.votes + coalesce((select sum(direction) from post_votes where post_id = p.id), 0)
		from posts p where p.id = $1`, postID).Scan(&votes)
	writeJSON(w, http.StatusOK, map[string]int{"votes": votes, "myVote": in.Direction})
}

// POST /api/replies/{id}/vote — {up: bool}; up-only, like the UI.
func (s *server) voteReply(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	var in struct {
		Up bool `json:"up"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	replyID := r.PathValue("id")

	var err error
	if in.Up {
		_, err = s.db.Exec(r.Context(), `
			insert into reply_votes (user_id, reply_id) values ($1, $2)
			on conflict do nothing`, u.ID, replyID)
	} else {
		_, err = s.db.Exec(r.Context(),
			`delete from reply_votes where user_id = $1 and reply_id = $2`, u.ID, replyID)
	}
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "reply not found"})
		return
	}

	var votes int
	s.db.QueryRow(r.Context(), `
		select r.votes + coalesce((select count(*) from reply_votes where reply_id = r.id), 0)
		from replies r where r.id = $1`, replyID).Scan(&votes)
	writeJSON(w, http.StatusOK, map[string]any{"votes": votes, "myVote": in.Up})
}

// POST /api/replies/{id}/accept — question author only. Accepting a different
// answer moves the mark; exactly one reply per post can be accepted.
func (s *server) acceptReply(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}
	replyID := r.PathValue("id")

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer tx.Rollback(r.Context())

	var (
		postID   int64
		authorID int64
		kind     string
	)
	err = tx.QueryRow(r.Context(), `
		select p.id, p.author_id, p.kind
		from replies rp join posts p on p.id = rp.post_id
		where rp.id = $1`, replyID).Scan(&postID, &authorID, &kind)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "reply not found"})
		return
	}
	if authorID != u.ID {
		writeJSON(w, http.StatusForbidden,
			map[string]string{"error": "only the question author can accept an answer"})
		return
	}
	if kind != "question" {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "only question answers can be accepted"})
		return
	}

	if _, err := tx.Exec(r.Context(),
		`update replies set accepted = (id = $1),
		       accepted_at = case when id = $1 then now() end
		where post_id = $2`, replyID, postID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if _, err := tx.Exec(r.Context(),
		`update posts set solved = true where id = $1`, postID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	var replyAuthor int64
	var rid int64
	fmt.Sscan(replyID, &rid)
	if s.db.QueryRow(r.Context(),
		`select author_id from replies where id = $1`, replyID).
		Scan(&replyAuthor) == nil {
		s.notify(r.Context(), replyAuthor, u.ID, "accept", postID, &rid)
	}
	w.WriteHeader(http.StatusNoContent)
}

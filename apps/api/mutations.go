package main

import (
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

// maxPostTags bounds a post's tag list. Tags are compared with lower()/unnest
// across the feed and the leaderboard, so both the count and each tag's length
// are a query-cost multiplier.
const maxPostTags = 3

// normalizeTags trims, bounds, drops blanks and de-duplicates case-insensitively,
// keeping the first occurrence's display case (tags render as typed, so "Go"
// must survive as "Go" — it just can't coexist with "go"). Duplicates are not
// merely untidy: the feed card keys its badges by tag name, so two equal tags
// on one post are a React duplicate-key error.
func normalizeTags(raw []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, t := range raw {
		t = strings.TrimSpace(t)
		if len([]rune(t)) > 30 {
			t = string([]rune(t)[:30])
		}
		key := strings.ToLower(t)
		if t == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, t)
		if len(out) == maxPostTags {
			break
		}
	}
	return out
}

// POST /api/posts — create a post/question/project.
func (s *server) createPost(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
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
	if err := decodeJSON(w, r, &in); err != nil {
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
	in.Tags = normalizeTags(in.Tags)

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

// POST /api/posts/{id}/replies — answer or comment. With `parentId` it is a
// nested reply to a top-level reply on the same post: ONE level only, so a
// reply to a child re-parents to the child's root, and the thread stays a
// conversation under one answer rather than a tree.
func (s *server) createReply(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	var in struct {
		Text     string `json:"text"`
		ParentID string `json:"parentId"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	in.Text = strings.TrimSpace(in.Text)
	// Same bound as updateReply — otherwise a reply can be created that its
	// own edit endpoint refuses to accept back.
	if in.Text == "" || len([]rune(in.Text)) > 5000 {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "reply must be 1–5000 characters"})
		return
	}

	var (
		parentID     *int64
		parentAuthor int64
	)
	if in.ParentID != "" {
		// Resolve to the root of the thread, and require it to live on this
		// post — a parent from another post would splice threads together.
		var root int64
		err := s.db.QueryRow(r.Context(), `
			select coalesce(rp.parent_id, rp.id),
			       (select author_id from replies where id = coalesce(rp.parent_id, rp.id))
			from replies rp
			where rp.id = $1 and rp.post_id = $2`,
			in.ParentID, r.PathValue("id")).Scan(&root, &parentAuthor)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "parent reply not found"})
			return
		}
		parentID = &root
	}

	var (
		id       int64
		postID   int64
		authorID int64
	)
	err := s.db.QueryRow(r.Context(), `
		insert into replies (post_id, author_id, body, parent_id)
		values ($1, $2, $3, $4) returning id, post_id`,
		r.PathValue("id"), u.ID, in.Text, parentID).Scan(&id, &postID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "post not found"})
		return
	}
	if parentID != nil {
		// A nested reply is a message to the thread's author, not the post's
		// (which would double-notify whenever they are the same person).
		s.notify(r.Context(), parentAuthor, u.ID, "thread", postID, &id)
	} else if err := s.db.QueryRow(r.Context(),
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
	if err := decodeJSON(w, r, &in); err != nil ||
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
	if err := decodeJSON(w, r, &in); err != nil {
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
		nested   bool
	)
	err = tx.QueryRow(r.Context(), `
		select p.id, p.author_id, p.kind, rp.parent_id is not null
		from replies rp join posts p on p.id = rp.post_id
		where rp.id = $1`, replyID).Scan(&postID, &authorID, &kind, &nested)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "reply not found"})
		return
	}
	if nested {
		// Only a top-level answer can be the accepted one; a comment inside a
		// thread is a follow-up, not an answer in its own right.
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "only top-level answers can be accepted"})
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

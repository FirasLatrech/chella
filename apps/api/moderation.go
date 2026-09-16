package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

func (s *server) requireAdmin(w http.ResponseWriter, r *http.Request) *user {
	u := s.requireUser(w, r)
	if u == nil {
		return nil
	}
	if !u.IsAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin access required"})
		return nil
	}
	return u
}

type pendingPost struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Kind    string `json:"kind"`
	Author  string `json:"author"`
	Excerpt string `json:"excerpt"`
	Time    string `json:"time"`
}

type priorityPoster struct {
	Handle  string `json:"handle"`
	Name    string `json:"name"`
	Avatar  string `json:"avatar,omitempty"`
	IsAdmin bool   `json:"isAdmin"`
}

// GET /api/admin/users/priority — shows every user who can publish directly.
func (s *server) listPriorityPosters(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	rows, err := s.db.Query(r.Context(), `
		select handle, name, avatar_url, is_admin
		from users
		where priority_posting = true
		order by is_admin desc, lower(name), lower(handle)`)
	if err != nil {
		log.Printf("priority posters: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()
	items := []priorityPoster{}
	for rows.Next() {
		var item priorityPoster
		if err := rows.Scan(&item.Handle, &item.Name, &item.Avatar, &item.IsAdmin); err != nil {
			log.Printf("scan priority poster: %v", err)
			writeJSON(w, 500, map[string]string{"error": "internal"})
			return
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, items)
}

// GET /api/admin/posts/pending — only admins can see unreviewed submissions.
func (s *server) listPendingPosts(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	rows, err := s.db.Query(r.Context(), `
		select p.id, p.title, p.kind, u.handle, p.excerpt, p.created_at
		from posts p join users u on u.id = p.author_id
		where p.status = 'pending' order by p.created_at asc limit 100`)
	if err != nil {
		log.Printf("pending posts: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()
	items := []pendingPost{}
	for rows.Next() {
		var item pendingPost
		var id int64
		var created time.Time
		if err := rows.Scan(&id, &item.Title, &item.Kind, &item.Author, &item.Excerpt, &created); err != nil {
			log.Printf("scan pending: %v", err)
			writeJSON(w, 500, map[string]string{"error": "internal"})
			return
		}
		item.ID, item.Time = fmt.Sprint(id), relTime(created)
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *server) reviewPost(w http.ResponseWriter, r *http.Request, status string) {
	u := s.requireAdmin(w, r)
	if u == nil {
		return
	}
	cmd, err := s.db.Exec(r.Context(), `update posts set status = $1, reviewed_at = now(), reviewed_by = $2 where id = $3 and status = 'pending'`, status, u.ID, r.PathValue("id"))
	if err != nil {
		log.Printf("review post: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pending post not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (s *server) approvePost(w http.ResponseWriter, r *http.Request) { s.reviewPost(w, r, "approved") }
func (s *server) rejectPost(w http.ResponseWriter, r *http.Request)  { s.reviewPost(w, r, "rejected") }

// POST /api/admin/users/{handle}/priority — grants or removes direct posting.
func (s *server) setPriorityPosting(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	var in struct {
		Enabled bool `json:"enabled"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	handle := strings.ToLower(strings.TrimSpace(r.PathValue("handle")))
	cmd, err := s.db.Exec(r.Context(), `update users set priority_posting = $1 where handle = $2`, in.Enabled, handle)
	if err != nil {
		log.Printf("priority posting: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, 404, map[string]string{"error": "user not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"priorityPosting": in.Enabled})
}

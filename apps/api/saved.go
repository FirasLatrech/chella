package main

import (
	"log"
	"net/http"
)

/*
 * Bookmarks. Saving is a private toggle — no notification, no points
 * (leaderboard.go deliberately knows nothing about saved_posts).
 */

// POST /api/posts/{id}/save — toggles the bookmark; returns {"saved": bool}.
func (s *server) savePost(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}
	id := r.PathValue("id")

	// Toggle: try to remove first; if nothing was there, insert.
	tag, err := s.db.Exec(r.Context(),
		`delete from saved_posts where user_id = $1 and post_id = $2`, u.ID, id)
	if err != nil {
		log.Printf("unsave: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if tag.RowsAffected() > 0 {
		writeJSON(w, http.StatusOK, map[string]bool{"saved": false})
		return
	}
	if _, err := s.db.Exec(r.Context(), `
		insert into saved_posts (user_id, post_id)
		select $1, id from posts where id = $2
		on conflict do nothing`, u.ID, id); err != nil {
		log.Printf("save: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"saved": true})
}

// GET /api/saved — the signed-in user's bookmarks, most recently saved first.
func (s *server) listSaved(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}
	rows, err := s.db.Query(r.Context(), listQueryBase+`
		join saved_posts sp on sp.post_id = p.id and sp.user_id = $1
		order by sp.created_at desc`, u.ID)
	if err != nil {
		log.Printf("list saved: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	items, err := scanFeedItems(rows)
	if err != nil {
		log.Printf("scan saved: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, items)
}

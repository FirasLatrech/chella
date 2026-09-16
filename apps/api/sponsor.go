package main

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
)

type sponsor struct {
	ID       string `json:"id"`
	Active   bool   `json:"active"`
	Name     string `json:"name"`
	Title    string `json:"title"`
	Href     string `json:"href"`
	ImageURL string `json:"imageUrl"`
}

func (s *server) scanSponsors(w http.ResponseWriter, r *http.Request, query string) ([]sponsor, bool) {
	rows, err := s.db.Query(r.Context(), query)
	if err != nil {
		log.Printf("list sponsors: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return nil, false
	}
	defer rows.Close()
	items := []sponsor{}
	for rows.Next() {
		var item sponsor
		var id int64
		if err := rows.Scan(&id, &item.Active, &item.Name, &item.Title, &item.Href, &item.ImageURL); err != nil {
			log.Printf("scan sponsor: %v", err)
			writeJSON(w, 500, map[string]string{"error": "internal"})
			return nil, false
		}
		item.ID = fmt.Sprint(id)
		items = append(items, item)
	}
	return items, true
}

func (s *server) listSponsors(w http.ResponseWriter, r *http.Request) {
	items, ok := s.scanSponsors(w, r, `select id, active, name, title, href, image_url from sponsors where active = true order by sort_order, id`)
	if ok {
		writeJSON(w, http.StatusOK, items)
	}
}

func (s *server) listAdminSponsors(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	items, ok := s.scanSponsors(w, r, `select id, active, name, title, href, image_url from sponsors order by sort_order, id`)
	if ok {
		writeJSON(w, http.StatusOK, items)
	}
}

func (s *server) validSponsorInput(w http.ResponseWriter, in *sponsor) bool {
	in.Name = strings.TrimSpace(in.Name)
	in.Title = strings.TrimSpace(in.Title)
	in.Href = strings.TrimSpace(in.Href)
	in.ImageURL = strings.TrimSpace(in.ImageURL)
	if in.Name == "" || in.Title == "" || in.Href == "" {
		writeJSON(w, 400, map[string]string{"error": "name, title and link are required"})
		return false
	}
	if len(in.Name) > 60 || len(in.Title) > 120 {
		writeJSON(w, 400, map[string]string{"error": "sponsor text is too long"})
		return false
	}
	parsed, err := url.ParseRequestURI(in.Href)
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
		writeJSON(w, 400, map[string]string{"error": "link must be a full http or https URL"})
		return false
	}
	localArtwork := strings.HasPrefix(in.ImageURL, "/images/") && !strings.Contains(in.ImageURL, "..")
	if in.ImageURL != "" && !localArtwork && !s.validStoredImage(in.ImageURL) {
		writeJSON(w, 400, map[string]string{"error": "image must come from the upload endpoint"})
		return false
	}
	return true
}

func (s *server) createSponsor(w http.ResponseWriter, r *http.Request) {
	u := s.requireAdmin(w, r)
	if u == nil {
		return
	}
	var in sponsor
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	if !s.validSponsorInput(w, &in) {
		return
	}
	var id int64
	err := s.db.QueryRow(r.Context(), `
		insert into sponsors (active, name, title, href, image_url, sort_order, updated_by)
		values ($1, $2, $3, $4, $5, coalesce((select max(sort_order) + 10 from sponsors), 10), $6)
		returning id`, in.Active, in.Name, in.Title, in.Href, in.ImageURL, u.ID).Scan(&id)
	if err != nil {
		log.Printf("create sponsor: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	in.ID = fmt.Sprint(id)
	writeJSON(w, http.StatusCreated, in)
}

func (s *server) updateSponsorByID(w http.ResponseWriter, r *http.Request) {
	u := s.requireAdmin(w, r)
	if u == nil {
		return
	}
	var in sponsor
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	if !s.validSponsorInput(w, &in) {
		return
	}
	id := r.PathValue("id")
	cmd, err := s.db.Exec(r.Context(), `update sponsors set active=$1, name=$2, title=$3, href=$4, image_url=$5, updated_at=now(), updated_by=$6 where id=$7`, in.Active, in.Name, in.Title, in.Href, in.ImageURL, u.ID, id)
	if err != nil {
		log.Printf("update sponsor: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, 404, map[string]string{"error": "sponsor not found"})
		return
	}
	in.ID = id
	writeJSON(w, http.StatusOK, in)
}

func (s *server) deleteSponsor(w http.ResponseWriter, r *http.Request) {
	if s.requireAdmin(w, r) == nil {
		return
	}
	cmd, err := s.db.Exec(r.Context(), `delete from sponsors where id=$1`, r.PathValue("id"))
	if err != nil {
		log.Printf("delete sponsor: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, 404, map[string]string{"error": "sponsor not found"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Compatibility for older web deployments during a rolling release.
func (s *server) getSponsor(w http.ResponseWriter, r *http.Request) {
	items, ok := s.scanSponsors(w, r, `select id, active, name, title, href, image_url from sponsors where active = true order by sort_order, id limit 1`)
	if !ok {
		return
	}
	if len(items) == 0 {
		writeJSON(w, http.StatusOK, sponsor{})
		return
	}
	writeJSON(w, http.StatusOK, items[0])
}

func (s *server) updateSponsor(w http.ResponseWriter, r *http.Request) {
	u := s.requireAdmin(w, r)
	if u == nil {
		return
	}
	var in sponsor
	if err := decodeJSON(w, r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	if !s.validSponsorInput(w, &in) {
		return
	}
	var id int64
	if err := s.db.QueryRow(r.Context(), `select id from sponsors order by sort_order, id limit 1`).Scan(&id); err != nil {
		writeJSON(w, 404, map[string]string{"error": "sponsor not found"})
		return
	}
	in.ID = fmt.Sprint(id)
	if _, err := s.db.Exec(r.Context(), `update sponsors set active=$1, name=$2, title=$3, href=$4, image_url=$5, updated_at=now(), updated_by=$6 where id=$7`, in.Active, in.Name, in.Title, in.Href, in.ImageURL, u.ID, id); err != nil {
		log.Printf("update legacy sponsor: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, in)
}

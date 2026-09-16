package main

import (
	"log"
	"net/http"
	"net/url"
	"strings"
)

type sponsor struct {
	Active   bool   `json:"active"`
	Name     string `json:"name"`
	Title    string `json:"title"`
	Href     string `json:"href"`
	ImageURL string `json:"imageUrl"`
}

func (s *server) getSponsor(w http.ResponseWriter, r *http.Request) {
	var out sponsor
	err := s.db.QueryRow(r.Context(), `select active, name, title, href, image_url from site_sponsor where id = true`).Scan(&out.Active, &out.Name, &out.Title, &out.Href, &out.ImageURL)
	if err != nil {
		log.Printf("get sponsor: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, out)
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
	in.Name, in.Title, in.Href, in.ImageURL = strings.TrimSpace(in.Name), strings.TrimSpace(in.Title), strings.TrimSpace(in.Href), strings.TrimSpace(in.ImageURL)
	if in.Active && (in.Name == "" || in.Title == "" || in.Href == "") {
		writeJSON(w, 400, map[string]string{"error": "name, title and link are required"})
		return
	}
	if len(in.Name) > 60 || len(in.Title) > 120 {
		writeJSON(w, 400, map[string]string{"error": "sponsor text is too long"})
		return
	}
	if in.Href != "" {
		parsed, err := url.ParseRequestURI(in.Href)
		if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
			writeJSON(w, 400, map[string]string{"error": "link must be a full http or https URL"})
			return
		}
	}
	if in.ImageURL != "" && !s.validStoredImage(in.ImageURL) {
		writeJSON(w, 400, map[string]string{"error": "image must come from the upload endpoint"})
		return
	}
	if _, err := s.db.Exec(r.Context(), `update site_sponsor set active=$1, name=$2, title=$3, href=$4, image_url=$5, updated_at=now(), updated_by=$6 where id=true`, in.Active, in.Name, in.Title, in.Href, in.ImageURL, u.ID); err != nil {
		log.Printf("update sponsor: %v", err)
		writeJSON(w, 500, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, in)
}

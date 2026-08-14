package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strings"
)

/*
 * Editable profile details (bio, links, CV) and the contributions graph.
 * The CV rides the same uploads endpoint as post images (PDF allowed there,
 * validated here to be one of our own stored URLs).
 */

type profileInput struct {
	Bio      string `json:"bio"`
	Github   string `json:"github"`
	Linkedin string `json:"linkedin"`
	Website  string `json:"website"`
	CvURL    string `json:"cvUrl"`
}

// normalizeLink cleans a user-pasted link: trims, prepends https:// when the
// scheme is missing, and rejects anything that isn't a plain http(s) URL.
func normalizeLink(raw string, hosts ...string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", true
	}
	if len(raw) > 300 {
		return "", false
	}
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return "", false
	}
	if len(hosts) > 0 {
		host := strings.TrimPrefix(strings.ToLower(u.Host), "www.")
		ok := false
		for _, h := range hosts {
			if host == h {
				ok = true
				break
			}
		}
		if !ok {
			return "", false
		}
	}
	return u.String(), true
}

// PUT /api/me/profile
func (s *server) updateProfile(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	var in profileInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad json"})
		return
	}

	in.Bio = strings.TrimSpace(in.Bio)
	if len(in.Bio) > 500 {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "bio must be 500 characters or less"})
		return
	}
	github, ok := normalizeLink(in.Github, "github.com")
	if !ok {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "the GitHub link must be a github.com URL"})
		return
	}
	linkedin, ok := normalizeLink(in.Linkedin, "linkedin.com")
	if !ok {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "the LinkedIn link must be a linkedin.com URL"})
		return
	}
	website, ok := normalizeLink(in.Website)
	if !ok {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "the website must be a valid URL"})
		return
	}
	// The CV must be a file our own uploader handed out — never an arbitrary
	// external URL.
	if in.CvURL != "" && !s.validStoredFile(in.CvURL) {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "upload the CV first, then save"})
		return
	}

	_, err := s.db.Exec(r.Context(), `
		update users set bio = $1, github = $2, linkedin = $3, website = $4,
		  cv_url = $5 where id = $6`,
		in.Bio, github, linkedin, website, in.CvURL, u.ID)
	if err != nil {
		log.Printf("update profile: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, profileInput{
		Bio: in.Bio, Github: github, Linkedin: linkedin,
		Website: website, CvURL: in.CvURL,
	})
}

// GET /api/users/{handle}/activity — GitHub-style daily contribution counts
// (posts + replies + votes cast) over the last year, keyed YYYY-MM-DD (UTC).
func (s *server) userActivity(w http.ResponseWriter, r *http.Request) {
	var userID int64
	err := s.db.QueryRow(r.Context(),
		`select id from users where handle = $1`, r.PathValue("handle")).Scan(&userID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "no such user"})
		return
	}

	rows, err := s.db.Query(r.Context(), `
		select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD'),
		       count(*)::int
		from (
			select created_at from posts where author_id = $1
			union all select created_at from replies where author_id = $1
			union all select created_at from post_votes where user_id = $1
			union all select created_at from reply_votes where user_id = $1
		) a
		where created_at > now() - interval '370 days'
		group by 1`, userID)
	if err != nil {
		log.Printf("user activity: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	days := map[string]int{}
	total := 0
	for rows.Next() {
		var (
			day string
			n   int
		)
		if err := rows.Scan(&day, &n); err != nil {
			log.Printf("scan activity: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		days[day] = n
		total += n
	}
	writeJSON(w, http.StatusOK, map[string]any{"days": days, "total": total})
}

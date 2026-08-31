package main

import (
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
	Avatar   string `json:"avatar"`
	/* Declared topic interests, driving the "For you" suggestions. */
	Interests []string `json:"interests"`
	/* Pointer so an omitted field leaves the setting untouched. */
	EmailNotifications *bool `json:"emailNotifications,omitempty"`
}

// maxInterests caps the picker. Interests rank suggestions; past a handful
// they stop discriminating and every post "matches".
const maxInterests = 10

// normalizeInterests lowercases, trims, drops blanks and de-duplicates. Tags
// group case-insensitively everywhere else, so "Go" and "go" must collapse to
// one interest here too.
func normalizeInterests(raw []string) ([]string, bool) {
	seen := map[string]bool{}
	out := []string{}
	for _, t := range raw {
		t = strings.ToLower(strings.TrimSpace(t))
		if t == "" || seen[t] {
			continue
		}
		if len(t) > 40 {
			return nil, false
		}
		seen[t] = true
		out = append(out, t)
	}
	if len(out) > maxInterests {
		return nil, false
	}
	return out, true
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
	if err := decodeJSON(w, r, &in); err != nil {
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
	// Same for the avatar, and it must be an image (not a stored PDF).
	if in.Avatar != "" && !s.validStoredImage(in.Avatar) {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "upload the avatar first, then save"})
		return
	}

	interests, ok := normalizeInterests(in.Interests)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "pick up to 10 interests, each 40 characters or less"})
		return
	}

	_, err := s.db.Exec(r.Context(), `
		update users set bio = $1, github = $2, linkedin = $3, website = $4,
		  cv_url = $5, avatar_url = $6,
		  email_notifications = coalesce($7, email_notifications),
		  interests = $8
		where id = $9`,
		in.Bio, github, linkedin, website, in.CvURL, in.Avatar,
		in.EmailNotifications, interests, u.ID)
	if err != nil {
		log.Printf("update profile: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, profileInput{
		Bio: in.Bio, Github: github, Linkedin: linkedin,
		Website: website, CvURL: in.CvURL, Avatar: in.Avatar,
		Interests:          interests,
		EmailNotifications: in.EmailNotifications,
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

package main

import (
	"log"
	"net/http"
	"sort"
	"time"
)

/*
 * Profile and directory endpoints. All reputation numbers come from
 * leaderboardRows (leaderboard.go) — the single formula implementation.
 * Only activity counts (posts/answers/accepted) are computed here.
 */

type tagRankItem struct {
	Tag  string `json:"tag"`
	Rank int    `json:"rank"`
}

type profile struct {
	Handle     string        `json:"handle"`
	Name       string        `json:"name"`
	Joined     string        `json:"joined"`
	Posts      int           `json:"posts"`
	Answers    int           `json:"answers"`
	Accepted   int           `json:"accepted"`
	Reputation int           `json:"reputation"`
	Tags       []string      `json:"tags"`
	Weekly     int           `json:"weekly"`
	TagRanks   []tagRankItem `json:"tagRanks,omitempty"`
	Bio        string        `json:"bio"`
	Github     string        `json:"github"`
	Linkedin   string        `json:"linkedin"`
	Website    string        `json:"website"`
	CvURL      string        `json:"cvUrl"`
	Badges     []badge       `json:"badges"`
}

const profileCountsQuery = `
	select u.id, u.handle, u.name, u.created_at,
	  u.bio, u.github, u.linkedin, u.website, u.cv_url,
	  (select count(*) from posts p where p.author_id = u.id),
	  (select count(*) from replies r where r.author_id = u.id),
	  (select count(*) from replies r where r.author_id = u.id and r.accepted)
	from users u where u.handle = $1`

// GET /api/users/{handle}
func (s *server) getProfile(w http.ResponseWriter, r *http.Request) {
	var (
		p      profile
		userID int64
		joined time.Time
	)
	err := s.db.QueryRow(r.Context(), profileCountsQuery, r.PathValue("handle")).
		Scan(&userID, &p.Handle, &p.Name, &joined,
			&p.Bio, &p.Github, &p.Linkedin, &p.Website, &p.CvURL,
			&p.Posts, &p.Answers, &p.Accepted)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "no such user"})
		return
	}
	p.Joined = joined.Format("Jan 2006")

	all, err := s.leaderboardRows(r.Context(), nil, "")
	if err != nil {
		log.Printf("profile reputation: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	week, _ := s.leaderboardRows(r.Context(), periodSince("week"), "")
	for _, b := range all {
		if b.UserID == userID {
			p.Reputation = b.Points
		}
	}
	for _, b := range week {
		if b.UserID == userID {
			p.Weekly = b.Points
		}
	}

	tags, err := s.userTopTags(r.Context())
	if err == nil {
		p.Tags = tags[userID]
	}
	if p.Tags == nil {
		p.Tags = []string{}
	}
	// "#4 React" — rank on each of the user's top tags' all-time boards.
	for _, tag := range p.Tags {
		if rank := s.tagRank(r.Context(), userID, tag); rank > 0 {
			p.TagRanks = append(p.TagRanks, tagRankItem{Tag: tag, Rank: rank})
		}
	}

	// Badges are derived on read (see badges.go) — nothing stored, nothing
	// to backfill, and deleting content correctly revokes them.
	if st, err := s.badgeStats(r.Context(), userID); err == nil {
		p.Badges = badgesFor(st)
	} else {
		log.Printf("badges: %v", err)
		p.Badges = []badge{}
	}

	writeJSON(w, http.StatusOK, p)
}

// GET /api/users/{handle}/posts — their entries, newest first.
func (s *server) listUserPosts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		listQueryBase+` where u.handle = $2 order by p.created_at desc`,
		s.meID(r), r.PathValue("handle"))
	if err != nil {
		log.Printf("list user posts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	items, err := scanFeedItems(rows)
	if err != nil {
		log.Printf("scan user posts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// GET /api/users — the People directory, most reputation first.
func (s *server) listUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		select u.id, u.handle, u.name, u.created_at,
		  (select count(*) from posts p where p.author_id = u.id),
		  (select count(*) from replies rp where rp.author_id = u.id),
		  (select count(*) from replies rp where rp.author_id = u.id and rp.accepted)
		from users u`)
	if err != nil {
		log.Printf("list users: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	type userRow struct {
		p  profile
		id int64
	}
	people := []userRow{}
	for rows.Next() {
		var (
			ur     userRow
			joined time.Time
		)
		if err := rows.Scan(&ur.id, &ur.p.Handle, &ur.p.Name, &joined,
			&ur.p.Posts, &ur.p.Answers, &ur.p.Accepted); err != nil {
			log.Printf("scan user: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		ur.p.Joined = joined.Format("Jan 2006")
		people = append(people, ur)
	}

	all, err := s.leaderboardRows(r.Context(), nil, "")
	if err != nil {
		log.Printf("users reputation: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	week, _ := s.leaderboardRows(r.Context(), periodSince("week"), "")
	tags, _ := s.userTopTags(r.Context())

	totals := map[int64]int{}
	for _, b := range all {
		totals[b.UserID] = b.Points
	}
	weekly := map[int64]int{}
	for _, b := range week {
		weekly[b.UserID] = b.Points
	}

	out := []profile{}
	for _, ur := range people {
		ur.p.Reputation = totals[ur.id]
		ur.p.Weekly = weekly[ur.id]
		ur.p.Tags = tags[ur.id]
		if ur.p.Tags == nil {
			ur.p.Tags = []string{}
		}
		out = append(out, ur.p)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Reputation > out[j].Reputation
	})
	writeJSON(w, http.StatusOK, out)
}

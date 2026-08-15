package main

import (
	"log"
	"net/http"
	"strings"
)

/*
 * Universal search: posts, people and tags in one response.
 *
 * Each section is capped small — this backs a jump-to palette, not a results
 * page. Ranking inside each section is by relevance proxy: prefix matches
 * before substring ones, then by the thing that makes a result useful
 * (votes for posts, reputation for people, usage for tags).
 */

type searchPerson struct {
	Handle     string   `json:"handle"`
	Name       string   `json:"name"`
	Avatar     string   `json:"avatar,omitempty"`
	Tags       []string `json:"tags"`
	Reputation int      `json:"reputation"`
}

type searchTag struct {
	Name  string `json:"name"`
	Posts int    `json:"posts"`
}

type searchResults struct {
	Posts  []feedItem     `json:"posts"`
	People []searchPerson `json:"people"`
	Tags   []searchTag    `json:"tags"`
}

// GET /api/search?q=…
func (s *server) search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	out := searchResults{Posts: []feedItem{}, People: []searchPerson{}, Tags: []searchTag{}}
	if q == "" {
		writeJSON(w, http.StatusOK, out)
		return
	}
	like := "%" + q + "%"
	prefix := q + "%"
	meID := s.meID(r)

	// Posts — title matches rank above body matches.
	rows, err := s.db.Query(r.Context(), listQueryBase+`
		where p.title ilike $2 or p.excerpt ilike $2
		order by (case when p.title ilike $3 then 0
		               when p.title ilike $2 then 1 else 2 end),
		         p.created_at desc
		limit 6`, meID, like, prefix)
	if err != nil {
		log.Printf("search posts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if out.Posts, err = scanFeedItems(rows); err != nil {
		log.Printf("scan search posts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	// People — handle or display name.
	peopleRows, err := s.db.Query(r.Context(), `
		select u.id, u.handle, u.name, u.avatar_url
		from users u
		where u.handle ilike $1 or u.name ilike $1
		order by (case when u.handle ilike $2 or u.name ilike $2 then 0 else 1 end),
		         u.handle
		limit 5`, like, prefix)
	if err != nil {
		log.Printf("search people: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	type person struct {
		id     int64
		handle string
		name   string
		avatar string
	}
	found := []person{}
	for peopleRows.Next() {
		var p person
		if err := peopleRows.Scan(&p.id, &p.handle, &p.name, &p.avatar); err != nil {
			peopleRows.Close()
			log.Printf("scan search people: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		found = append(found, p)
	}
	peopleRows.Close()

	// Reputation and tags come from the single formula, as everywhere else.
	if len(found) > 0 {
		totals := map[int64]int{}
		if board, err := s.leaderboardRows(r.Context(), nil, ""); err == nil {
			for _, b := range board {
				totals[b.UserID] = b.Points
			}
		}
		tags, _ := s.userTopTags(r.Context())
		for _, p := range found {
			t := tags[p.id]
			if t == nil {
				t = []string{}
			}
			out.People = append(out.People, searchPerson{
				Handle: p.handle, Name: p.name, Avatar: p.avatar, Tags: t,
				Reputation: totals[p.id],
			})
		}
	}

	// Tags — grouped case-insensitively so "Go" and "go" are one result;
	// the most-used spelling wins as the display form.
	tagRows, err := s.db.Query(r.Context(), `
		select (array_agg(t order by c desc, t))[1] as name, sum(c)::int as total
		from (
			select t, count(*)::int c
			from posts p, unnest(p.tags) t
			where t ilike $1
			group by t
		) x
		group by lower(t)
		order by (case when lower((array_agg(t order by c desc, t))[1]) like lower($2)
		          then 0 else 1 end), total desc, name
		limit 6`, like, prefix)
	if err != nil {
		log.Printf("search tags: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer tagRows.Close()
	for tagRows.Next() {
		var t searchTag
		if err := tagRows.Scan(&t.Name, &t.Posts); err != nil {
			log.Printf("scan search tags: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		out.Tags = append(out.Tags, t)
	}

	writeJSON(w, http.StatusOK, out)
}

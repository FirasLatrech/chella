package main

import (
	"log"
	"math"
	"net/http"
)

/*
 * Data for the feed's right rail. "This week" is computed from actual
 * activity timestamps — the same reputation point values as profiles
 * (post +5, reply +5, accepted +20, votes received +3), restricted to the
 * last seven days. Seeded base votes carry no timestamps, so weekly deltas
 * count live vote rows only.
 */

type topContributor struct {
	Handle     string `json:"handle"`
	Name       string `json:"name"`
	Reputation int    `json:"reputation"`
	Weekly     int    `json:"weekly"`
}

// GET /api/rails/top-week — top 3 by points earned this week, via the single
// formula in leaderboard.go.
func (s *server) topWeek(w http.ResponseWriter, r *http.Request) {
	week, err := s.leaderboardRows(r.Context(), periodSince("week"), "")
	if err != nil {
		log.Printf("top week: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	all, err := s.leaderboardRows(r.Context(), nil, "")
	if err != nil {
		log.Printf("top week totals: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	totals := map[int64]int{}
	for _, b := range all {
		totals[b.UserID] = b.Points
	}

	out := []topContributor{}
	for _, b := range week {
		if b.Points <= 0 {
			continue
		}
		out = append(out, topContributor{
			Handle: b.Handle, Name: b.Name,
			Reputation: totals[b.UserID], Weekly: b.Points,
		})
		if len(out) == 3 {
			break
		}
	}
	writeJSON(w, http.StatusOK, out)
}

type trendingTag struct {
	Name   string `json:"name"`
	Posts  int    `json:"posts"`
	Growth int    `json:"growth"`
	// Posts in the week before — 0 means the tag is new this week, which the
	// UI shows instead of a meaningless percentage.
	Prev int `json:"prev"`
}

// GET /api/rails/trending-tags — tags by post volume this week, with growth
// against the week before.
func (s *server) trendingTags(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		with cur as (
			select lower(t) as tag, count(*) as c
			from posts, unnest(tags) as t
			where created_at > now() - interval '7 days'
			group by 1
		), prev as (
			select lower(t) as tag, count(*) as c
			from posts, unnest(tags) as t
			where created_at <= now() - interval '7 days'
			  and created_at > now() - interval '14 days'
			group by 1
		)
		select cur.tag, cur.c, coalesce(prev.c, 0)
		from cur left join prev using (tag)
		order by cur.c desc, cur.tag asc
		limit 5`)
	if err != nil {
		log.Printf("trending tags: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	out := []trendingTag{}
	for rows.Next() {
		var t trendingTag
		if err := rows.Scan(&t.Name, &t.Posts, &t.Prev); err != nil {
			log.Printf("scan trending: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		t.Growth = int(math.Round(float64(t.Posts-t.Prev) / math.Max(float64(t.Prev), 1) * 100))
		out = append(out, t)
	}
	writeJSON(w, http.StatusOK, out)
}

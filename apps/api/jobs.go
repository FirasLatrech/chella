package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

/*
 * Jobs — the payoff for reputation.
 *
 * Listings are ranked for the signed-in user rather than shown in one flat
 * order: roles whose skills overlap the tags you actually contribute in come
 * first, and each carries the rank you hold on those tags. That's the whole
 * product thesis in one endpoint — contributions decide what you see, and
 * what employers see about you.
 *
 * Reputation gates nothing. A role below your reputation still lists; it just
 * doesn't claim you're a match. Hiding opportunities from newcomers would
 * invert the point of the ladder.
 */

type jobMatch struct {
	Tag  string `json:"tag"`
	Rank int    `json:"rank"`
}

type jobItem struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Company     string     `json:"company"`
	Location    string     `json:"location"`
	Kind        string     `json:"kind"`
	Arrangement string     `json:"arrangement"`
	SalaryMin   *int       `json:"salaryMin,omitempty"`
	SalaryMax   *int       `json:"salaryMax,omitempty"`
	Currency    string     `json:"currency"`
	Tags        []string   `json:"tags"`
	Description string     `json:"description"`
	ApplyURL    string     `json:"applyUrl"`
	MinRep      int        `json:"minReputation"`
	Time        string     `json:"time"`
	/* Per-request, for the signed-in user. */
	MatchedTags []jobMatch `json:"matchedTags"`
	Qualified   bool       `json:"qualified"`
}

// GET /api/jobs — listings, best match for the requesting user first.
func (s *server) listJobs(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		select id, title, company, location, kind, arrangement,
		       salary_min, salary_max, currency, tags, description, apply_url,
		       min_reputation, created_at
		from jobs where not closed
		order by created_at desc`)
	if err != nil {
		log.Printf("list jobs: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	jobs := []jobItem{}
	for rows.Next() {
		var (
			j         jobItem
			id        int64
			createdAt time.Time
		)
		if err := rows.Scan(&id, &j.Title, &j.Company, &j.Location, &j.Kind,
			&j.Arrangement, &j.SalaryMin, &j.SalaryMax, &j.Currency, &j.Tags,
			&j.Description, &j.ApplyURL, &j.MinRep, &createdAt); err != nil {
			log.Printf("scan job: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		j.ID = fmt.Sprint(id)
		j.Time = relTime(createdAt)
		j.MatchedTags = []jobMatch{}
		jobs = append(jobs, j)
	}
	if err := rows.Err(); err != nil {
		log.Printf("iterate jobs: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	// Signed-in: annotate with the tags they rank on, and sort matches first.
	if meID := s.meID(r); meID != 0 {
		s.annotateJobs(r, meID, jobs)
	}

	writeJSON(w, http.StatusOK, jobs)
}

// annotateJobs fills MatchedTags/Qualified and reorders so the best fits lead.
func (s *server) annotateJobs(r *http.Request, meID int64, jobs []jobItem) {
	tags, err := s.userTopTags(r.Context())
	if err != nil {
		log.Printf("job tags: %v", err)
		return
	}
	mine := tags[meID]
	if len(mine) == 0 {
		return
	}

	// Reputation comes from the single formula, like everywhere else.
	reputation := 0
	if board, err := s.leaderboardRows(r.Context(), nil, ""); err == nil {
		for _, b := range board {
			if b.UserID == meID {
				reputation = b.Points
				break
			}
		}
	}

	// Rank on each of the user's tags — the "#2 Go" they carry into a role.
	ranks := map[string]int{}
	for _, tag := range mine {
		if rank := s.tagRank(r.Context(), meID, tag); rank > 0 {
			ranks[strings.ToLower(tag)] = rank
		}
	}

	for i := range jobs {
		matches := []jobMatch{}
		for _, tag := range jobs[i].Tags {
			if rank, ok := ranks[strings.ToLower(tag)]; ok {
				matches = append(matches, jobMatch{Tag: tag, Rank: rank})
			}
		}
		jobs[i].MatchedTags = matches
		jobs[i].Qualified = len(matches) > 0 && reputation >= jobs[i].MinRep
	}

	// Stable partition: matched roles first, each group keeping newest-first.
	matched := make([]jobItem, 0, len(jobs))
	rest := make([]jobItem, 0, len(jobs))
	for _, j := range jobs {
		if len(j.MatchedTags) > 0 {
			matched = append(matched, j)
		} else {
			rest = append(rest, j)
		}
	}
	copy(jobs, append(matched, rest...))
}

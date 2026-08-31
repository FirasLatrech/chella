package main

import (
	"context"
	"log"
	"net/http"
	"strings"
)

/*
 * "For you" — posts suggested from the reader's declared interests.
 *
 * Interests are EXPLICIT (users.interests, set in the profile modal) with a
 * derived fallback: someone who hasn't picked any yet gets userTopTags, the
 * same two-tag affinity the leaderboard and jobs board already use. Without
 * that fallback the feature would be blank for exactly the people who need it
 * most — new users, who have neither picked interests nor posted enough to
 * derive them.
 *
 * This is an ADDITIVE module, not a re-ranked feed. The main feed's cursor
 * keys on (created_at, id); relevance ordering isn't monotonic, so paging it
 * would skip and repeat rows. Suggestions are a small unpaged read instead.
 *
 * Interests are a signal, never a filter — the same rule the jobs board
 * follows. Nothing is hidden from the feed because it didn't match.
 */

const suggestionLimit = 6

// readerInterests returns the tags to suggest against: the user's declared
// interests, or their most-used tags when they haven't declared any.
func (s *server) readerInterests(ctx context.Context, userID int64) ([]string, error) {
	var declared []string
	err := s.db.QueryRow(ctx,
		`select interests from users where id = $1`, userID).Scan(&declared)
	if err != nil {
		return nil, err
	}
	if len(declared) > 0 {
		return declared, nil
	}

	// Fallback: what they actually post about.
	tags, err := s.userTopTags(ctx)
	if err != nil {
		return nil, err
	}
	return tags[userID], nil
}

// GET /api/rails/for-you — recent posts matching the reader's interests.
//
// Ordered by how many interests a post hits, then recency, so a post tagged
// both "go" and "design" leads over one that only matches "go". The reader's
// own posts are excluded — suggesting someone their own writing reads as a
// bug, not a recommendation.
func (s *server) forYou(w http.ResponseWriter, r *http.Request) {
	me := s.requireUser(w, r)
	if me == nil {
		return
	}

	interests, err := s.readerInterests(r.Context(), me.ID)
	if err != nil {
		log.Printf("for you interests: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	if len(interests) == 0 {
		// No interests and nothing to derive from — the UI prompts the user to
		// pick some rather than showing an arbitrary list.
		writeJSON(w, http.StatusOK, forYouResponse{Interests: []string{}, Items: []feedItem{}})
		return
	}

	lowered := make([]string, 0, len(interests))
	for _, t := range interests {
		lowered = append(lowered, strings.ToLower(t))
	}

	// $1 is the reader (drives myVote/saved/mine in listQueryBase), $2 the
	// interest list, $3 the row cap.
	rows, err := s.db.Query(r.Context(), listQueryBase+`
		where p.author_id <> $1
		  and exists (
		    select 1 from unnest(p.tags) t where lower(t) = any($2)
		  )
		order by (
		  select count(distinct lower(t))
		  from unnest(p.tags) t where lower(t) = any($2)
		) desc, p.created_at desc, p.id desc
		limit $3`, me.ID, lowered, suggestionLimit)
	if err != nil {
		log.Printf("for you: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	items, err := scanFeedItems(rows)
	if err != nil {
		log.Printf("scan for you: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	// Echo the interests back so the UI can say WHY these were picked —
	// a suggestion box with no stated reason reads as noise.
	writeJSON(w, http.StatusOK, forYouResponse{Interests: lowered, Items: items})
}

type forYouResponse struct {
	Interests []string   `json:"interests"`
	Items     []feedItem `json:"items"`
}

// GET /api/tags — distinct tags across all posts, most-used first. Backs the
// interest picker so users choose real tags instead of inventing new ones.
func (s *server) listTags(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		select lower(t) as tag, count(*)::int as c
		from posts, unnest(tags) as t
		group by 1
		order by c desc, tag asc
		limit 100`)
	if err != nil {
		log.Printf("list tags: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	out := []tagOption{}
	for rows.Next() {
		var t tagOption
		if err := rows.Scan(&t.Name, &t.Posts); err != nil {
			log.Printf("scan tags: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		out = append(out, t)
	}
	writeJSON(w, http.StatusOK, out)
}

type tagOption struct {
	Name  string `json:"name"`
	Posts int    `json:"posts"`
}

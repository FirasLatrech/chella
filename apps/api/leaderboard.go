package main

import (
	"context"
	"log"
	"net/http"
	"time"
)

/*
 * THE reputation formula — the single implementation. profile, /api/users,
 * the weekly rail and /api/leaderboard all call leaderboardRows; there is
 * deliberately no second copy of this math anywhere.
 *
 * v2 point values (from the product brief):
 *   post +5 · project +10 · answer/comment +5 · accepted answer +20
 *   upvote received +3 · downvote received −2 · reply vote received +3
 *
 * Anti-spam (quality over volume): only the first 3 posts per day earn
 * creation points — days are UTC calendar days (Tunisia is UTC+1; a post at
 * 23:30 and one at 00:30 local can land on different days. Accepted at this
 * scale, revisit with user timezones). Vote and accept points always count,
 * so reputation beyond the floor must be earned from others.
 *
 * Windows are rolling (now − N days). Seeded base votes carry no timestamps
 * and count in all-time only. Accept points attribute to accepted_at.
 */

const leaderboardQuery = `
with filtered_posts as (
	select p.id, p.author_id, p.kind, p.created_at, p.votes
	from posts p
	where ($2 = '' or exists (
		select 1 from unnest(p.tags) t where lower(t) = lower($2)))
),
post_creation as (
	select author_id,
	       sum(case when rn <= 3
	           then case kind when 'project' then 10 else 5 end
	           else 0 end) as pts
	from (
		select author_id, kind, created_at,
		       row_number() over (
		         partition by author_id, date_trunc('day', created_at)
		         order by created_at) as rn
		from filtered_posts
	) x
	where ($1::timestamptz is null or created_at > $1)
	group by author_id
),
reply_base as (
	select r.author_id, count(*) * 5 as pts
	from replies r join filtered_posts fp on fp.id = r.post_id
	where ($1::timestamptz is null or r.created_at > $1)
	group by r.author_id
),
accept_pts as (
	select r.author_id, count(*) * 20 as pts
	from replies r join filtered_posts fp on fp.id = r.post_id
	where r.accepted
	  and ($1::timestamptz is null or coalesce(r.accepted_at, r.created_at) > $1)
	group by r.author_id
),
post_vote_pts as (
	select fp.author_id,
	       sum(case when v.direction = 1 then 3 else -2 end) as pts
	from post_votes v join filtered_posts fp on fp.id = v.post_id
	where ($1::timestamptz is null or v.created_at > $1)
	group by fp.author_id
),
reply_vote_pts as (
	select r.author_id, count(*) * 3 as pts
	from reply_votes v
	join replies r on r.id = v.reply_id
	join filtered_posts fp on fp.id = r.post_id
	where ($1::timestamptz is null or v.created_at > $1)
	group by r.author_id
),
seed_base as (
	select fp.author_id, sum(fp.votes) * 3 as pts
	from filtered_posts fp
	where $1::timestamptz is null
	group by fp.author_id
	union all
	select r.author_id, sum(r.votes) * 3 as pts
	from replies r join filtered_posts fp on fp.id = r.post_id
	where $1::timestamptz is null
	group by r.author_id
),
all_pts as (
	select author_id, pts from post_creation
	union all select author_id, pts from reply_base
	union all select author_id, pts from accept_pts
	union all select author_id, pts from post_vote_pts
	union all select author_id, pts from reply_vote_pts
	union all select author_id, pts from seed_base
)
select u.id, u.handle, u.name, coalesce(sum(ap.pts), 0)::int as points
from users u
left join all_pts ap on ap.author_id = u.id
group by u.id, u.handle, u.name
order by points desc, u.handle asc`

type boardRow struct {
	UserID int64
	Handle string
	Name   string
	Points int
}

// leaderboardRows computes reputation points. since=nil → all time;
// tag="" → all content, otherwise scoped to posts carrying that tag
// (replies attribute through their post).
func (s *server) leaderboardRows(ctx context.Context, since *time.Time, tag string) ([]boardRow, error) {
	rows, err := s.db.Query(ctx, leaderboardQuery, since, tag)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []boardRow{}
	for rows.Next() {
		var b boardRow
		if err := rows.Scan(&b.UserID, &b.Handle, &b.Name, &b.Points); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// periodSince maps a period name to a rolling window start.
func periodSince(period string) *time.Time {
	var d time.Duration
	switch period {
	case "today":
		d = 24 * time.Hour
	case "week":
		d = 7 * 24 * time.Hour
	case "month":
		d = 30 * 24 * time.Hour
	case "year":
		d = 365 * 24 * time.Hour
	default: // "all"
		return nil
	}
	t := time.Now().Add(-d)
	return &t
}

type leaderboardEntry struct {
	Rank       int      `json:"rank"`
	Handle     string   `json:"handle"`
	Name       string   `json:"name"`
	Tags       []string `json:"tags"`
	Reputation int      `json:"reputation"` // all-time, unscoped
	Points     int      `json:"points"`     // within the requested period+tag
}

// GET /api/leaderboard?period=today|week|month|year|all&tag=…
func (s *server) leaderboard(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	tag := r.URL.Query().Get("tag")

	windowRows, err := s.leaderboardRows(r.Context(), periodSince(period), tag)
	if err != nil {
		log.Printf("leaderboard: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	allRows, err := s.leaderboardRows(r.Context(), nil, "")
	if err != nil {
		log.Printf("leaderboard totals: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	totals := map[int64]int{}
	for _, b := range allRows {
		totals[b.UserID] = b.Points
	}
	tags, err := s.userTopTags(r.Context())
	if err != nil {
		log.Printf("leaderboard tags: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	entries := []leaderboardEntry{}
	rank := 0
	for _, b := range windowRows {
		// Zero-point users don't belong on a scoreboard.
		if b.Points <= 0 {
			continue
		}
		rank++
		userTags := tags[b.UserID]
		if userTags == nil {
			userTags = []string{}
		}
		entries = append(entries, leaderboardEntry{
			Rank:       rank,
			Handle:     b.Handle,
			Name:       b.Name,
			Tags:       userTags,
			Reputation: totals[b.UserID],
			Points:     b.Points,
		})
		if rank >= 50 {
			break
		}
	}
	writeJSON(w, http.StatusOK, entries)
}

// userTopTags maps each user to their two most-used tags.
func (s *server) userTopTags(ctx context.Context) (map[int64][]string, error) {
	rows, err := s.db.Query(ctx, `
		select u.id,
		  (select coalesce(array_agg(t), '{}') from (
		     select t from posts p2, unnest(p2.tags) as t
		     where p2.author_id = u.id
		     group by t order by count(*) desc, t limit 2) sub)
		from users u`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[int64][]string{}
	for rows.Next() {
		var (
			id   int64
			tags []string
		)
		if err := rows.Scan(&id, &tags); err != nil {
			return nil, err
		}
		out[id] = tags
	}
	return out, rows.Err()
}

// tagRank returns a user's 1-based rank on a tag's all-time board, or 0.
func (s *server) tagRank(ctx context.Context, userID int64, tag string) int {
	rows, err := s.leaderboardRows(ctx, nil, tag)
	if err != nil {
		return 0
	}
	rank := 0
	for _, b := range rows {
		if b.Points <= 0 {
			continue
		}
		rank++
		if b.UserID == userID {
			return rank
		}
	}
	return 0
}

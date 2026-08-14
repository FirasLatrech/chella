package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

/*
 * JSON shapes mirror the frontend's TypeScript types (FeedEntry,
 * ContentEntry, Reply) field for field — that is what makes the mock-to-API
 * swap mechanical on the client.
 */

type feedItem struct {
	ID       string   `json:"id"`
	Kind     string   `json:"kind"`
	Title    string   `json:"title"`
	Excerpt  string   `json:"excerpt"`
	Author   string   `json:"author"`
	Time     string   `json:"time"`
	Tags     []string `json:"tags"`
	Votes    int      `json:"votes"`
	Views    int      `json:"views"`
	Replies  int      `json:"replies"`
	Solved   bool     `json:"solved,omitempty"`
	HasImage bool     `json:"hasImage,omitempty"`
	Image    string   `json:"image,omitempty"`
	MyVote   int      `json:"myVote,omitempty"`
	Saved    bool     `json:"saved,omitempty"`
}

type replyItem struct {
	ID       string `json:"id"`
	Author   string `json:"author"`
	Time     string `json:"time"`
	Text     string `json:"text"`
	Votes    int    `json:"votes"`
	Accepted bool   `json:"accepted,omitempty"`
	MyVote   bool   `json:"myVote,omitempty"`
}

type contentEntry struct {
	feedItem
	Blocks     json.RawMessage `json:"blocks"`
	Discussion []replyItem     `json:"discussion"`
}

// relTime renders timestamps the way the UI expects: now / 12m / 2h / 3d.
func relTime(t time.Time) string {
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "now"
	case d < time.Hour:
		return fmt.Sprintf("%dm", int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf("%dh", int(d.Hours()))
	default:
		return fmt.Sprintf("%dd", int(d.Hours()/24))
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func (s *server) meID(r *http.Request) int64 {
	if u := s.currentUser(r); u != nil {
		return u.ID
	}
	return 0
}

// Vote totals are the seeded base plus live per-user vote rows; $1 is the
// requesting user (0 for anonymous) and feeds myVote.
const listQueryBase = `
	select p.id, p.kind, p.title, p.excerpt, u.handle, p.created_at, p.tags,
	       p.votes + coalesce((select sum(direction) from post_votes v where v.post_id = p.id), 0),
	       p.views + (select count(*) from post_views pv where pv.post_id = p.id),
	       p.solved, p.has_image, coalesce(p.image_url, ''),
	       (select count(*) from replies r where r.post_id = p.id),
	       coalesce((select direction from post_votes v where v.post_id = p.id and v.user_id = $1), 0),
	       exists(select 1 from saved_posts sp2 where sp2.post_id = p.id and sp2.user_id = $1)
	from posts p
	join users u on u.id = p.author_id`

func scanFeedItems(rows pgx.Rows) ([]feedItem, error) {
	defer rows.Close()
	items := []feedItem{}
	for rows.Next() {
		var (
			it        feedItem
			id        int64
			createdAt time.Time
		)
		if err := rows.Scan(&id, &it.Kind, &it.Title, &it.Excerpt, &it.Author,
			&createdAt, &it.Tags, &it.Votes, &it.Views, &it.Solved,
			&it.HasImage, &it.Image, &it.Replies, &it.MyVote, &it.Saved); err != nil {
			return nil, err
		}
		it.ID = fmt.Sprint(id)
		it.Time = relTime(createdAt)
		items = append(items, it)
	}
	return items, rows.Err()
}

// GET /api/posts — the feed. Optional query params:
//
//	q=…      search in title, excerpt, tags and author handle
//	kind=…   question | project | post
//	tag=…    exact tag (case-insensitive)
//	sort=…   new (default) | top | views
func (s *server) listPosts(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	args := []any{s.meID(r)}
	where := ""

	addWhere := func(clause string) {
		if where == "" {
			where = " where " + clause
		} else {
			where += " and " + clause
		}
	}

	if kind := params.Get("kind"); kind == "question" || kind == "project" || kind == "post" {
		args = append(args, kind)
		addWhere(fmt.Sprintf("p.kind = $%d", len(args)))
	}
	if tag := strings.TrimSpace(params.Get("tag")); tag != "" {
		args = append(args, tag)
		addWhere(fmt.Sprintf(
			"exists (select 1 from unnest(p.tags) t where lower(t) = lower($%d))", len(args)))
	}
	if q := strings.TrimSpace(params.Get("q")); q != "" {
		args = append(args, "%"+q+"%")
		n := len(args)
		addWhere(fmt.Sprintf(`(p.title ilike $%d or p.excerpt ilike $%d
			or u.handle ilike $%d
			or exists (select 1 from unnest(p.tags) t where t ilike $%d))`, n, n, n, n))
	}

	order := " order by p.created_at desc"
	switch params.Get("sort") {
	case "top":
		order = ` order by p.votes + coalesce((select sum(direction)
			from post_votes v where v.post_id = p.id), 0) desc, p.created_at desc`
	case "views":
		order = ` order by p.views + (select count(*) from post_views pv
			where pv.post_id = p.id) desc, p.created_at desc`
	}

	rows, err := s.db.Query(r.Context(), listQueryBase+where+order, args...)
	if err != nil {
		log.Printf("list posts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	items, err := scanFeedItems(rows)
	if err != nil {
		log.Printf("scan posts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// GET /api/posts/{id} — full entry with body blocks and discussion.
// Counts a view.
func (s *server) getPost(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	meID := s.meID(r)

	// Unique views: one row per (user, post) — refreshing ten times counts
	// once. Best-effort; a failed insert must not fail the read.
	if meID != 0 {
		if _, err := s.db.Exec(r.Context(), `
			insert into post_views (user_id, post_id) values ($1, $2)
			on conflict do nothing`, meID, id); err != nil {
			log.Printf("record view: %v", err)
		}
	}

	var (
		entry     contentEntry
		pid       int64
		createdAt time.Time
	)
	err := s.db.QueryRow(r.Context(), `
		select p.id, p.kind, p.title, p.excerpt, u.handle, p.created_at, p.tags,
		       p.votes + coalesce((select sum(direction) from post_votes v where v.post_id = p.id), 0),
		       p.views + (select count(*) from post_views pv where pv.post_id = p.id),
		       p.solved, p.has_image, coalesce(p.image_url, ''), p.blocks,
		       (select count(*) from replies r where r.post_id = p.id),
		       coalesce((select direction from post_votes v where v.post_id = p.id and v.user_id = $2), 0),
		       exists(select 1 from saved_posts sp2 where sp2.post_id = p.id and sp2.user_id = $2)
		from posts p
		join users u on u.id = p.author_id
		where p.id = $1`, id, meID).
		Scan(&pid, &entry.Kind, &entry.Title, &entry.Excerpt, &entry.Author,
			&createdAt, &entry.Tags, &entry.Votes, &entry.Views, &entry.Solved,
			&entry.HasImage, &entry.Image, &entry.Blocks, &entry.Replies,
			&entry.MyVote, &entry.Saved)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	entry.ID = fmt.Sprint(pid)
	entry.Time = relTime(createdAt)

	rows, err := s.db.Query(r.Context(), `
		select r.id, u.handle, r.created_at, r.body,
		       r.votes + coalesce((select count(*) from reply_votes v where v.reply_id = r.id), 0),
		       r.accepted,
		       exists(select 1 from reply_votes v where v.reply_id = r.id and v.user_id = $2)
		from replies r
		join users u on u.id = r.author_id
		where r.post_id = $1
		order by r.accepted desc, r.created_at asc`, id, meID)
	if err != nil {
		log.Printf("list replies: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	defer rows.Close()

	entry.Discussion = []replyItem{}
	for rows.Next() {
		var (
			rep       replyItem
			rid       int64
			replyTime time.Time
		)
		if err := rows.Scan(&rid, &rep.Author, &replyTime, &rep.Text,
			&rep.Votes, &rep.Accepted, &rep.MyVote); err != nil {
			log.Printf("scan reply: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
			return
		}
		rep.ID = fmt.Sprint(rid)
		rep.Time = relTime(replyTime)
		entry.Discussion = append(entry.Discussion, rep)
	}

	writeJSON(w, http.StatusOK, entry)
}

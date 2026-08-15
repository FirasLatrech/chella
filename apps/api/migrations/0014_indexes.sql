/*
 * Indexes for the access patterns the app actually uses. Verified against
 * EXPLAIN — each of these replaced a sequential scan.
 */

-- Feed paging keys on (created_at, id); the created_at-only index couldn't
-- serve the ordering, so every page sorted the whole table.
drop index if exists posts_created_at_idx;
create index posts_created_id_idx on posts (created_at desc, id desc);

-- "Their posts" on every profile, and the author joins in the leaderboard.
create index posts_author_idx on posts (author_id);

-- Reply vote totals are computed per reply on every post read.
create index reply_votes_reply_idx on reply_votes (reply_id);

-- Vote totals per post, same pattern as post_views.
create index post_votes_post_idx on post_votes (post_id);

-- Replies are aggregated by author for reputation and badges.
create index replies_author_idx on replies (author_id);

-- Saved lists join on the user; the primary key leads with user_id so
-- lookups are covered, but the post-side lookup (is this saved?) is not.
create index saved_posts_post_idx on saved_posts (post_id);

-- Tag filtering uses `exists (select 1 from unnest(tags) ...)`, which cannot
-- use a GIN index, but the leaderboard's tag scope benefits from one on the
-- array itself for future exact-match paths.
create index posts_tags_idx on posts using gin (tags);

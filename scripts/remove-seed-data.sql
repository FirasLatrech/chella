-- Remove demo/seed accounts and their content from a REAL deployment.
--
--   psql "$DATABASE_URL" -f scripts/remove-seed-data.sql
--
-- Keeps ONLY the real accounts listed in keep_handles below. Everything else
-- (the seeded demo users and their posts/replies) goes.
--
-- Deploy the SEED_DEMO gate in main.go FIRST, otherwise the next API restart
-- re-creates the demo users. (seed() is gated on `posts` being empty, so with
-- real posts present it would not re-run anyway — but do not rely on that.)
--
-- Ordering note: only posts.author_id and replies.author_id lack
-- `on delete cascade`. Every other table (votes, views, saves, notifications,
-- sessions, email_verifications, password_resets) cascades from users, posts
-- or replies, so deleting those three in order is enough.

begin;

create temp table keep_handles (handle text) on commit drop;
insert into keep_handles values ('slimani'), ('firaslatrach');

create temp table doomed on commit drop as
select id from users where handle not in (select handle from keep_handles);

-- Replies by a doomed user, ANYWHERE (including on posts we keep).
delete from replies where author_id in (select id from doomed);

-- Replies on a doomed user's posts, whoever wrote them. Children cascade via
-- replies.parent_id, so one delete covers a whole thread.
delete from replies where post_id in (
    select id from posts where author_id in (select id from doomed)
);

-- Seeded jobs are invented companies with posted_by = null, so they are NOT
-- reachable from `doomed` at all. The jobs board is still behind the
-- LIVE = false overlay, but GET /api/jobs serves them publicly either way.
-- Comment this out if you want to keep the placeholder listings.
delete from jobs where posted_by is null;

delete from posts where author_id in (select id from doomed);
delete from users where id in (select id from doomed);

-- BACK UP FIRST: pg_dump "$DATABASE_URL" > backup.sql
-- This transaction commits immediately; the output below reports what REMAINS,
-- it is not a preview. Deleting 7 users on a live DB is not reversible here.
--
-- email_verified matters: the API now refuses posts from unverified accounts,
-- so if a kept user shows `f` they must enter their code before they can post.
select handle, name, email_verified from users order by handle;
select count(*) as posts_left from posts;
select count(*) as replies_left from replies;

commit;

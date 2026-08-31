-- Load-test seed: 1000 synthetic posts. TEST ONLY — never run against prod.
--
-- Deliberately NOT part of apps/api/seed.go: that seed is the real launch
-- content and is gated on `posts` being empty. This script is additive and
-- reversible instead, so it can be run on top of a normal dev database and
-- removed again without touching anything real.
--
--   run:      make seed-load
--   undo:     make seed-load-undo
--
-- Rows land at id >= 100000, well clear of posts_id_seq, so real posts keep
-- using the sequence and cleanup is a single range delete. Re-running is
-- idempotent: the whole range is deleted first.
--
-- Everything is derived from the row number rather than random(), so two runs
-- produce identical data and a bug found at row 837 is reproducible.

begin;

delete from posts where id >= 100000;

insert into posts (id, kind, title, excerpt, blocks, tags, author_id,
                   votes, views, solved, has_image, created_at, image_url)
select
    100000 + i,
    (array['question', 'project', 'post']::post_kind[])[1 + (i * 7) % 3],
    case (i * 7) % 3
        when 0 then 'How do you handle ' || topic || ' at scale?'
        when 1 then initcap(topic) || ' toolkit #' || i
        else 'What I learned shipping ' || topic || ' in production'
    end,
    'Load-test row ' || i || '. Notes on ' || topic ||
    ' — tradeoffs, what broke under real traffic, and what we would do differently next time.',
    jsonb_build_array(
        jsonb_build_object('type', 'p', 'text',
            'Synthetic body for load-test post ' || i || ', covering ' || topic || '.'),
        jsonb_build_object('type', 'p', 'text',
            'Second paragraph so the detail view has more than one block to render.')
    ),
    -- 1-3 tags, drawn from the pool the real content already uses. The three
    -- modulo picks can collide, so array_agg is DISTINCT: duplicate tags on
    -- one post are invalid data (React keys off the tag name).
    -- array_agg over zero rows is NULL, and tags is not-null: coalesce it.
    coalesce((select array_agg(distinct t) from unnest(array[
        pool[1 + (i * 3) % 12],
        pool[1 + (i * 5) % 12],
        pool[1 + (i * 11) % 12]
    ]) as t
     where (i % 4) > 0                       -- every 4th post has no tags
       and t is not null), '{}'),
    authors[1 + i % array_length(authors, 1)],
    (i * 13) % 120 - 5,                      -- votes, a few negative
    (i * 37) % 4000,
    (i % 7) = 0,                             -- ~14% marked solved
    true,                                    -- see image_url below
    -- 259 min apart x 1000 rows ~= 180 days, so the rolling leaderboard
    -- windows (24h/7d/30d/365d) each land on a different slice.
    now() - (i * 259 || ' minutes')::interval,
    -- A different random photo per row, seeded by the row number so the same
    -- post keeps the same picture across re-runs. This is TEST DATA carrying a
    -- real image_url, not the UI inventing cover art for a post that has none
    -- (CLAUDE.md: only a real upload gets a thumbnail — that rule is about the
    -- frontend, and it still holds; nothing here generates an image at render).
    'https://picsum.photos/seed/chelaa' || i || '/800/450'
from generate_series(1, 1000) as i,
lateral (select array[
    'Go', 'Postgres', 'React', 'Next.js', 'DevOps', 'AI',
    'Data', 'Payments', 'Startup', 'Careers', 'NLP', 'Maps'
] as pool) p,
lateral (select array(select id from users order by id) as authors) a,
lateral (select p.pool[1 + (i * 3) % 12] as topic) t;

commit;

select count(*) as load_test_posts from posts where id >= 100000;

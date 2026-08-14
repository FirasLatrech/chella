-- Unique view tracking: one row per user per post. The posts.views column
-- becomes the seeded base; live totals add distinct viewers on top.
create table post_views (
    user_id    bigint not null references users (id) on delete cascade,
    post_id    bigint not null references posts (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create index post_views_post_idx on post_views (post_id);

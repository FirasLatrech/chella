-- Auth and per-user voting.
--
-- posts.votes / replies.votes become BASE counts (the seeded numbers);
-- the live totals returned by the API are base + sum of real vote rows.

alter table users
    add column password_hash text not null default '',
    add column created_at timestamptz not null default now();

create table sessions (
    token      text primary key,
    user_id    bigint not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create index sessions_user_idx on sessions (user_id);

create table post_votes (
    user_id    bigint not null references users (id) on delete cascade,
    post_id    bigint not null references posts (id) on delete cascade,
    direction  smallint not null check (direction in (-1, 1)),
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create table reply_votes (
    user_id    bigint not null references users (id) on delete cascade,
    reply_id   bigint not null references replies (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, reply_id)
);

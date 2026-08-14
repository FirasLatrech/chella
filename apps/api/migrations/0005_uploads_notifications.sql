-- Post images + notifications.

alter table posts add column image_url text;

create table notifications (
    id         bigint generated always as identity primary key,
    user_id    bigint not null references users (id) on delete cascade, -- recipient
    actor_id   bigint not null references users (id) on delete cascade,
    kind       text not null check (kind in ('reply', 'vote', 'accept')),
    post_id    bigint not null references posts (id) on delete cascade,
    reply_id   bigint references replies (id) on delete cascade,
    read       boolean not null default false,
    created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);

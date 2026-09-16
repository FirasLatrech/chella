-- Daily bot suggestions for admins to review before publishing as chelaa_bot.

alter table users add column if not exists is_bot boolean not null default false;

create table bot_config (
    id          int primary key default 1 check (id = 1),
    enabled     boolean not null default false,
    context     text not null default '',
    run_hour    int not null default 8 check (run_hour >= 0 and run_hour <= 23),
    timezone    text not null default 'Africa/Tunis',
    last_run_at timestamptz,
    updated_at  timestamptz not null default now()
);

insert into bot_config (id) values (1) on conflict do nothing;

create table bot_suggestions (
    id          bigint generated always as identity primary key,
    kind        post_kind not null default 'post',
    title       text not null,
    body        text not null,
    tags        text[] not null default '{}',
    rationale   text not null default '',
    status      text not null default 'pending'
        check (status in ('pending', 'accepted', 'rejected')),
    post_id     bigint references posts (id) on delete set null,
    reviewed_by bigint references users (id),
    reviewed_at timestamptz,
    created_at  timestamptz not null default now()
);

create index bot_suggestions_status_created_idx on bot_suggestions (status, created_at desc);

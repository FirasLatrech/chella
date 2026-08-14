-- Password reset tokens: single-use, short-lived.
create table password_resets (
    token      text primary key,
    user_id    bigint not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create index password_resets_user_idx on password_resets (user_id);

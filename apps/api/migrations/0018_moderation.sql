-- Moderation is opt-in for new posts. Existing content stays visible.
alter table users add column is_admin boolean not null default false;
alter table users add column priority_posting boolean not null default false;

alter table posts add column status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected'));
alter table posts add column reviewed_at timestamptz;
alter table posts add column reviewed_by bigint references users (id);

create index posts_status_created_at_idx on posts (status, created_at desc);

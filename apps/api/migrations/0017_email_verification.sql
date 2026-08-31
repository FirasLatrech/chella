-- Email verification: signup requires a code before the account is usable.
-- One active code per user (a resend overwrites it), so it lives on a
-- single row keyed by user_id rather than a growing log table.
alter table users add column email_verified boolean not null default false;

create table email_verifications (
    user_id    bigint primary key references users (id) on delete cascade,
    code       text not null,
    expires_at timestamptz not null
);

-- Seed users predate this feature and have no way to receive the code.
update users set email_verified = true;

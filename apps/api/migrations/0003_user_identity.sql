-- Full identity: unique email + split name. Seeded users get derived emails
-- so the column can be NOT NULL; `name` stays as the display name.

alter table users
    add column email text,
    add column first_name text not null default '',
    add column last_name text not null default '';

update users set email = handle || '@chelaa.tn' where email is null;
update users set first_name = name where first_name = '';

alter table users alter column email set not null;

create unique index users_email_idx on users (lower(email));

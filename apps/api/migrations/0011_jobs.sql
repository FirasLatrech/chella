create table jobs (
    id          bigserial primary key,
    title       text not null,
    company     text not null,
    location    text not null default '',
    /* full-time | part-time | contract | internship */
    kind        text not null default 'full-time',
    /* onsite | hybrid | remote */
    arrangement text not null default 'onsite',
    salary_min  int,
    salary_max  int,
    currency    text not null default 'TND',
    /* Skills the role wants — matched against a user's top tags. */
    tags        text[] not null default '{}',
    description text not null default '',
    apply_url   text not null default '',
    /* Contributions expected before the role is a realistic fit. Drives the
       "you qualify" signal, never a hard block on viewing. */
    min_reputation int not null default 0,
    posted_by   bigint references users (id) on delete set null,
    created_at  timestamptz not null default now(),
    closed      boolean not null default false
);

create index jobs_created_idx on jobs (created_at desc);

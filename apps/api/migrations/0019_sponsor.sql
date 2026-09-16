create table site_sponsor (
    id boolean primary key default true check (id),
    active boolean not null default false,
    name text not null default '',
    title text not null default '',
    href text not null default '',
    image_url text not null default '',
    updated_at timestamptz not null default now(),
    updated_by bigint references users (id)
);

insert into site_sponsor (id) values (true);

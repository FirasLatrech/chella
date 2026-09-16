create table sponsors (
    id bigserial primary key,
    active boolean not null default true,
    name text not null,
    title text not null,
    href text not null,
    image_url text not null default '',
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    updated_by bigint references users (id)
);

insert into sponsors (active, name, title, href, image_url, sort_order)
values
    (true, 'CareerPath', 'Your complete career workspace', 'https://careerpath.com', '/images/careerpath.webp', 10),
    (true, 'hushstat', 'Know who visits your site', 'https://hushstat.com', '/images/hushstat.webp', 20);

insert into sponsors (active, name, title, href, image_url, sort_order, updated_by)
select active, name, title, href, image_url, 30, updated_by
from site_sponsor
where name <> '' and title <> '' and href <> '';

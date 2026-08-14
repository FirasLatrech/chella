alter table users
    add column bio      text not null default '',
    add column github   text not null default '',
    add column linkedin text not null default '',
    add column website  text not null default '',
    add column cv_url   text not null default '';

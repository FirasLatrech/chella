-- Declared topic interests, used to rank suggestions ("For you").
-- Stored lowercased so they group with tags the same way search does.
alter table users
    add column interests text[] not null default '{}';

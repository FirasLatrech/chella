-- One level of threading: a reply may answer another reply on the same post.
-- Only top-level replies can be accepted; children go with their parent.
alter table replies
    add column parent_id bigint references replies (id) on delete cascade;

create index replies_parent_idx on replies (parent_id) where parent_id is not null;

-- 'thread' — someone replied to your comment (as opposed to your post).
alter table notifications drop constraint notifications_kind_check;
alter table notifications
    add constraint notifications_kind_check
    check (kind in ('reply', 'vote', 'accept', 'thread'));

-- Removes everything scripts/seed-load-test.sql inserted, and nothing else.
-- Replies/votes/views/saves/notifications on those posts go with them via
-- `on delete cascade`; real content lives below id 100000 and is untouched.
begin;
delete from posts where id >= 100000;
commit;
select count(*) as remaining_load_test_posts from posts where id >= 100000;

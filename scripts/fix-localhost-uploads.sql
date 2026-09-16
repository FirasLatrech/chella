-- Repair upload URLs that were saved with the localhost fallback host.
--
--   psql "$DATABASE_URL" -f scripts/fix-localhost-uploads.sql
--
-- Cause: the API ran without R2_* configured AND without PUBLIC_API_URL, so
-- diskStorage baked "http://localhost:4120" into every stored URL. The files
-- themselves are fine and still served at https://api.chelaa.dev/uploads/...
-- — only the hostname is wrong.
--
-- This rewrites the host in place, so existing avatars/CVs/post images start
-- loading again without re-uploading anything.
--
-- If you instead switch to R2, do NOT run this: the old files live on the
-- API's disk, not in the bucket, and would need copying over first.

\set public_base 'https://api.chelaa.dev'

begin;

update users
   set avatar_url = :'public_base' || substring(avatar_url from position('/uploads/' in avatar_url))
 where avatar_url like 'http://localhost:%/uploads/%';

update users
   set cv_url = :'public_base' || substring(cv_url from position('/uploads/' in cv_url))
 where cv_url like 'http://localhost:%/uploads/%';

update posts
   set image_url = :'public_base' || substring(image_url from position('/uploads/' in image_url))
 where image_url like 'http://localhost:%/uploads/%';

-- Should return zero rows.
select 'users.avatar_url' as col, avatar_url as still_broken from users
 where avatar_url like 'http://localhost:%'
union all
select 'users.cv_url', cv_url from users where cv_url like 'http://localhost:%'
union all
select 'posts.image_url', image_url from posts where image_url like 'http://localhost:%';

commit;

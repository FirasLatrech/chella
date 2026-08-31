# Chelaa

Monorepo: `apps/web` (Next.js 16 · React 19 · Tailwind v4 · TypeScript) and
`apps/api` (Go 1.25 · net/http · pgx). Postgres 17 runs in Docker.

Ports: web `4100`, API `4120`. Run with `make db` / `make api` / `make web`.

---

## ⚠️ Control sizing — the most important UI rule

**Every interactive control MUST take its geometry from
`apps/web/src/components/ui/control.ts`.** That file is the single source of
truth for height, horizontal padding, radius, focus ring and type scale.

This applies to: `Button`, `Input`, `Select`, `Combobox` and dropdown triggers.

Dropdown **options** are the exception: they use `controlItemSizes`, which is
deliberately more compact than the trigger (a list reads better dense than at
full control height). Their horizontal padding still tracks the control so
labels align with the trigger's text.

| Size | Mobile | ≥ `md` |
| ---- | ------ | ------ |
| `sm` | `h-8 px-2.5 text-xs` | `h-9 px-2.5 text-sm` |
| `md` (default) | `h-9 px-2.5 text-sm` | `h-10 px-3 text-base` |
| `lg` | `h-11 px-4 text-base` | `h-12 px-5 text-base` |

**Never hardcode `h-*`, `px-*`, `py-*` or `rounded-*` on a control.** If a new
size is needed, add it to `control.ts` so every control gains it at once.

The failure this prevents: one input rendering 45px tall while another renders
20px. If controls ever visually disagree, the fix belongs in `control.ts`, not
in the component.

---

## Design system

Tokens derive from [aside.com](https://aside.com) and live in
`apps/web/src/app/globals.css`. Full reference in `README.md`.

- **Colour:** neutral/monochrome base, sky brand accent (`--brand`).
  Light is the default theme; dark only when the user explicitly opts in.
- **Radius:** `--radius: 0.625rem`, with squircle corners
  (`corner-shape: superellipse(1.4)`) on rounded utilities.
- **Surfaces:** hairline rings (`ring-[0.5px]`) plus soft shadows — **never a
  hard 1px border** on an elevated panel.
- **Type:** Geist / Geist Mono. Headings are Geist with
  `font-semibold tracking-tight`. Button labels are weight `450`.

## Icons

Solar Icons, **Bold Duotone** style only:

```tsx
import { CupIcon } from "@solar-icons/react/bold-duotone";
<CupIcon size={16} className="text-brand" />
```

Import from the `/bold-duotone` subpath so bundles stay tree-shaken. Let icons
inherit `currentColor` — style them with text-colour tokens, never a hardcoded
`color` prop. Defaults live in `src/components/icon-provider.tsx`.

## UI components

Built on **Headless UI 2** (`@headlessui/react`) for accessibility behaviour,
styled with our tokens. Components live in `apps/web/src/components/ui/`.

- Use Headless UI's `data-*` attributes for state (`data-focus`,
  `data-selected`, `data-open`) — not the v1 `ui-*` classes.
- `controlFocus` applies the ring on **both** `data-focus` and `data-open`, so
  a trigger stays visibly active while its panel is open (focus moves into the
  panel, which would otherwise make the trigger look inactive).
- Modals follow the same frame-inside-tint relationship as `Card` and the
  notifications panel: tinted shell (`bg-muted/70 p-1.5 rounded-2xl`), an
  inset `bg-popover` panel that scrolls, and header/footer sitting on the
  tint OUTSIDE the inset — so the footer never scrolls with the fields.
  `Dialog` renders its own heading only when passed `title`/`description`;
  a caller building its own header imports `DialogTitle` (re-exported from
  `ui/dialog`) so the accessible association survives.
- Dropdown panels position with **CSS (`absolute`), not the `anchor` prop**.
  `anchor` portals to `document.body` and measures on open, which causes a
  visible scroll jump.
- Keep re-renders low: `memo` exported components, `useMemo` derived lists,
  and keep option arrays as module-level constants so `memo` holds.

## App structure

- `/` — dashboard (feed). `/ui` — component showcase, kept as a living style
  reference. `/[section]` — placeholder pages for sidebar destinations that
  aren't built yet (currently only `people`).
- **There is NO `/projects` route either** — removed along with
  `components/projects/` (`ProjectsBrowser`, `ProjectCard`, `VotePill`), the
  same way `/questions` went. Projects remain a post KIND, browsable from the
  feed's Projects tab. The feed is now the ONE list, so it honours `?tag=`
  (the filter `/projects` used to own): trending tags, the search palette and
  the sidebar all point at `/?tag=`, `FeedList` passes it through to
  `useInfinitePosts`, and `app/page.tsx` MUST include it in the prefetched
  params or hydration misses. A filtered feed shows a "Filtered by #tag ·
  Clear" line — an invisible filter looks like an empty feed.
- **There is NO `/questions` route** — it was removed along with
  `components/questions/` and the `questionsFromFeed` helper. Questions are
  still a post KIND, browsable via the feed's Questions tab
  (`/api/posts?kind=question`); don't recreate the page. Anything that
  previously linked to `/questions` or `/projects` now points at `/`, with
  tag links carrying `?tag=`.
- Dashboard components live in `apps/web/src/components/dashboard/`.
  `Shell` provides the sidebar + inset content panel; wrap page content in it.
- The shell applies the same frame-inside-tint relationship as `Card`, at page
  scale: sky backdrop, sidebar sitting on it translucently, content as an
  inset panel with a hairline ring.
- The backdrop is the `.app-backdrop` utility, driven by the `--app-backdrop`
  token in `globals.css`. Change that one value to rebrand the shell; it is
  dimmed automatically in dark mode. It layers two pseudo-elements:
  `::before` is the full-cover artwork (`z-index: -2`), `::after` is a blurred
  shadow along the top edge (`z-index: -1`) that gives the header depth.
  The owner has confirmed they hold the rights to the current sky image, so
  it ships as-is — no replacement needed.
- Anything sitting on the backdrop (sidebar pills, the reputation card) uses a
  translucent surface plus `backdrop-blur`, not an opaque fill — an opaque
  panel reads as a flat patch against the sky.

## Backend (Go API)

`apps/api` — package main, stdlib `net/http` + pgx. On boot it runs embedded
SQL migrations (`migrations/*.sql` + a hand-rolled ~40-line runner, no
external tooling) and an **idempotent seed** (no-op once `posts` has rows).

- Schema: `users`, `posts` (blocks jsonb, tags text[], aggregate votes/views),
  `replies`. Per-user vote rows come with auth; response shapes won't change.
- Endpoints: `GET /api/posts` (feed, newest first), `GET /api/posts/{id}`
  (blocks + discussion, accepted answers first). JSON keys mirror the TS types
  (`FeedEntry`/`ContentEntry`/`Reply`) field for field.
- Relative times (`12m`, `2h`) are computed server-side.
- Filtering/search/sort stay client-side for now.

Frontend consumes it via `apps/web/src/lib/api.ts`
(`API_URL ?? http://localhost:4120` — Next does NOT read the repo-root .env).
Data pages (`/`, `/projects`, `/post/[id]`) are
`force-dynamic`, so `pnpm build` never needs the API running.
**Running the app now requires `make db` + `make api`** before `make web`.

**Auth**: bcrypt + session cookie (`chelaa_session`, httpOnly, Lax — 4100→4120
is same-site so it flows on `credentials: "include"`). Endpoints:
signup/login/logout/me. Seed users sign in with password `chelaa123`.
Mutations (create post/reply, post vote ±1, reply vote, accept answer) require
a session; accept is verified server-side (question author only). Vote totals
= seeded base column + live per-user vote rows, so re-votes can't corrupt
aggregates. `myVote` appears in reads when authed.

**Uploads**: Cloudflare R2 via S3 API (env `R2_*` in the gitignored `.env`;
falls back to local disk when unset). Content-type is sniffed server-side;
`createPost.imageUrl` must come from our own uploader. **Notifications** are
real events (reply/upvote/accept, never self, no re-vote duplicates), polled
by the panel every 30s. **Views are unique per user** (`post_views` rows; the
column is seeded base). **Reputation has ONE formula** —
`leaderboardRows(ctx, since, tag)` in `apps/api/leaderboard.go`; nothing else
does point math (grep for `* 5` etc. outside that file should stay empty).
Values: post +5, project +10, reply +5, accepted answer +20 (attributed to
`accepted_at`, migration 0007), upvote received +3, downvote −2, reply vote +3.
Anti-spam: only the first 3 posts per UTC day earn creation points. Windows
are rolling (`periodSince`: 24h/7d/30d/365d/nil); seeded base votes count in
all-time only. `GET /api/leaderboard?period=&tag=` serves the boards (≤0
points skipped, limit 50); profiles get `tagRanks` ("#1 Go") via `tagRank`.
**Only the top 5 render** (`VISIBLE_RANKS` in
`components/dashboard/locked-ranks.tsx`): podium + 2 rows, then `LockedRanks`
draws a blurred, `inert` preview under a wash and a "Top N shown" lock, same
treatment as the jobs board's coming-soon state. The preview rows are INVENTED
people, never real ones blurred — a blurred real name is still a real name —
and there are as many of them as ranks actually hidden. **This is cosmetic, not
access control**: `GET /api/leaderboard` still returns the whole board, so
ranks past the cut sit in the page's hydration payload. Gate the endpoint if it
ever needs to be a real one.
The page has ONE filter row (period + tag, in `LeaderboardBrowser`, sticky and
opaque). `LeaderboardList` used to carry a SECOND, client-only period switcher
that re-sorted the same rows — two filters that disagreed. Don't reintroduce
it; that component is presentational now.
Frontend: `boardParams` lives in `lib/keys.ts` (NOT the client component —
server pages import it for prefetch) and `LeaderboardBrowser` re-queries per
period/tag with the previous board held. Composer drafts survive 401→login via
sessionStorage.

**Profile details** (migration 0008): users carry bio/github/linkedin/
website/cv_url, edited in the `EditProfileDialog` modal on the profile page
itself (there is NO /settings route — it was removed) via `PUT /api/me/profile`
(`apps/api/profile.go` — links normalized + host-checked server-side; the CV
must be a URL from our own uploader, PDFs allowed on `/api/uploads` but
`validStoredImage` still rejects them for post images). The contributions
graph is REAL data: `GET /api/users/{handle}/activity` returns UTC daily
counts (posts + replies + votes cast, last 370 days) and `ActivityGraph`
renders `days` — the hash-seeded fake is gone. **Live-ish updates** via
polling: feed 30s, entry 10s, notifications 30s, header XP 60s, plus
refetch-on-focus — no websockets yet. **Numbers**: reputation/points always
render through `formatPoints` (`lib/format.ts`, 1049 → "1k"); the header
shows an XP chip (`xp-chip.tsx`, useMe → useProfile).

**Saved/bookmarks** (migration 0009): `saved_posts` rows; `POST
/api/posts/{id}/save` toggles, `GET /api/saved` lists (newest saved first),
and every feed/entry read carries `saved` for the requesting user.
`SaveButton` (`components/post/save-button.tsx`) patches ALL cached lists
optimistically (feed + the `["posts", …]` search family + the entry) and
invalidates `queryKeys.saved`; on the detail page use `SaveEntryButton`,
which reads state from the entry cache. `/saved` filters by kind client-side.
**Copy link**: `components/post/copy-link-button.tsx` — on feed cards, feed
rows (hover-revealed, like SaveButton) and the post header. Cards are `<Link>`s,
so the handler MUST `preventDefault()` + `stopPropagation()` or copying also
navigates. `navigator.clipboard` is undefined on insecure origins and rejects
when the document isn't focused, so there's an `execCommand` fallback and a
"Press ⌘C to copy" state if both fail — never a silent no-op. Confirmation is
the tooltip flipping to "Copied" (plus a green check) for 1.6s rather than a
toast; the timer is cleared on unmount because the virtualized feed unmounts
rows mid-timeout.
**Tooltips**: `components/ui/tooltip.tsx` — hover/focus label for icon-only
controls, CSS-`absolute` inside a `relative` wrapper (never Headless UI's
`anchor` prop — it portals to the body and causes a scroll jump). Surface
matches the contributions-graph tooltip; `pointer-events-none` so it can never
swallow the click it describes.

**Media lightbox**: `components/ui/media-viewer.tsx` (`MediaTrigger` wraps
any thumbnail/link; kind inferred from extension — image/pdf/video). Feed
thumbnails and the post hero render through `components/ui/card-image.tsx`
(`CardImage`), wrapped in `MediaTrigger`. It is an `<img class="object-cover">`
— visually identical to the `background-image` + `bg-cover` divs it replaced,
but only an element image gets `loading="lazy"` + `decoding="async"`, which is
what keeps a 1000-row feed smooth. It fades up from a slight blur on load, over
a pulsing `bg-muted` frame, and remembers settled sources in a module-level Set
so a row leaving and re-entering the virtualizer doesn't replay the fade.
`next/image` is deliberately NOT used: post image URLs are user-supplied from
an env-dependent uploader host, so the optimizer would need per-environment
remotePatterns or a wildcard that re-serves arbitrary remote images (there is
an `eslint-disable` for `no-img-element` recording this).
The feed's sticky bands (composer + filter tabs) are OPAQUE `bg-background`,
not tinted+blurred — cards scrolling underneath ghosted through the tint.
Translucency in this app is for surfaces over the sky backdrop, not over the
content panel; the CV opens in the
viewer, not a new tab. Posting has no profile-completeness gate — any signed-in
user can publish regardless of profile state.

**Rich text** (migration-free): post bodies are stored as jsonb `Block[]`
(`p` / `heading` / `code` / `list` / `quote`). The whitelist is enforced in
`apps/api/blocks.go` (`sanitizeBlocks` — unknown types dropped, plain text
only, never HTML); `lib/blocks.ts` mirrors it client-side for convenience,
NOT as the boundary. A plain `body` string still becomes one paragraph, which
is what keeps the seed working.

**Edit/delete** (migration 0010, `edited_at`): PATCH/DELETE on posts and
replies. Authorship is enforced inside the SQL (`where id = $1 and author_id
= $2`) so there's no check-then-write gap, and a miss returns 404 rather than
403 (a 403 would confirm someone else's id exists). Deleting an accepted
answer clears the question's `solved` flag. Reputation and badges need no
unwinding — both recompute from the domain tables.

**Threads** (migration 0016, `replies.parent_id`): ONE level of nesting. A
reply may carry `parentId` pointing at a top-level reply on the same post; the
API re-parents anything deeper to the thread's root (`createReply`), rejects a
parent from another post (404) and refuses to accept a nested reply
(400 — only top-level answers can be accepted). Children cascade on delete.
Nested replies notify the ROOT reply's author with kind `thread` ("replied to
your comment"), not the post author (mail + `notifications.tsx` KIND map +
the `NotificationItem` union all carry it). `replyItem` gained `createdAt`
(RFC 3339) because `time` is a relative label and ids aren't chronological.
`Discussion` builds the tree client-side (roots + `children` sorted oldest
first) and the heading counts ROOTS only. **Reply sorting** is client-side too
(the discussion is fetched whole): Top / Newest / Oldest via `Tabs`, accepted
answer always pinned first; default is Top for questions, Oldest for
comments. The inline `ThreadComposer` is a plain `Textarea` (⌘/Ctrl+Enter
sends, Esc closes) — replies are plain text everywhere.

**Composer drafts** (`lib/draft.ts`): ONE draft per user in localStorage
(`chelaa:draft:<handle>`), autosaved 400ms after each change and flushed on
unmount; saving an empty draft removes it. Closing the composer keeps the draft
— the collapsed pill shows "Draft · title" with a discard ×; publishing clears
it. The 401 → login bounce reuses the same store plus a sessionStorage
`resume` flag so the composer comes back OPEN (`markResume`/`takeResume`);
the old `chelaa:draft` sessionStorage blob is gone. Blocks are stored and
restored via `initialDoc={blocksToDoc(...)}`, so formatting survives.
The editor unmounts on collapse, so `open()` hands the current blocks back in
through `mountDoc` + a key bump.

**Feed search** lives IN the filter row (`SearchInput`, `/` focuses it) — not
the ⌘K palette, which jumps to one thing. Local state, debounced 250ms into
`q` on `useInfinitePosts` (the API already matched title/excerpt/author/tags);
deliberately NOT in the URL, so a keystroke doesn't re-render the server page
and the empty query still hits the prefetched key. Kind counts hide while
searching (they'd disagree with the narrowed list). `useInfinitePosts` uses
`placeholderData: keepPreviousData` so param changes don't flash empty, and
`loadMore` is gated on `!isPlaceholderData` so a held-over board is never
paged with the wrong cursor. `FeedList` renders its own empty state.

**Infinite scroll + virtualization** (NOT numbered pagination — user asked
for this explicitly): `GET /api/posts?paged=1&cursor=` returns
`{items, next}`. The cursor keys on `(created_at, id)`, never `id` alone —
seeded ids are not chronological and keying on id skips/repeats rows.
Unpaged requests still return a flat array, which is what the rails, tag
options and sidebar badge rely on. Client: `useInfinitePosts` +
`VirtualList`/`VirtualFeed` (@tanstack/react-virtual). **The virtualizer needs
a mounted scroll element**, so lists take a `scrollRef` from a thin client
`*-panel.tsx` wrapper (a server component can't hold a ref), and it renders a
plain list until `layout.ready` — otherwise SSR is blank. **Optimistic
updates MUST go through `lib/cache.ts`** (`patchEntryEverywhere`): an entry
lives in both flat arrays and `{pages}`, and patching one shape only makes
votes/bookmarks silently revert.

**Jobs** (migration 0011): real table + seed (`seed_jobs.go`, idempotent on
its own count since the content seed is gated on posts). `GET /api/jobs`
ranks listings per reader — roles overlapping their top tags come first,
carrying `tagRank` ("#1 Go"). Reputation is a SIGNAL, never a gate: a role
above your reputation still lists, it just isn't marked a match. The page
keeps a coming-soon overlay (`LIVE = false` in `app/jobs/page.tsx`) blurring
the REAL board; flip `LIVE` to open it.

**Mobile** (added late — the app was desktop-only): under `md` the sidebar
renders inside an off-canvas drawer (`mobile-nav.tsx`) using the SAME
`Sidebar` component (`variant="drawer"`), never a parallel mobile copy. The
drawer closes on navigation by DERIVING open state from the pathname it was
opened on — `setState` inside an effect trips `react-hooks/set-state-in-effect`,
which this project keeps hitting. It also carries identity + theme toggle,
because the mobile header drops them.

**Universal search**: `GET /api/search?q=` returns posts + people + tags in
one payload (small caps — it backs the ⌘K palette, not a results page). Tags
group case-insensitively so "Go"/"go" are one row.

**Avatars** (migration 0012): optional upload via the existing R2 uploader;
`avatar_url` rides along with EVERY read that carries a handle (feed rows,
replies, post detail, people, search) — showing a photo on the profile while
the feed still showed a sky crop reads as a bug. Falls back to the generated
sky crop. Server requires the URL be from our uploader AND an image.

**Email** (migration 0013): `mail.go` defines a `mailer` interface —
Resend when `RESEND_API_KEY` is set, log-only otherwise, so dev needs no
credentials and nothing escapes to real inboxes. Notification mail mirrors
the in-app events and is sent asynchronously (a failed email must never fail
the mutation). Password resets now actually send. Opt out per user via
`email_notifications`.

**Onboarding**: `onboarding.tsx` — a checklist on the feed driven entirely by
real profile state (bio/posts/answers/reputation), so it can't congratulate
someone for work they haven't done, and it removes itself when complete.
Step one is the profile because posting is gated behind it.

**Suggestions / "For you"** (migration 0015, `users.interests text[]`):
`apps/api/suggestions.go`. Interests are **explicit** (picked in the profile
modal) with a **derived fallback** to `userTopTags` — without the fallback the
feature is blank for exactly the people who need it (new users, who have
neither picked interests nor posted enough to derive them). Stored lowercased
and de-duplicated (`normalizeInterests` in `profile.go`, cap 10 × 40 chars);
"Go"/"go" collapse to one, matching how tags group everywhere else.
**ONE feed, ranked — not a separate section.** `GET /api/posts?sort=foryou`
floats posts matching the reader's interests to the top, everything else
follows newest-first. Nothing is filtered out: interests RANK the feed, they
never gate it (same rule the jobs board follows), and with no interests set
the sort falls through to plain chronological.
**`sort=foryou` must use the OFFSET cursor, not the `(created_at, id)` keyset**
— relevance isn't monotonic, so a keyset boundary skips and repeats rows. The
`keyset` bool in `listPosts` gates both the cursor clause and the `next` value;
verified 14 rows across 5 pages, zero duplicates. The client sends
`sort: "foryou"` from `FeedList`, and **`app/page.tsx` must prefetch the SAME
params** (`infinite({sort:"foryou"})`) or hydration misses and the feed
refetches on mount.
`GET /api/rails/for-you` still returns `{interests, items}` but is now used
only for the interest list in the "Sorted for you" note above the feed
(`for-you.tsx` → `ForYouNote`); `queryKeys.forYou` is a third cache shape that
`lib/cache.ts` patches alongside the flat and paged lists.
`GET /api/tags` backs the picker so users choose real tags instead of
inventing ones that match nothing.

**Feed cards are a FIXED height** — `h-[26rem]` on the card root in
`feed-card.tsx`, never `h-full`. `VirtualFeedGrid` chunks entries into rows
and each row takes its tallest card, so `h-full` only equalises cards WITHIN
one row; cards in different rows still disagreed and left large gaps. A fixed
height is what makes every card match everywhere.
**Only a REAL upload gets a thumbnail** (`entry.image`) — no sky crop, no
generated cover, nothing on a post that never had an image. (Both were tried
and rejected by the owner; do not reintroduce placeholder cover art.) Since
cards are a fixed height either way, whichever element can absorb the slack
takes `flex-1`: the thumbnail when there is one, the excerpt
(`line-clamp-[14]`) when there isn't, which keeps the stat bar on the bottom
edge.
**Line-clamp boxes must match their line-height**: two lines is `2.75em` at
`leading-snug` (1.375, the title) and `3.25em` at `leading-relaxed` (1.625,
the excerpt). `h-[2.6em]` clipped the second line through its middle.
The tag row stays a fixed `h-[1.375rem]` so a card with no tags doesn't shift
the rest. Verified in-browser at spread 0 across: thumbnail/no-thumbnail, no
tags, 12 tags, empty excerpt, 500-word excerpt, and a 25× title.
`ROW_HEIGHT` in `virtual-feed-grid.tsx` (416 card + 16 gap = 432) is the row
box, and the gap is PADDING INSIDE that box (`pb-4`), not a flex `gap` between
boxes — update it if the card height changes. The grid deliberately passes no
`measureElement`: with fixed-height cards there is nothing to measure, and
measuring returned 416 against a real 432 pitch, drifting 16px per row (~4000px
over 1000 posts) which made the scrollbar jump mid-scroll.

**The profile editor opens ANYWHERE** — mounted once in `Shell`, driven by the
module-level store in `lib/edit-profile.ts` (`openEditProfile()`, same
`useSyncExternalStore` pattern as `lib/vote-guard.ts`). It fetches its own data
via `useProfile` instead of taking a server `initial` prop, and re-seeds per
open. There is no `?edit=1` route param any more — editing a bio shouldn't
cost you your place in the feed. Fields split across two tabs: **Profile**
(photo, bio, interests) and **Details** (links, CV, notifications).

**Badges** (`apps/api/badges.go`): derived on read, never stored — same
reasoning as the reputation formula. No table, no backfill, and deleting
content correctly revokes the badge (verified: 3 projects → silver, delete
→ bronze). Tiers are bronze/silver/gold from count thresholds.

## Frontend data layer (React Query)

- **Keys live in `lib/keys.ts`** — a module with NO "use client", imported by
  both server pages and client hooks. Importing values from a client module
  into a server component yields inert proxies (this bit us: `.entry is not a
  function`).
- Server pages prefetch via `lib/api.ts` (cookie-forwarded, server-only) into
  `getQueryClient()` and wrap in `<HydrationBoundary>`; client components read
  the same keys via hooks in `lib/queries.ts` (credentials: include).
- Mutations in `lib/mutations.ts`; components use `useMutation` with
  optimistic cache updates + invalidation. 401 → `router.push("/login")`.
- Never hold server data in `useState` — the cache is the source of truth.

## Auth guard

Two layers, both required:
1. **`src/proxy.ts`** (Next 16 renamed `middleware.ts` → `proxy.ts`; the old
   name is silently ignored) — bounces requests without a `chelaa_session`
   cookie to `/login?next=<path>`; sends signed-in users away from `/login`.
   Checks cookie PRESENCE only.
2. **`requireAuth()`** (`lib/api.ts`) at the top of every protected page —
   validates the session against the API, so forged cookies die here.
Public paths: `/login`, `/forgot-password`, `/reset-password`. New pages are
protected by default (proxy matcher) but must also call `requireAuth()`
(client pages via a server `layout.tsx`, like `/ui`). The login page honours
`?next=` (same-origin paths only).

Hardening decisions (do not undo):
- **Never redirect away from `/login` based on cookie presence** — a stale
  cookie loops forever (`/login → / → requireAuth → /login`). The login page
  sends VALIDATED sessions home via `useMe` instead.
- The availability endpoint checks handles only — an email variant would let
  anyone enumerate registered emails.
- Login burns a bcrypt compare on unknown accounts (timing oracle).
- Credential endpoints are rate-limited (10/min/IP, in-memory, bounded map).
  IP = `RemoteAddr` unless `TRUST_PROXY=1` (then first `X-Forwarded-For` hop —
  only set behind a trusted reverse proxy, or clients can spoof buckets).
- CSRF defence in depth: unsafe methods with a mismatched `Origin` header are
  rejected 403 (requests without Origin — curl, server-side — pass).
- `requireAuth(next)` preserves the destination through the layer-2 redirect;
  dynamic pages resolve `params` first so they can pass their real path.
- Cookies gain `Secure` via `COOKIE_SECURE=1` (set in production).
- Expired sessions/reset tokens are purged on API boot.

## Sound

Effects live in `apps/web/src/lib/sound/`. Import from `@/lib/sound`.
Respects a persisted mute preference; never play sound unprompted on load.

## Conventions

- pnpm workspaces; run scripts from the repo root (`pnpm --filter web …`).
- `pnpm build` and `pnpm lint` must both pass before work is considered done.
- Go module is separate from the pnpm workspace; no `go.work`.

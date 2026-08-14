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
  aren't built yet (questions, projects, jobs, leaderboard, people, saved).
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
  **⚠️ The current image is copied from aside.com and is their artwork.
  Replace it with owned or permissively-licensed art before public launch.**
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
Data pages (`/`, `/questions`, `/projects`, `/post/[id]`) are
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
**Media lightbox**: `components/ui/media-viewer.tsx` (`MediaTrigger` wraps
any thumbnail/link; kind inferred from extension — image/pdf/video). Feed
thumbnails and the post hero render as `background-image` divs (user prefers
bg-cover over `<img>`), wrapped in `MediaTrigger`; the CV opens in the
viewer, not a new tab. **Posting gate**: `createPost` returns 403 until the
user has at least one profile detail (bio, link or CV) — the composer shows
a "Complete your profile to post" link and disables Publish (server check is
authoritative).

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

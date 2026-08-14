# Chelaa

Monorepo for Chelaa.tech.

## Stack

| Part     | Tech                                          |
| -------- | --------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind v4, TypeScript |
| UI       | Headless UI 2 + custom components, Geist / Geist Mono |
| Backend  | Go 1.25, stdlib `net/http`, pgx/v5             |
| Database | PostgreSQL 17 (Docker)                         |

## Layout

```
.
├── apps/
│   ├── web/          # Next.js app (pnpm workspace)
│   └── api/          # Go API (own go.mod)
├── docker-compose.yml  # Postgres only
├── pnpm-workspace.yaml
└── Makefile
```

## Getting started

```bash
cp .env.example .env
make install     # pnpm install + go mod download
make db          # start Postgres in Docker
make api         # Go API on :4120
make web         # Next.js on :4100
```

`make api` and `make web` run in the foreground — use separate terminals.

## Endpoints

- `GET /healthz` — API liveness + Postgres ping.
- `GET /api/posts` — the feed, newest first (JSON matches the frontend's `FeedEntry`).
- `GET /api/posts/{id}` — full entry: body blocks + discussion, accepted answers first.

Migrations are embedded SQL applied on boot; the seed is idempotent (no-op
once data exists). The web app's data pages require the API + Postgres running.

```bash
curl localhost:4120/healthz
# {"db":"up","status":"ok"}
```

## Design system

Tokens are derived from [aside.com](https://aside.com): a neutral/monochrome
base with a sky brand accent. All tokens live in `apps/web/src/app/globals.css`.

| Token | Light | Dark |
| ----- | ----- | ---- |
| `--background` | `#ffffff` | `#0a0a0a` |
| `--foreground` | `#090b0c` | `#fafafa` |
| `--card` | `#ffffff` | `#171717` |
| `--muted-foreground` | `#737373` | `#a1a1a1` |
| `--brand` | `#00a5ef` (sky-500) | `#00bcfe` (sky-400) |
| `--border` | `#e5e5e5` | `white / 10%` |

- **Radius:** `--radius: 0.625rem`, with `sm`/`md`/`lg`/`xl` derived from it.
- **Squircles:** `corner-shape: superellipse(1.4)` is applied to rounded
  utilities — the most recognizable trait of the Aside look. It sits behind an
  `@supports` guard, so unsupporting browsers fall back to normal rounding.
  Opt out on a single element with `.no-squircle`.
- **Type:** Geist (body + headings) and Geist Mono. Aside's display face is
  proprietary, so headings use Geist with `font-semibold tracking-tight`.
- **Theme:** light is the default. Dark applies only when the user explicitly
  chooses it — the OS `prefers-color-scheme` does not override the default.
  An inline script in `layout.tsx` applies it before first paint (no flash).

### Control sizing (important)

Every interactive control — `Button`, `Input`, `Select`, `Combobox`, dropdown
triggers — imports its geometry from **`src/components/ui/control.ts`**. That is
the single source of truth, so a row of mixed controls lines up exactly: same
height, same horizontal padding, same radius, same type scale, at every
breakpoint.

| Size | Mobile | ≥ `md` |
| ---- | ------ | ------ |
| `sm` | `h-8 px-2.5 text-xs` | `h-9 px-2.5 text-sm` |
| `md` (default) | `h-9 px-2.5 text-sm` | `h-10 px-3 text-base` |
| `lg` | `h-11 px-4 text-base` | `h-12 px-5 text-base` |

**Never hardcode a height, padding or radius on a control.** If a new size is
needed, add it to `control.ts` so every control gains it at once. This is what
prevents the classic drift where one input is 45px tall and another is 20px.

Icon-only buttons use `<Button iconOnly>`, which picks the matching square size.

### Buttons

Geometry comes from the shared control scale above, which was taken from
Aside's own hero button rather than approximated.

- **Label weight is `450`** — between normal and medium, as Aside sets it.
- **Press feedback:** `active:scale-95`.
- **Shape:** `shape="squircle"` (default, `rounded-xl` + superellipse) or
  `shape="pill"` (`rounded-full`, used for Aside's hero CTA).

### Icons

[Solar Icons](https://solar-icons.vercel.app/icons) via `@solar-icons/react`
(MIT; icons CC BY 4.0). We use the **Bold Duotone** style throughout:

```tsx
import { CupIcon } from "@solar-icons/react/bold-duotone";

<CupIcon size={16} className="text-brand" />
```

- Import from `@solar-icons/react/bold-duotone` so imports stay tree-shaken —
  1,246 icons ship in the package, but only what you import is bundled.
- Naming maps kebab-case to Pascal + `Icon`: `cup-star` → `CupStarIcon`.
- `color` defaults to `currentColor`, so icons inherit their container's text
  colour and our tokens drive them for free (`text-muted-foreground`,
  `text-brand`, …). Avoid hardcoding a `color` prop.
- Defaults are set once in `IconProvider` (`src/components/icon-provider.tsx`),
  wired into the root layout. The duotone layer sits at `secondaryOpacity: 0.35`;
  pass `secondaryColor="var(--brand)"` on an icon for a two-tone accent.

### Surfaces

Aside builds panels with **hairline rings, not borders** — `ring-[0.5px]` plus a
soft shadow over a layered surface token. The ring renders sub-pixel on retina
displays, which is what makes panels read as crisp and floating rather than
boxy. `Card` uses this; reach for it on any elevated surface:

```
bg-surface-primary rounded-2xl
ring-[0.5px] ring-border-surface-strong
shadow-sm shadow-black/5
```

Three surface tiers are available (`--surface-primary` / `-secondary` /
`-tertiary`), increasingly translucent, for stacking panels over one another.

Components in `apps/web/src/components/ui/` wrap Headless UI primitives, so
accessibility behavior (focus traps, ARIA, keyboard nav) comes from the library
while styling comes from the tokens above. The home page renders every one of
them as a living reference.

## Notes

- Only Postgres is containerized; the API and web run natively for fast reloads.
- The API allows CORS from `CORS_ORIGIN` (default `http://localhost:4100`).
- `.env` is gitignored; `.env.example` is the template.
- No migrations tooling or auth yet — schema and features are still to come.

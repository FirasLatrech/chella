# syntax=docker/dockerfile:1

# Built from the REPO ROOT (see docker-compose.prod.yml) because this is a
# pnpm workspace — the lockfile and workspace manifest live above this
# directory and are needed for a frozen install.

# --- dependencies --------------------------------------------------------
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /repo

# Manifests only: this layer survives every source edit.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter web...

# --- build ---------------------------------------------------------------
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .

# The API base URL is inlined into the client bundle at build time, so it
# must be supplied as a build arg rather than a runtime env var.
ARG NEXT_PUBLIC_API_URL=http://localhost:4120
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web build

# --- runtime -------------------------------------------------------------
FROM node:22-alpine AS runtime
RUN addgroup -g 10001 -S chelaa && adduser -S -u 10001 -G chelaa chelaa
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=4100

# `output: "standalone"` bundles a minimal server plus only the modules the
# app actually reaches, so the full node_modules never ships.
COPY --from=build --chown=chelaa:chelaa /repo/apps/web/.next/standalone ./
COPY --from=build --chown=chelaa:chelaa /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=chelaa:chelaa /repo/apps/web/public ./apps/web/public

USER chelaa
EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4100/login >/dev/null || exit 1

# Standalone keeps the workspace layout, so the server entrypoint sits under
# the app's own path.
CMD ["node", "apps/web/server.js"]

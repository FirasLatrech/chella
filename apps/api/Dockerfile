# syntax=docker/dockerfile:1

# --- build ---------------------------------------------------------------
FROM golang:1.25-alpine AS build
WORKDIR /src

# Dependencies first: this layer is cached until go.mod/go.sum change, so
# ordinary code edits skip the module download entirely.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
# CGO off produces a static binary that runs on a scratch-like base.
# Trimpath and stripped symbols keep the artefact small and reproducible.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api .

# --- runtime -------------------------------------------------------------
FROM alpine:3.21 AS runtime

# ca-certificates: the API calls Cloudflare R2 and the mail provider over
# TLS, both of which fail without a trust store.
RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 10001 chelaa

WORKDIR /app
COPY --from=build /out/api /app/api

# Uploads fall back to local disk when R2 is unconfigured; give that a home
# the non-root user can actually write to.
RUN mkdir -p /app/uploads && chown -R chelaa:chelaa /app

USER chelaa
EXPOSE 4120
ENV PORT=4120

# Migrations and the seed run on boot inside the process, so there is no
# separate migration step to sequence in the deploy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4120/healthz || exit 1

ENTRYPOINT ["/app/api"]

.PHONY: db db-down api web install seed-load seed-load-undo

install:
	pnpm install
	cd apps/api && go mod download

db:
	docker compose up -d

db-down:
	docker compose down

# SEED_DEMO=1 is set here, not in the API's defaults: demo users share a
# password published in this repo, so a real deployment must never get them
# just by starting the binary. `make api` is the dev entry point, so it opts in.
api:
	cd apps/api && SEED_DEMO=1 go run .

web:
	pnpm --filter web dev

# Load-test data (TEST ONLY) — 1000 synthetic posts at id >= 100000.
seed-load:
	docker exec -i chelaa-postgres psql -U chelaa -d chelaa -v ON_ERROR_STOP=1 < scripts/seed-load-test.sql

seed-load-undo:
	docker exec -i chelaa-postgres psql -U chelaa -d chelaa -v ON_ERROR_STOP=1 < scripts/seed-load-test-undo.sql

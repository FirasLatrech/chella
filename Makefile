.PHONY: db db-down api web install

install:
	pnpm install
	cd apps/api && go mod download

db:
	docker compose up -d

db-down:
	docker compose down

api:
	cd apps/api && go run .

web:
	pnpm --filter web dev

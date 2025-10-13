.PHONY: help dev up down logs api worker web db-migrate db-revise db-upgrade db-downgrade db-shell codegen lint fmt test ci postgres-start postgres-stop nats-start nats-stop

PROJECT=planet
NATS_PID=infra/nats.pid

help:
	@echo "$(PROJECT) - Available Commands"
	@echo "===================================="
	@echo "make dev           - Start core services (Postgres 18 via Homebrew, NATS)"
	@echo "make up            - Alias to dev (no Docker)"
	@echo "make down          - Stop NATS and Postgres services"
	@echo "make logs          - Show NATS status and Postgres service info"
	@echo "make api           - Run API service locally (dev)"
	@echo "make worker        - Run worker service locally (dev)"
	@echo "make web           - Run web app locally (dev)"
	@echo "make db-migrate    - Generate Alembic revision (requires msg=\"...\")"
	@echo "make db-upgrade    - Apply DB migrations"
	@echo "make db-downgrade  - Revert last migration"
	@echo "make db-shell      - PSQL shell into Postgres"
	@echo "make codegen       - Generate clients from OpenAPI spec"
	@echo "make lint          - Lint all packages/services"
	@echo "make fmt           - Format all packages/services"
	@echo "make test          - Run tests (unit + e2e placeholders)"
	@echo "make ci            - CI placeholder"

dev: up

up: postgres-start nats-start

down: nats-stop postgres-stop

logs:
	@echo "Postgres service status:" && brew services list | grep postgresql@18 || true
	@echo "NATS status (pid file):" && test -f $(NATS_PID) && (echo running with PID `cat $(NATS_PID)`) || echo not running

postgres-start:
	@brew list postgresql@18 >/dev/null 2>&1 || brew install postgresql@18
	@brew services start postgresql@18
	@createdb planet 2>/dev/null || true

postgres-stop:
	@brew services stop postgresql@18 || true

nats-start:
	@brew list nats-server >/dev/null 2>&1 || brew install nats-server
	@test -f $(NATS_PID) && kill -0 `cat $(NATS_PID)` 2>/dev/null && echo "NATS already running (PID `cat $(NATS_PID)`)" || (nohup nats-server -p 4222 -m 8222 >/dev/null 2>&1 & echo $$! > $(NATS_PID) && echo "Started NATS (PID `cat $(NATS_PID)`)" )

nats-stop:
	@test -f $(NATS_PID) && (kill `cat $(NATS_PID)` 2>/dev/null || true; rm -f $(NATS_PID)) || true

api:
	@echo "TODO: start FastAPI dev server (uvicorn)"

worker:
	@echo "TODO: start worker"

web:
	@echo "TODO: start Next.js dev server"

db-migrate:
	@test -n "$(msg)" || (echo "Usage: make db-migrate msg=\"your message\"" && exit 1)
	@echo "Generating Alembic revision: $(msg)"
	@alembic -c db/alembic.ini revision -m "$(msg)"

db-upgrade:
	@alembic -c db/alembic.ini upgrade head

db-downgrade:
	@alembic -c db/alembic.ini downgrade -1

db-shell:
	@psql postgres://postgres:postgres@localhost:5432/planet

codegen:
	@echo "Generating TS client from OpenAPI..."
	@npx -y openapi-typescript openapi/spec.yaml -o packages/shared-types/ts/index.ts
	@echo "Generating Go client from OpenAPI..."
	@echo "(placeholder)"
	@echo "Generating Python client from OpenAPI..."
	@echo "(placeholder)"

lint:
	@echo "Run linters (placeholder)"

fmt:
	@echo "Run formatters (placeholder)"

test:
	@echo "Run tests (placeholder)"

ci:
	@echo "CI local placeholder"

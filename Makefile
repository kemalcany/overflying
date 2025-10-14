.PHONY: help dev up down logs clean api worker web db-migrate db-revise db-upgrade db-downgrade db-shell db-query codegen lint fmt test ci venv

PROJECT=planet
COMPOSE=cd infra && docker compose

help:
	@echo "$(PROJECT) - Available Commands"
	@echo "===================================="
	@echo "make dev           - Start core services (Docker Compose: Postgres 18, NATS)"
	@echo "make up            - Start all services (compose)"
	@echo "make down          - Stop all services"
	@echo "make logs          - Tail compose logs"
	@echo "make clean         - Kill all running service processes (API, worker, web)"
	@echo "make api           - Run API service locally (dev)"
	@echo "make worker        - Run worker service locally (dev)"
	@echo "make web           - Run web app locally (dev)"
	@echo "make db-migrate    - Generate Alembic revision (requires msg=\"...\")"
	@echo "make db-upgrade    - Apply DB migrations"
	@echo "make db-downgrade  - Revert last migration"
	@echo "make db-shell      - PSQL shell into Postgres"
	@echo "make db-query      - Run a simple SELECT on jobs"
	@echo "make venv          - Create local Python venv with Alembic"
	@echo "make codegen       - Generate clients from OpenAPI spec"
	@echo "make lint          - Lint all packages/services"
	@echo "make fmt           - Format all packages/services"
	@echo "make test          - Run tests (unit + e2e placeholders)"
	@echo "make ci            - CI placeholder"

dev: up

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=200

clean:
	@echo "Killing all service processes..."
	@-pkill -9 -f "uvicorn" 2>/dev/null || true
	@-pkill -9 -f "python3 src/run.py" 2>/dev/null || true
	@-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "All services stopped."

api:
	@cd apps/api && python3 -m src.run

worker:
	@cd apps/worker && python3 src/main.py

web:
	@echo "TODO: start Next.js dev server"

VENV=.venv
ACTIVATE=. $(VENV)/bin/activate

venv:
	@test -d $(VENV) || (python3 -m venv $(VENV) && $(ACTIVATE) && pip install --upgrade pip && pip install alembic SQLAlchemy psycopg2-binary)

db-migrate:
	@test -n "$(msg)" || (echo "Usage: make db-migrate msg=\"your message\"" && exit 1)
	@echo "Generating Alembic revision: $(msg)"
	@bash -lc 'export PGHOST=$(PGDATA) PGPORT=5432; source $(VENV)/bin/activate; alembic -c db/alembic.ini revision -m "$(msg)"'

db-upgrade:
	@bash -lc 'export PGHOST=$(PGDATA) PGPORT=5432; source $(VENV)/bin/activate; alembic -c db/alembic.ini upgrade head'

db-downgrade:
	@bash -lc 'export PGHOST=$(PGDATA) PGPORT=5432; source $(VENV)/bin/activate; alembic -c db/alembic.ini downgrade -1'

db-shell:
	@psql -d planet

db-query:
	@psql -d planet -c "SELECT * FROM jobs ORDER BY created_at DESC;"

codegen:
	@echo "Generating TS client from OpenAPI..."
	@npx -y openapi-typescript openapi/spec.yaml -o packages/shared-types/ts/index.ts
	@echo "Generating Go client from OpenAPI..."
	@echo "(placeholder)"
	@echo "Generating Python client from OpenAPI..."
	@echo "(placeholder)"

lint:
	@echo "Running Ruff linter..."
	@ruff check apps/api/src apps/worker/src 2>/dev/null || true
	@echo "Linting complete!"

fmt:
	@echo "Running Ruff formatter..."
	@ruff format apps/api/src apps/worker/src 2>/dev/null || true
	@ruff check --fix apps/api/src apps/worker/src 2>/dev/null || true
	@echo "Formatting complete!"

test:
	@echo "Run tests (placeholder)"

ci:
	@echo "CI local placeholder"

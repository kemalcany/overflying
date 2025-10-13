.PHONY: help dev up down logs api worker web db-migrate db-revise db-upgrade db-downgrade db-shell codegen lint fmt test ci

PROJECT=planet
COMPOSE=cd infra && docker compose

help:
	@echo "$(PROJECT) - Available Commands"
	@echo "===================================="
	@echo "make dev           - Start core services (Postgres 18, NATS)"
	@echo "make up            - Start all services (compose)"
	@echo "make down          - Stop all services"
	@echo "make logs          - Tail compose logs"
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

dev:
	$(COMPOSE) up -d postgres nats

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=200

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

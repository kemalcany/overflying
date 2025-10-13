.PHONY: help dev up down logs api worker web db-migrate db-revise db-upgrade db-downgrade db-shell codegen lint fmt test ci postgres-start postgres-stop nats-start nats-stop venv

PROJECT=planet
NATS_PID=infra/nats.pid
BREW_PREFIX:=$(shell brew --prefix)
PGDATA=$(BREW_PREFIX)/var/postgresql@18
PGBIN=$(BREW_PREFIX)/opt/postgresql@18/bin

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
	@echo "make venv          - Create local Python venv with Alembic"
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
	@echo "Starting Postgres 18 with explicit binaries at $(PGBIN)"
	@mkdir -p $(PGDATA)
	@test -f $(PGDATA)/PG_VERSION || $(PGBIN)/initdb -D $(PGDATA) -E UTF-8 --locale=en_US.UTF-8
	@# If already running, succeed silently; else try to start
	@($(PGBIN)/pg_ctl -D $(PGDATA) status >/dev/null 2>&1 && echo "Postgres already running") \
	  || ( $(PGBIN)/pg_ctl -D $(PGDATA) -l $(PGDATA)/server.log start || true )
	@# Treat readiness as success even if pg_ctl reported already running
	@$(PGBIN)/pg_isready -q -h $(PGDATA) -p 5433 || (echo "Postgres not ready; see $(PGDATA)/server.log" && exit 1)
	@PGHOST=$(PGDATA) PGPORT=5433 $(PGBIN)/createdb planet 2>/dev/null || true

postgres-stop:
	@$(PGBIN)/pg_ctl -D $(PGDATA) stop -m fast || true

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

VENV=.venv
ACTIVATE=. $(VENV)/bin/activate

venv:
	@test -d $(VENV) || (python3 -m venv $(VENV) && $(ACTIVATE) && pip install --upgrade pip && pip install alembic SQLAlchemy psycopg2-binary)

db-migrate:
	@test -n "$(msg)" || (echo "Usage: make db-migrate msg=\"your message\"" && exit 1)
	@echo "Generating Alembic revision: $(msg)"
	@$(ACTIVATE) && alembic -c db/alembic.ini revision -m "$(msg)"

db-upgrade:
	@PGHOST=$(PGDATA) PGPORT=5433 $(ACTIVATE) && alembic -c db/alembic.ini upgrade head

db-downgrade:
	@PGHOST=$(PGDATA) PGPORT=5433 $(ACTIVATE) && alembic -c db/alembic.ini downgrade -1

db-shell:
	@PGHOST=$(PGDATA) PGPORT=5433 $(PGBIN)/psql -d planet

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

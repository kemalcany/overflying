.PHONY: help dev up down logs clean api worker web venv
.PHONY: db-migrate db-upgrade db-downgrade db-shell db-query db-init
.PHONY: db-local-shell db-local-query
.PHONY: db-staging-init db-staging-migrate db-staging-upgrade db-staging-proxy
.PHONY: db-prod-init db-prod-migrate db-prod-upgrade db-prod-proxy
.PHONY: openapi-sync openapi-validate openapi-diff codegen lint fmt test ci
.PHONY: test-db-up test-db-down test-api test-worker

PROJECT=planet
COMPOSE=cd infra && docker compose

# Environment management (default: development)
ENV ?= development
ALEMBIC_CONFIG = db/alembic.ini

# Root environment files (shared across all apps)
ifeq ($(ENV),local)
	ROOT_ENV = .env.local
else ifeq ($(ENV),staging)
	ROOT_ENV = .env.staging
else ifeq ($(ENV),production)
	ROOT_ENV = .env.production
else
	ROOT_ENV = .env.development
endif

# Helper function to load env files (root + optional override)
# Usage: $(call load_env,app_name)
define load_env
	@set -a; \
	[ -f $(ROOT_ENV) ] && . $(ROOT_ENV); \
	[ -f apps/$(1)/.env.$(ENV).override ] && . apps/$(1)/.env.$(ENV).override; \
	set +a
endef

help:
	@echo "$(PROJECT) - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Environment: $(ENV) (override with ENV=local|staging|production)"
	@echo ""
	@echo "Infrastructure (Docker):"
	@echo "  make dev           - Start core services (Docker Compose: Postgres 18, NATS)"
	@echo "  make up            - Start all services (compose)"
	@echo "  make down          - Stop all services"
	@echo "  make logs          - Tail compose logs"
	@echo ""
	@echo "Services (Local Development):"
	@echo "  make clean         - Kill all running service processes (API, worker, web)"
	@echo "  make api [ENV=...]         - Run API service (default: development)"
	@echo "  make worker [ENV=...]      - Run worker service (default: development)"
	@echo "  make web           - Run web app locally (dev)"
	@echo ""
	@echo "Database Commands (Environment-aware):"
	@echo "  make db-init [ENV=...]       - Initialize database (development/staging/production)"
	@echo "  make db-migrate msg=\"...\" [ENV=...]  - Generate migration"
	@echo "  make db-upgrade [ENV=...]    - Apply migrations"
	@echo "  make db-downgrade [ENV=...]  - Revert migration"
	@echo ""
	@echo "Cloud SQL Proxy (Staging/Production):"
	@echo "  make db-staging-proxy   - Start Cloud SQL proxy for staging (port 5433)"
	@echo "  make db-prod-proxy      - Start Cloud SQL proxy for production (port 5434)"
	@echo ""
	@echo "Development Tools:"
	@echo "  make venv          - Create local Python venv with Alembic"
	@echo "  make openapi-sync      - Sync spec from running API"
	@echo "  make openapi-validate  - Validate spec.yaml"
	@echo "  make openapi-diff      - Check if spec matches running API"
	@echo "  make codegen           - Generate TS types from spec"
	@echo "  make lint          - Lint all packages/services"
	@echo "  make fmt           - Format all packages/services"
	@echo "  make ci            - CI placeholder"
	@echo ""
	@echo "Testing:"
	@echo "  make test-db-up    - Start test database (Docker)"
	@echo "  make test-db-down  - Stop test database"
	@echo "  make test-api      - Run API tests (starts test DB if needed)"
	@echo "  make test-worker   - Run worker tests (placeholder)"
	@echo "  make test          - Run all tests"	

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
	@-pkill -9 -f "python3 src/main.py" 2>/dev/null || true
	@-pkill -9 -f "apps/worker" 2>/dev/null || true
	@-pkill -9 -f "apps/api" 2>/dev/null || true
	@-pkill -9 -f "bun.*next" 2>/dev/null || true
	@-pkill -9 -f "node.*next" 2>/dev/null || true
	@-pkill -9 -f "nats-server" 2>/dev/null || true
	@-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:4222 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8222 | xargs kill -9 2>/dev/null || true	
	@echo "All services stopped."

api:
	@echo "Starting API with environment: $(ENV)"
	$(call load_env,api); \
	cd apps/api && python3 -m src.run

worker:
	@echo "Starting Worker with environment: $(ENV)"
	$(call load_env,worker); \
	cd apps/worker && python3 src/main.py

globe:
	@echo "Starting Globe with environment: $(ENV)"
	$(call load_env,globe); \
	cd apps/globe && npm run dev

web:
	@cd apps/web && bun run dev

VENV=.venv
ACTIVATE=. $(VENV)/bin/activate

venv:
	@test -d $(VENV) || (python3 -m venv $(VENV) && $(ACTIVATE) && pip install --upgrade pip && pip install alembic SQLAlchemy psycopg2-binary)
	@echo "Dont forget to manually activate the venv with: source $(VENV)/bin/activate"

# ============================================================================
# Database Commands (Docker - Recommended)
# ============================================================================
# Uses containerized Postgres on localhost:5432
# Accessible across all repos (api, worker, etc)

# Use once

db-init:
	@echo "Initializing database for environment: $(ENV)..."
	@set -a; . $(ROOT_ENV); set +a; \
	psql $$(echo $$DATABASE_URL | sed 's/postgresql+psycopg2/postgresql/') -c \
	"CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(64) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num));"
	@echo "✓ Database initialized for $(ENV)"

db-migrate:
	@test -n "$(msg)" || (echo "Usage: make db-migrate msg=\"your message\" [ENV=...]" && exit 1)
	@echo "Generating Alembic revision for $(ENV): $(msg)"
	@set -a; . $(ROOT_ENV); set +a; \
	bash -lc 'source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) revision -m "$(msg)"'

db-upgrade:
	@echo "Applying DB migrations for $(ENV)..."
	@set -a; . $(ROOT_ENV); set +a; \
	bash -lc 'source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) upgrade head'
	@echo "✓ Migrations applied for $(ENV)"

db-downgrade:
	@echo "Reverting last migration for $(ENV)..."
	@set -a; . $(ROOT_ENV); set +a; \
	bash -lc 'source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) downgrade -1'

db-staging-proxy:
	@echo "Starting Cloud SQL Proxy for staging..."
	@cloud-sql-proxy overflying-db:us-central1:planet-staging --port 5433

db-prod-proxy:
	@echo "Starting Cloud SQL Proxy for production..."
	@cloud-sql-proxy overflying-db:us-central1:planet-production --port 5434

# Not used currently
db-local-shell:
	@echo "Connecting to local Postgres..."
	@psql -d planet

# Not used currently
db-local-query:
	@echo "Querying jobs from local Postgres..."
	@psql -d planet -c "SELECT * FROM jobs ORDER BY created_at DESC;"

# Not used currently
openapi-diff:
	@echo "Checking if manual spec matches API..."
	@curl -s http://localhost:8000/openapi.json > /tmp/openapi-live.json
	@python3 openapi/openapi-diff.py
	@rm -f /tmp/openapi-live.json

# Not used currently
openapi-validate:
	@echo "Validating OpenAPI spec..."
	@npx -y @redocly/cli lint openapi/spec-generated.json --config openapi/.redocly.yaml || true	

# Used currently
openapi-sync:
	@echo "Syncing OpenAPI spec from FastAPI..."
	@curl -s http://localhost:8000/openapi.json | python3 -m json.tool > openapi/spec-generated.json
	@echo "✓ Spec synced to spec-generated.json (spec.yaml unchanged)"

# Used currently
codegen:
	@echo "Generating TS types from OpenAPI..."
	@npx -y openapi-typescript openapi/spec-generated.json -o packages/shared-types/ts/index.ts
	@echo "✓ TS types generated"

lint:
	@echo "Running Ruff linter..."
	@ruff check apps/api/src apps/worker/src 2>/dev/null || true
	@echo "Linting complete!"

fmt:
	@echo "Running Ruff formatter..."
	@ruff format apps/api/src apps/worker/src 2>/dev/null || true
	@ruff check --fix apps/api/src apps/worker/src 2>/dev/null || true
	@echo "Formatting complete!"

test-db-up:
	@echo "Starting test database..."
	@cd apps/api && docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for test DB to be ready..."
	@sleep 3
	@docker exec constellation-test-db pg_isready -U test || (echo "Test DB not ready" && exit 1)
	@echo "✓ Test database ready"

test-db-down:
	@echo "Stopping test database..."
	@cd apps/api && docker compose -f docker-compose.test.yml down
	@echo "✓ Test database stopped"

test-api: test-db-up
	@echo "Running API tests..."
	@cd apps/api && python3 -m pip install -q -e ".[dev]" && \
			TEST_DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" pytest
	@echo "✓ API tests complete"

test-worker:
	@echo "Running worker tests (placeholder)..."
	@cd apps/worker && echo "No tests yet"

test: test-api test-worker
	@echo "✓ All tests complete"

ci:
	@echo "CI local placeholder"

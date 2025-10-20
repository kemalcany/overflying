.PHONY: help dev up down logs clean api worker web venv
.PHONY: db-migrate db-upgrade db-downgrade db-shell db-query
.PHONY: db-local-migrate db-local-upgrade db-local-downgrade db-local-shell db-local-query
.PHONY: openapi-sync openapi-validate openapi-diff codegen lint fmt test ci
.PHONY: test-db-up test-db-down test-api test-worker

PROJECT=planet
COMPOSE=cd infra && docker compose

help:
	@echo "$(PROJECT) - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Infrastructure (Docker):"
	@echo "  make dev           - Start core services (Docker Compose: Postgres 18, NATS)"
	@echo "  make up            - Start all services (compose)"
	@echo "  make down          - Stop all services"
	@echo "  make logs          - Tail compose logs"
	@echo ""
	@echo "Services (Local Development):"
	@echo "  make clean         - Kill all running service processes (API, worker, web)"
	@echo "  make api           - Run API service locally (dev)"
	@echo "  make worker        - Run worker service locally (dev)"
	@echo "  make web           - Run web app locally (dev)"
	@echo ""
	@echo "Database (Docker - Recommended):"
	@echo "  make db-init       - Initialize database (create alembic_version table)"
	@echo "  make db-migrate    - Generate Alembic revision (requires msg=\"...\")"
	@echo "  make db-upgrade    - Apply DB migrations"
	@echo "  make db-downgrade  - Revert last migration"
	@echo "  make db-shell      - PSQL shell into Docker Postgres"
	@echo "  make db-query      - Run a simple SELECT on jobs"
	@echo ""
	@echo "Database (Local Postgres):"
	@echo "  make db-local-migrate    - Generate Alembic revision (requires msg=\"...\")"
	@echo "  make db-local-upgrade    - Apply DB migrations"
	@echo "  make db-local-downgrade  - Revert last migration"
	@echo "  make db-local-shell      - PSQL shell into local Postgres"
	@echo "  make db-local-query      - Run a simple SELECT on jobs"
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
	@cd apps/api && python3 -m src.run

worker:
	@cd apps/worker && python3 src/main.py

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

db-init:
	@echo "Initializing database..."
	@PGPASSWORD=postgres psql -h localhost -U postgres -d planet -c \
			"CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(64) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num));"
	@echo "✓ Database initialized"

db-migrate:
	@test -n "$(msg)" || (echo "Usage: make db-migrate msg=\"your message\"" && exit 1)
	@echo "Generating Alembic revision (Docker): $(msg)"
	@bash -lc 'source $(VENV)/bin/activate; alembic -c db/alembic.ini revision -m "$(msg)"'

db-upgrade:
	@echo "Applying DB migrations (Docker)..."
	@bash -lc 'source $(VENV)/bin/activate; alembic -c db/alembic.ini upgrade head'

db-downgrade:
	@echo "Reverting last migration (Docker)..."
	@bash -lc 'source $(VENV)/bin/activate; alembic -c db/alembic.ini downgrade -1'

db-shell:
	@echo "Connecting to Docker Postgres..."
	@PGPASSWORD=postgres psql -h localhost -U postgres -d planet

db-query:
	@echo "Querying jobs from Docker Postgres..."
	@PGPASSWORD=postgres psql -h localhost -U postgres -d planet -c "SELECT * FROM jobs ORDER BY created_at DESC;"

# ============================================================================
# Database Commands (Local Postgres)
# ============================================================================
# Uses local Postgres installation via Unix socket

db-local-migrate:
	@test -n "$(msg)" || (echo "Usage: make db-local-migrate msg=\"your message\"" && exit 1)
	@echo "Generating Alembic revision (Local): $(msg)"
	@bash -lc 'source $(VENV)/bin/activate; alembic -c db/alembic.local.ini revision -m "$(msg)"'

db-local-upgrade:
	@echo "Applying DB migrations (Local)..."
	@bash -lc 'source $(VENV)/bin/activate; alembic -c db/alembic.local.ini upgrade head'

db-local-downgrade:
	@echo "Reverting last migration (Local)..."
	@bash -lc 'source $(VENV)/bin/activate; alembic -c db/alembic.local.ini downgrade -1'

db-local-shell:
	@echo "Connecting to local Postgres..."
	@psql -d planet

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

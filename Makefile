.PHONY: help up down logs clean api worker web venv
.PHONY: db-migrate db-upgrade db-downgrade db-stamp db-shell db-query db-init
.PHONY: db-local-shell db-local-query
.PHONY: db-staging-init db-staging-migrate db-staging-upgrade db-staging-proxy
.PHONY: db-prod-init db-prod-migrate db-prod-upgrade db-prod-proxy
.PHONY: openapi-sync openapi-validate openapi-diff codegen lint fmt test ci
.PHONY: test-db-up test-db-down test-api test-worker test-web
.PHONY: demo-nats demo-nats-install demo-nats-check demo-all nats-monitor
.PHONY: nats-purge nats-info
.PHONY: gcp-auth gcp-deploy-all gcp-deploy-nats gcp-deploy-worker
.PHONY: gcp-status gcp-logs-api gcp-logs-worker gcp-logs-nats
.PHONY: test-api-local test-worker-local test-all-local

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
	@echo "NATS Demo (Quick Start):"
	@echo "  make demo-nats-install     - Install dependencies (one-time setup)"
	@echo "  make demo-nats-check       - Check all services are ready"
	@echo "  make demo-all              - Start all services in background + run demo"
	@echo "  make demo-nats             - Run NATS integration demo script"
	@echo "  make nats-monitor          - Monitor NATS stream in real-time"
	@echo ""
	@echo "Database Commands (Environment-aware):"
	@echo "  make db-init [ENV=...]       - Initialize database (development/staging/production)"
	@echo "  make db-migrate msg=\"...\" [ENV=...]  - Generate migration"
	@echo "  make db-upgrade [ENV=...]    - Apply migrations"
	@echo "  make db-downgrade [ENV=...]  - Revert migration"
	@echo "  make db-stamp rev=\"...\" [ENV=...]   - Stamp database to specific revision"
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
	@echo "  make test-web      - Run Web tests"
	@echo "  make test-worker   - Run worker tests (placeholder)"
	@echo "  make test          - Run all tests"
	@echo ""
	@echo "Local Testing (Plan A - Shared Infrastructure):"
	@echo "  make test-api-local    - Start API test infrastructure (shared DB + NATS)"
	@echo "  make test-worker-local - Start Worker test infrastructure (shared DB + NATS)"
	@echo "  make test-all-local    - Start all test infrastructure"
	@echo ""
	@echo "GCP Deployment (Plan A):"
	@echo "  make gcp-auth          - Authenticate to GCP and get GKE credentials"
	@echo "  make gcp-deploy-all    - Deploy all infrastructure (NATS + Worker)"
	@echo "  make gcp-deploy-nats   - Deploy NATS to infrastructure namespace"
	@echo "  make gcp-deploy-worker - Deploy Worker to staging and production"
	@echo "  make gcp-status        - Show status of all GKE resources"
	@echo "  make gcp-logs-api      - View API logs from GKE"
	@echo "  make gcp-logs-worker   - View Worker logs from GKE"
	@echo "  make gcp-logs-nats     - View NATS logs from GKE"	

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
	@-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@echo "✓ All services stopped (Docker daemon left running)"
	@echo "  Run 'make down' to stop Docker containers"

api:
	@echo "Starting API with environment: $(ENV)"
	$(call load_env,api); \
	cd apps/api && poetry run python3 -m src.run

worker:
	@echo "Starting Worker with environment: $(ENV)"
	$(call load_env,worker); \
	cd apps/worker && poetry run python3 -m src.main



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
	REV_ID=$$(date +"%Y%m%d_%H%M%S"); \
	bash -lc "source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) revision --rev-id \"$${REV_ID}_$(msg)\" -m \"$(msg)\""

db-upgrade:
	@echo "Applying DB migrations for $(ENV)..."
	@set -a; . $(ROOT_ENV); set +a; \
	bash -lc 'source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) upgrade head'
	@echo "✓ Migrations applied for $(ENV)"

db-downgrade:
	@echo "Reverting last migration for $(ENV)..."
	@set -a; . $(ROOT_ENV); set +a; \
	bash -lc 'source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) downgrade -1'

db-stamp:
	@test -n "$(rev)" || (echo "Usage: make db-stamp rev=\"revision_id\" [ENV=...]" && exit 1)
	@echo "Stamping database to revision $(rev) for $(ENV)..."
	@set -a; . $(ROOT_ENV); set +a; \
	bash -lc 'source $(VENV)/bin/activate; alembic -c $(ALEMBIC_CONFIG) stamp $(rev)'
	@echo "✓ Database stamped to $(rev) for $(ENV)"

db-staging-proxy:
	@echo "Starting Cloud SQL Proxy for staging..."
	@cloud-sql-proxy overflying-db:europe-west1:overflying-db --port 5433

db-prod-proxy:
	@echo "Starting Cloud SQL Proxy for production..."
	@cloud-sql-proxy overflying-db:europe-west1:overflying-db --port 5434

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
	@echo "Starting shared test infrastructure (PostgreSQL + NATS)..."
	@cd apps/api && docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@docker exec api-test-db pg_isready -U test > /dev/null 2>&1 || (echo "Test DB not ready" && exit 1)
	@echo "✓ Test infrastructure ready (PostgreSQL on :5433, NATS on :4222)"

test-db-down:
	@echo "Stopping shared test infrastructure..."
	@cd apps/api && docker compose -f docker-compose.test.yml down
	@echo "✓ Test infrastructure stopped"

test-api: test-db-up
	@echo "Running API tests..."
	@cd apps/api && poetry install --with dev && \
		DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" \
		TEST_DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" \
		NATS_URL="nats://localhost:4222" \
		poetry run pytest
	@echo "✓ API tests complete"

test-web:
	@echo "Running Web tests..."
	@cd apps/web && bun install --silent && bun run test
	@echo "✓ Web tests complete"

test-worker: test-db-up
	@echo "Running Worker tests..."
	@cd apps/worker && poetry install --with dev && \
		DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" \
		TEST_DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" \
		NATS_URL="nats://localhost:4222" \
		poetry run pytest
	@echo "✓ Worker tests complete"

test: test-api test-worker
	@echo "✓ All tests complete"

ci:
	@echo "CI local placeholder"

# ============================================================================
# NATS Demo Commands
# ============================================================================

demo-nats-install:
	@echo "Installing dependencies for NATS demo..."
	@echo ""
	@echo "1. Installing API dependencies..."
	@cd apps/api && pip install -e . -q
	@echo "   ✓ API ready"
	@echo ""
	@echo "2. Installing Worker dependencies..."
	@cd apps/worker && pip install -e . -q
	@echo "   ✓ Worker ready"
	@echo ""
	@echo "3. Installing Frontend dependencies..."
	@cd apps/web && bun install --silent
	@echo "   ✓ Frontend ready"
	@echo ""
	@echo "✓ All dependencies installed!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Ensure database is set up: make db-upgrade"
	@echo "  2. Check services: make demo-nats-check"
	@echo "  3. Run demo: make demo-all"

demo-nats-check:
	@echo "Checking NATS demo prerequisites..."
	@echo ""
	@echo "1. Checking Docker services..."
	@docker ps --filter "name=planet-dev-postgres" --format "{{.Names}}" | grep -q planet-dev-postgres && echo "   ✓ PostgreSQL running" || echo "   ✗ PostgreSQL not running (run: make dev)"
	@docker ps --filter "name=planet-dev-nats" --format "{{.Names}}" | grep -q planet-dev-nats && echo "   ✓ NATS running" || echo "   ✗ NATS not running (run: make dev)"
	@echo ""
	@echo "2. Checking NATS health..."
	@curl -s http://localhost:8222/varz > /dev/null && echo "   ✓ NATS API responding" || echo "   ✗ NATS not healthy"
	@echo ""
	@echo "3. Checking database connection..."
	@docker exec planet-dev-postgres pg_isready -U postgres > /dev/null 2>&1 && echo "   ✓ Database ready" || echo "   ✗ Database not ready"
	@echo ""
	@echo "All checks complete!"

demo-all:
	@echo "=================================================="
	@echo "Starting NATS Demo (All Services)"
	@echo "=================================================="
	@echo ""
	@echo "💡 This will start API, Worker, and Frontend in background"
	@echo "   Press Ctrl+C to stop monitoring, then run 'make clean' to stop services"
	@echo ""
	@sleep 2
	@echo "1. Starting infrastructure (PostgreSQL + NATS)..."
	@$(MAKE) dev
	@echo "   Waiting for services to be healthy..."
	@sleep 5
	@docker exec planet-dev-postgres pg_isready -U postgres || (echo "PostgreSQL not ready" && exit 1)
	@curl -s http://localhost:8222/varz > /dev/null || (echo "NATS not ready" && exit 1)
	@echo "   ✓ Infrastructure ready"
	@echo ""
	@echo "2. Starting API in background..."
	@set -a; . $(ROOT_ENV); set +a; \
	cd apps/api && nohup python3 -m src.run > /tmp/planet-api.log 2>&1 & echo $$! > /tmp/planet-api.pid
	@echo "   Waiting for API to start..."
	@sleep 5
	@curl -s http://localhost:8000/health > /dev/null && echo "   ✓ API running" || echo "   ⚠ API may still be starting (check logs: tail -f /tmp/planet-api.log)"
	@echo ""
	@echo "3. Starting Worker in background..."
	@set -a; . $(ROOT_ENV); set +a; \
	cd apps/worker && nohup python3 src/main.py > /tmp/planet-worker.log 2>&1 & echo $$! > /tmp/planet-worker.pid
	@sleep 3
	@echo "   ✓ Worker running (logs: tail -f /tmp/planet-worker.log)"
	@echo ""
	@echo "4. Starting Frontend in background..."
	@cd apps/web && nohup bun dev > /tmp/planet-web.log 2>&1 & echo $$! > /tmp/planet-web.pid
	@sleep 4
	@echo "   ✓ Frontend running (logs: tail -f /tmp/planet-web.log)"
	@echo ""
	@echo "=================================================="
	@echo "✓ All services started!"
	@echo "=================================================="
	@echo ""
	@echo "Services:"
	@echo "  - API:      http://localhost:8000"
	@echo "  - Frontend: http://localhost:3000"
	@echo "  - NATS UI:  http://localhost:8222"
	@echo ""
	@echo "Logs:"
	@echo "  - API:      tail -f /tmp/planet-api.log"
	@echo "  - Worker:   tail -f /tmp/planet-worker.log"
	@echo "  - Frontend: tail -f /tmp/planet-web.log"
	@echo ""
	@echo "💡 TIP: Open another terminal and run: tail -f /tmp/planet-*.log"
	@echo ""
	@echo "Now running demo in 3 seconds..."
	@sleep 3
	@$(MAKE) demo-nats

demo-nats:
	@echo "=================================================="
	@echo "NATS Integration Demo"
	@echo "=================================================="
	@echo ""
	@echo "Creating 3 test jobs and monitoring real-time events..."
	@echo ""
	@./scripts/demo-nats.sh || echo "Demo script failed. Check if services are running with: make demo-nats-check"

nats-monitor:
	@echo "Monitoring NATS JetStream in real-time..."
	@echo "Press Ctrl+C to stop"
	@echo ""
	@curl -N http://localhost:8222/jsz?streams=1 2>/dev/null | python3 -m json.tool || \
		echo "NATS not responding. Start with: make dev"

nats-purge:
	@echo "Purging JOBS stream..."
	@curl -X POST "http://localhost:8000/admin/purge-stream?stream_name=JOBS" 2>/dev/null && \
	echo "✓ Stream purged" || \
	echo "✗ Failed. Make sure API is running: make api"

nats-info:
	@echo "JetStream Info:"
	@curl -s http://localhost:8222/jsz | jq '.'

# ============================================================================
# GCP Deployment Commands (Plan A Infrastructure)
# ============================================================================

GCP_PROJECT=overflying-cluster
GCP_REGION=europe-west1
GCP_CLUSTER=overflying-autopilot

gcp-auth:
	@echo "Authenticating to GCP and getting GKE credentials..."
	gcloud auth login
	gcloud config set project $(GCP_PROJECT)
	gcloud container clusters get-credentials $(GCP_CLUSTER) \
		--region=$(GCP_REGION) \
		--project=$(GCP_PROJECT)
	@echo "✓ Authenticated and connected to GKE cluster"

gcp-deploy-all:
	@echo "Deploying all infrastructure to GKE..."
	@chmod +x scripts/deploy-infrastructure.sh
	@./scripts/deploy-infrastructure.sh

gcp-deploy-nats:
	@echo "Deploying NATS to GKE infrastructure namespace..."
	kubectl create namespace infrastructure --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -f k8s/infrastructure/nats-deployment.yaml
	kubectl wait --for=condition=ready pod -l app=nats -n infrastructure --timeout=120s
	@echo "✓ NATS deployed successfully"
	@echo ""
	@echo "Verify with:"
	@echo "  kubectl get pods -n infrastructure"
	@echo "  kubectl logs -n infrastructure -l app=nats"

gcp-deploy-worker:
	@echo "Deploying Worker to GKE..."
	@echo ""
	@echo "⚠️  Make sure DATABASE_URL_STAGING and DATABASE_URL_PRODUCTION are set!"
	@echo ""
	@if [ -z "$$DATABASE_URL_STAGING" ] || [ -z "$$DATABASE_URL_PRODUCTION" ]; then \
		echo "Error: Set environment variables first:"; \
		echo "  export DATABASE_URL_STAGING='postgresql://...'"; \
		echo "  export DATABASE_URL_PRODUCTION='postgresql://...'"; \
		exit 1; \
	fi
	@echo "Setting up secrets..."
	cd k8s/worker && chmod +x setup-secrets.sh && ./setup-secrets.sh
	@echo "Deploying to staging..."
	kubectl apply -f k8s/worker/staging-deployment.yaml
	@echo "Deploying to production..."
	kubectl apply -f k8s/worker/production-deployment.yaml
	@echo "✓ Worker deployed successfully"
	@echo ""
	@echo "Verify with:"
	@echo "  kubectl get pods -n staging -l app=worker"
	@echo "  kubectl get pods -n production -l app=worker"

gcp-status:
	@echo "=================================================="
	@echo "GCP Infrastructure Status"
	@echo "=================================================="
	@echo ""
	@echo "Infrastructure Namespace (NATS):"
	@kubectl get all -n infrastructure
	@echo ""
	@echo "Staging Namespace:"
	@kubectl get all -n staging
	@echo ""
	@echo "Production Namespace:"
	@kubectl get all -n production

gcp-logs-api:
	@echo "API logs (staging):"
	@kubectl logs -n staging -l app=api --tail=50

gcp-logs-worker:
	@echo "Worker logs (staging):"
	@kubectl logs -n staging -l app=worker --tail=50

gcp-logs-nats:
	@echo "NATS logs (infrastructure):"
	@kubectl logs -n infrastructure -l app=nats --tail=50

# ============================================================================
# Local Testing with Shared Infrastructure (Plan A)
# ============================================================================

test-api-local:
	@echo "Starting shared test infrastructure for API..."
	@cd apps/api && docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "✓ Test infrastructure running:"
	@echo "  - PostgreSQL: localhost:5433 (user: test, password: test, db: test_db)"
	@echo "  - NATS: localhost:4222 (client), localhost:8222 (monitoring)"
	@echo ""
	@echo "Run tests with:"
	@echo "  cd apps/api && DATABASE_URL='postgresql+psycopg2://test:test@localhost:5433/test_db' NATS_URL='nats://localhost:4222' pytest"
	@echo ""
	@echo "Stop with:"
	@echo "  cd apps/api && docker compose -f docker-compose.test.yml down"

test-worker-local:
	@echo "Starting shared test infrastructure for Worker..."
	@cd apps/worker && docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "✓ Test infrastructure running:"
	@echo "  - PostgreSQL: localhost:5433 (user: test, password: test, db: test_db)"
	@echo "  - NATS: localhost:4222 (client), localhost:8222 (monitoring)"
	@echo ""
	@echo "Run tests with:"
	@echo "  cd apps/worker && DATABASE_URL='postgresql+psycopg2://test:test@localhost:5433/test_db' NATS_URL='nats://localhost:4222' pytest"
	@echo ""
	@echo "Stop with:"
	@echo "  cd apps/worker && docker compose -f docker-compose.test.yml down"

test-all-local:
	@echo "Note: API and Worker share the same test infrastructure (test-db and test-nats)"
	@echo "Starting from the API directory will make it available to both."
	@$(MAKE) test-api-local

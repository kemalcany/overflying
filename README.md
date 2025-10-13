# Constellation — GPU Task Orchestrator with Real‑Time Insights

A demo platform that schedules GPU jobs, streams live telemetry to a React (TanStack Query) dashboard, and exposes an OpenAPI-first API. Includes a small Go component for usage aggregation. This document tracks the living scope.

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Fresh installation instructions for macOS (no Docker)
- **[Local Development](docs/LOCAL_DEV.md)** - Running services locally
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to Render, Railway, or Fly.io
- **[PostgreSQL Quick Reference](docs/PG.md)** - Common psql commands
- **[Job Description](docs/JOB_DESCRIPTION.md)** - Planet Software Engineer role details

## Tech Stack

- Frontend: React + TypeScript, Next.js, TanStack Query (data), Emotion CSS, WebSocket client. Optional: TanStack Router, TanStack Table.
- Backend (Python): FastAPI, Pydantic v2, asyncio + process pool, SQLAlchemy 2.0/SQLModel (if needed), OpenTelemetry.
- Database (primary): Postgres 18 for orchestration metadata and system of record.
- Events/RT: NATS for streams; WebSockets from API to UI.
- Go service: `chi` + `pgx` + OpenTelemetry, aggregates usage summaries.
- Observability: Prometheus, Grafana, Tempo/Jaeger, structured logs (correlation IDs).
- Spatial (optional): PostGIS on Postgres for advanced spatial; later analytics via DuckDB + `duckdb_spatial` if needed.

## Frontend Plan (TanStack)

- TanStack Query for data fetching/caching; SSR where appropriate.
- WebSocket client for live job state/logs and GPU metrics.
- Optional: TanStack Router for file‑based routes; TanStack Table for job/usage grids.
- Later: Explore TanStackDB once it stabilizes for local data/state modeling.

## Database Decision — Postgres 18 primary, DuckDB later for analytics

- Postgres 18 strengths:
  - Production‑grade concurrency and transactions, roles/permissions, rich indexing, mature ecosystem.
  - Excellent ORM support, queue patterns (e.g., SKIP LOCKED), native logical replication.
  - PostGIS for advanced spatial use cases and indexing.
- DuckDB strengths (for later analytics):
  - Embedded, zero‑ops, extremely fast OLAP/columnar analytics; Parquet/Arrow native.
  - Ideal for ad‑hoc analytics, dashboards over result sets, local or server‑side analytical flows.
  - Spatial via `duckdb_spatial` for many `ST_*` functions.

### Recommended paths

- Primary (production‑like): Postgres 18 for job metadata/orchestration and all transactional data.
  - Jobs/runs/gpus/events in Postgres; API and worker coordinate via DB + NATS.
  - UI reads metadata from Postgres via the API; real‑time updates via WebSockets from NATS‑backed streams.
- Later analytics: Introduce DuckDB for analytical queries over result artifacts (e.g., Parquet) and aggregated tables.
  - Maintain ETL/ELT from Postgres → Parquet/Arrow → DuckDB for BI‑style panels.

## Data Model (Postgres 18 primary)

- `jobs(id UUID PK, name TEXT, params JSONB, priority INT, state TEXT, created_at TIMESTAMPTZ, submitted_by TEXT)`
- `runs(id UUID PK, job_id UUID FK, gpu_id UUID FK, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, state TEXT, exit_code INT, metrics JSONB)`
- `gpus(id UUID PK, uuid TEXT UNIQUE, name TEXT, total_mem_mb INT, compute_capability TEXT)`
- `events(id BIGSERIAL PK, type TEXT, job_id UUID NULL, run_id UUID NULL, payload JSONB, ts TIMESTAMPTZ DEFAULT now())`
- Optional spatial: `areas(id UUID PK, name TEXT, geom GEOGRAPHY/GEOMETRY)` using PostGIS.

Notes:

- Use `JSONB` for flexible payloads; validate at app layer.
- Add indexes with `CREATE INDEX` on frequent filters (e.g., `jobs(state)`, `runs(job_id)`), include partial indexes where helpful.

## Concurrency Model

- Writes: API and worker both write to Postgres 18 with transactional consistency.
- Readers: UI and Go service read via the API; Go service may read directly for batch summaries.
- Eventing: NATS carries real‑time signals; DB remains the source of truth for durable state.

## API (OpenAPI-first) — initial endpoints

- `POST /jobs` submit a job
- `GET /jobs/{id}` job status
- `GET /jobs/{id}/logs` stream logs (SSE) or `WS /stream` channel multiplexed
- `GET /gpus` inventory + current utilization
- `GET /usage/accounts/{id}` (Go service)
- `GET /usage/leaderboard` (Go service)

Codegen:

- Generate TS client (`openapi-typescript`) and Go client from the same spec.

## GPU Execution

- Python worker selects devices via NVML (`pynvml`) + CUDA_VISIBLE_DEVICES.
- Parallel/serial modes, per‑GPU queues, retries/backoff, idempotent runs.
- Demo workloads:
  - CNN inference on small satellite tiles (PyTorch), record per‑tile metrics.
  - Write per‑run metrics to Postgres; push events for real‑time updates via NATS.

## Observability

- OpenTelemetry traces: UI → API → worker → DB.
- Metrics: request latency, queue depth, GPU utilization, job lifecycle counters.
- Dashboards in Grafana; traces in Tempo/Jaeger.

## Spatial (optional but recommended)

- Use PostGIS for AOI footprints (GeoJSON import) and spatial joins.
- UI: deck.gl/MapLibre to render processed coverage; click through to runs/jobs.

## Analytics with DuckDB (later)

- Purpose: fast OLAP over aggregated results and Parquet artifacts without burdening Postgres.
- Storage: export selected Postgres tables or materialized views to Parquet; keep a versioned dataset.
- Engine: DuckDB with `duckdb_spatial` for geospatial analytics.
- Access: API endpoints that run read‑only analytical queries in DuckDB and return datasets to the UI.

## Risks & Mitigations

- Concurrency: rely on Postgres 18 transactional semantics; use SKIP LOCKED for queues.
- Real‑time: rely on NATS for instant updates; DB refresh on intervals for reconciliation.
- Migrations: maintain SQL migration files (Alembic) and an app-level migration runner.

## Roadmap

- Milestone 1 (week 1): OpenAPI draft, Postgres 18 schema & migrations, worker skeleton, GPU discovery, WebSocket event stream backed by NATS, minimal dashboard with TanStack Query.
- Milestone 2 (week 2): Full job lifecycle, live logs, usage summaries in Go, metrics + dashboards, tests.
- Milestone 3 (week 3): Spatial view (PostGIS), load tests, polish docs and screencast.
- Future: TanStackDB exploration; add DuckDB analytics layer (ETL to Parquet + DuckDB queries).

## Commands (target)

- `make dev`: runs API, worker, UI, NATS, Grafana/Prom.
- `make test`: runs unit + e2e tests.
- `make demo`: seeds jobs and opens dashboard.

## Decision Log

- 2025‑10‑13: Adopt React + TanStack Query; Postgres 18 as primary DB; NATS for events; plan DuckDB analytics later.

## Claude Suggestions

### Implementation Strategy

**Focus: Execute Milestone 1 Excellence Over Scope Creep**

The architecture is solid and production-grade. Rather than spreading thin across all three milestones, prioritize delivering an impressive, complete Milestone 1 that demonstrates senior-level full-stack capabilities for the Planet application.

### High-Impact Priorities (Week 1)

1. **OpenAPI Spec First** (2-3 hours)
   - Define 5-6 core endpoints to drive codegen:
     - `POST /jobs` - Submit job with params
     - `GET /jobs` - List jobs with filters (state, submitted_by)
     - `GET /jobs/{id}` - Job detail with run history
     - `GET /gpus` - GPU inventory with utilization
     - `WS /stream` - WebSocket for real-time events
   - Generate TS/Python clients immediately to verify workflow

2. **FastAPI Backend** (Core Features)
   - GPU discovery with `pynvml` (simulate if no GPU available)
   - Job submission → Postgres persistence
   - State machine: PENDING → RUNNING → COMPLETED/FAILED
   - WebSocket endpoint multiplexing NATS streams

3. **React Dashboard** (TanStack Query)
   - Job submission form (name, params, priority)
   - Job list with real-time status updates
   - GPU status cards (utilization, memory, temp)
   - Live logs via WebSocket connection
   - Use Emotion CSS for theming

4. **Worker Implementation**
   - Job picker using `SELECT ... FOR UPDATE SKIP LOCKED` pattern
   - Simple demo workload (doesn't require real GPU)
   - Publish events to NATS for real-time UI updates
   - Store metrics in `runs` table

### Planet-Specific Enhancements

**Satellite Imagery Simulation** (Bonus Points)
- Frame jobs as "Process satellite tile at (lat, lon)"
- Demo workload: image classification on sample tiles (use small dataset)
- Store tile footprints in PostGIS as `GEOGRAPHY(POLYGON)`
- Display processed coverage on deck.gl/MapLibre map
- Add spatial query: "Find jobs within 100km of Berlin"

This directly demonstrates understanding of Planet's satellite imaging domain and shows spatial data expertise.

### Scope Adjustments

**Defer to Post-Demo:**
- Go usage service (nice-to-have, not critical for initial demo)
- DuckDB analytics layer (already marked as "later")
- Full observability stack (keep Prometheus + basic metrics; skip Tempo/Jaeger initially)
- TanStackDB exploration (experimental, not production-ready yet)

**Keep Simple:**
- 1-2 demo workloads maximum
- Focus on real-time updates (your differentiator)
- Ensure `make demo` is impressive with seed data

### Testing Strategy (Pragmatic)

Don't over-test for a demo, but show best practices:
- Unit tests for critical paths (job state transitions, queue logic)
- One Playwright e2e: submit job → observe real-time completion
- OpenAPI contract validation tests
- k6 load test script (even if not run in demo)

### Demo & Documentation

**For Interview/Application:**
- **Screencast** (2-3 min): Job submission → real-time updates → GPU metrics → map view
- **Architecture diagram** (one page): Data flow from UI → API → Worker → NATS → WebSocket → UI
- **README**: Clear `make demo` that seeds data and opens dashboard
- Emphasize **OpenAPI-first** approach (Planet uses this extensively)

### Job Alignment Strengths

Your tech stack is nearly perfect for Planet's role:
- ✅ React + Python + Go (exact match)
- ✅ OpenAPI/REST codegen (job requirement)
- ✅ Complex data visualization (TanStack Query, real-time dashboards)
- ✅ Event-driven pipelines (NATS + WebSocket)
- ✅ Spatial data (PostGIS + deck.gl - huge bonus for satellite company)
- ✅ Customer telemetry focus (usage summaries, aggregation)

### Quick Wins

1. **Multi-tenant ready**: Jobs have `submitted_by` field (shows production thinking)
2. **Usage telemetry page**: Aggregate stats by user (aligns with Planet's customer reporting focus)
3. **Correlation IDs**: OpenTelemetry trace context through entire stack
4. **Idempotent operations**: Job runs are idempotent with retry logic

### Recommended Execution Order

1. Fix configuration issues (✅ Done: Postgres port 5432)
2. Design & implement OpenAPI spec
3. Generate TS/Python clients and verify
4. Build FastAPI with 3 core endpoints
5. Create React dashboard (job list + submit)
6. Implement worker with dummy workload
7. Add WebSocket streaming for real-time
8. Polish with demo data and `make demo`
9. (Bonus) Add one spatial feature if time permits

### Success Metrics

A successful demo shows:
- Submit job via UI → immediately see "PENDING" state
- Worker picks up job → status updates to "RUNNING" in real-time
- Logs stream to UI as job executes
- Job completes → metrics visible, state updates to "COMPLETED"
- GPU utilization visible throughout
- (Bonus) Processed tiles appear on map

This demonstrates: full-stack skills, real-time systems, async coordination, production patterns, and domain understanding.

## Repository layout

Top-level monorepo using workspaces and shared tooling. Targets one-command dev via Make and Docker Compose.

```
planet/
  apps/
    api/                    # FastAPI service (OpenAPI-first), Postgres 18, NATS, WebSockets
      src/
      tests/
      pyproject.toml
    worker/                 # GPU job runner (Python), NVML/CUDA, subscribes to NATS
      src/
      tests/
      pyproject.toml
    web/                    # Next.js + React + TS, TanStack Query, WebSocket client, dashboards
      src/
      e2e/
      package.json
    usage-go/               # Go microservice for usage summaries/aggregation, exposes small API
      cmd/usagego/
      internal/
      go.mod
  packages/
    shared-types/           # OpenAPI-generated TS/Go/Python clients & shared DTOs
      ts/
      go/
      py/
    ui/                     # Shared UI components (TS), charts/tables, Emotion theme
      src/
      package.json
    opentelemetry/          # Shared OTEL setup for Python/Go/TS
      python/
      go/
      ts/
  db/
    migrations/             # Alembic migrations for Postgres 18 (DDL/DML)
    seeds/                  # Seed data for demo
    alembic.ini
    README.md
  analytics/                # DuckDB later: Parquet datasets, SQL notebooks, ETL scripts
    datasets/
    etl/
    notebooks/
    README.md
  openapi/
    spec.yaml               # Single source of truth; codegen to packages/shared-types
    README.md
  infra/
    docker-compose.yml      # Postgres 18, NATS, Grafana, Prometheus, Tempo/Jaeger, app services
    Dockerfiles/
    k6/                     # Load test scripts
    grafana/                # Dashboards
    prometheus/
  .github/
    workflows/              # CI: lint, test, build, codegen, preview envs
  Makefile                  # make dev/test/demo/format/lint
  PROJECT_SCOPE.md          # Living scope doc (this file)
  README.md
```

Conventions:

- Single OpenAPI spec in `openapi/spec.yaml`; codegen pipelines output TS/Go/Python clients into `packages/shared-types` consumed by `apps/*`.
- Env via `.env` files per app; compose overrides for local dev. Secrets kept out of VCS.
- Testing: unit tests colocated; e2e tests in `apps/web/e2e` (Playwright) and `infra/k6`.
- Observability: common OTEL setup in `packages/opentelemetry` to enforce consistent tracing/metrics.

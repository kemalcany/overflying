# Constellation — GPU Task Orchestrator with Real‑Time Insights

A demo platform that schedules GPU jobs, streams live telemetry to a React (TanStack Query) dashboard, and exposes an OpenAPI-first API. Includes a small Go component for usage aggregation. This document tracks the living scope.

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

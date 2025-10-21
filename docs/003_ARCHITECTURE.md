# Architecture

Constellation is a cloud-native, event-driven platform for GPU task orchestration.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  React + Next.js + TanStack Query + WebSocket Client        │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + WebSocket
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      API Service                             │
│  FastAPI + Pydantic + OpenAPI + SQLAlchemy                  │
└─────┬──────────────┬──────────────────────┬─────────────────┘
      │              │                      │
      │              │                      │
      ▼              ▼                      ▼
┌─────────────┐ ┌──────────┐      ┌────────────────┐
│  PostgreSQL │ │   NATS   │      │  Worker Service│
│  (Postgres  │ │ (Events) │      │  (GPU Tasks)   │
│     18)     │ └──────────┘      │   + NVML       │
└─────────────┘                   └────────────────┘
      │
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Go Usage Service (Future)                   │
│              chi + pgx + OpenTelemetry                       │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **State Management**: TanStack Query (React Query)
- **Styling**: Emotion CSS + Radix UI
- **Form Management**: react-hook-form + zod
- **Real-time**: WebSocket client
- **Type Safety**: TypeScript with OpenAPI-generated types

**Why this stack?**
- TanStack Query: Best-in-class data fetching with caching and real-time updates
- Next.js App Router: Modern React with SSR capabilities
- Radix UI: Accessible, unstyled components
- Type safety from backend to frontend via OpenAPI codegen

### Backend (API Service)
- **Framework**: FastAPI
- **Validation**: Pydantic v2
- **ORM**: SQLAlchemy 2.0
- **Async**: asyncio + uvicorn
- **API Spec**: OpenAPI 3.0 (first-class)
- **Real-time**: WebSocket endpoints

**Why FastAPI?**
- Native OpenAPI support (automatic docs)
- Modern async/await patterns
- Excellent type safety with Pydantic
- Fast and production-ready

### Database
- **Primary**: PostgreSQL 18
- **Features Used**: UUID, JSONB, indexes, transactions
- **ORM**: SQLAlchemy with Alembic migrations
- **Future**: PostGIS for spatial queries

**Why PostgreSQL 18?**
- Production-grade ACID compliance
- Rich feature set (JSONB, UUID, full-text search)
- Excellent Python ecosystem support
- PostGIS for spatial data (Planet use case)

### Events & Real-time
- **Message Broker**: NATS
- **Protocol**: WebSocket (API to frontend)
- **Pattern**: Event streaming for job state changes

**Why NATS?**
- Lightweight and fast
- Simple pub/sub model
- Good for real-time telemetry

### Future Components

#### Go Usage Service
- **Framework**: chi (HTTP router)
- **Database Driver**: pgx (PostgreSQL)
- **Observability**: OpenTelemetry
- **Purpose**: Aggregate usage metrics and customer reporting

#### DuckDB Analytics
- **Purpose**: Fast OLAP queries over result artifacts
- **Use Case**: BI dashboards, Parquet/Arrow analytics
- **Integration**: ETL from PostgreSQL → Parquet → DuckDB

## Data Model

### Core Tables

#### jobs
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    params JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'queued',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_by TEXT
);

CREATE INDEX idx_jobs_state ON jobs(state);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

**Job States**: queued → running → completed/failed

#### runs (Future)
```sql
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    gpu_id UUID REFERENCES gpus(id),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    state TEXT NOT NULL,
    exit_code INTEGER,
    metrics JSONB
);
```

#### gpus (Future)
```sql
CREATE TABLE gpus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    total_mem_mb INTEGER,
    compute_capability TEXT
);
```

#### events (Future)
```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    job_id UUID REFERENCES jobs(id),
    run_id UUID REFERENCES runs(id),
    payload JSONB,
    ts TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_ts ON events(ts DESC);
CREATE INDEX idx_events_type ON events(type);
```

## API Design

### OpenAPI-First Approach

1. Define API contract in `openapi/spec.yaml`
2. Generate TypeScript client for frontend
3. Generate Python types for backend (future)
4. Backend implements the spec

**Current Workflow:**
- API changes → Update spec manually or run `make openapi-sync`
- Run `make codegen` to generate TypeScript types
- Frontend uses generated types automatically

### REST Endpoints

#### Jobs API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/jobs` | Create new job |
| GET | `/jobs` | List all jobs |
| GET | `/jobs/{id}` | Get job by ID |
| PUT | `/jobs/{id}` | Update job |
| DELETE | `/jobs/{id}` | Delete job |

#### System API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/docs` | OpenAPI documentation |

#### Future Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gpus` | List GPU inventory |
| GET | `/jobs/{id}/logs` | Stream job logs (SSE) |
| WS | `/stream` | WebSocket for real-time updates |
| GET | `/usage/accounts/{id}` | Usage by account (Go service) |
| GET | `/usage/leaderboard` | Top users (Go service) |

## Concurrency Model

### Database Operations
- **Writes**: API and Worker both write to PostgreSQL
- **Transactions**: ACID guarantees via PostgreSQL
- **Queue Pattern**: `SELECT ... FOR UPDATE SKIP LOCKED` for job picking
- **Connection Pooling**: SQLAlchemy pool (5-20 connections)

### Real-time Updates
- **Pattern**: Event sourcing via NATS
- **Flow**: Worker → NATS → API → WebSocket → Frontend
- **Fallback**: Frontend polls API every 5s if WebSocket disconnected

## Observability (Future)

### Metrics
- **System**: Request latency, error rate, throughput
- **Business**: Job lifecycle duration, queue depth, GPU utilization
- **Tools**: Prometheus + Grafana

### Tracing
- **Framework**: OpenTelemetry
- **Spans**: UI → API → Worker → Database
- **Tools**: Tempo or Jaeger

### Logging
- **Format**: Structured JSON logs
- **Fields**: Correlation ID, user ID, job ID
- **Aggregation**: Cloud Logging (GCP) or ELK stack

## Security

### Authentication (Future)
- JWT tokens for API access
- Service accounts for worker-to-API communication

### Authorization (Future)
- RBAC: User can only see their own jobs
- Admin role for system-wide access

### Network Security
- TLS/SSL for all external endpoints (via Ingress)
- mTLS for service-to-service (optional)
- Private VPC for database and internal services

## Scalability Considerations

### Horizontal Scaling
- **API**: Stateless, can scale to N replicas
- **Worker**: Can run multiple instances with job queue
- **Database**: Single writer, read replicas for queries (future)

### Performance Optimizations
- **Caching**: Redis for frequently accessed data (future)
- **Query Optimization**: Indexes on state, created_at, job_id
- **Connection Pooling**: Reuse database connections
- **Async Operations**: FastAPI async endpoints where beneficial

## Repository Structure

```
planet/
├── apps/
│   ├── api/              # FastAPI service
│   ├── worker/           # GPU job runner
│   ├── web/              # Next.js frontend
│   └── usage-go/         # Go usage service (future)
├── packages/
│   ├── shared-types/     # OpenAPI-generated types
│   ├── ui/               # Shared UI components
│   └── opentelemetry/    # Shared observability setup
├── db/
│   ├── migrations/       # Alembic migrations
│   └── seeds/            # Demo data
├── k8s/
│   ├── api/              # Kubernetes manifests for API
│   └── ingress/          # Ingress + cert-manager setup
├── infra/
│   ├── docker-compose.yml   # Local development
│   ├── k6/               # Load testing
│   └── grafana/          # Monitoring dashboards
├── openapi/
│   └── spec.yaml         # API specification
└── docs/                 # Documentation (you are here)
```

## Design Decisions

### Why PostgreSQL over DuckDB for primary?
- **Need**: ACID transactions, concurrent writes, queue patterns
- **PostgreSQL**: Production-grade, mature ecosystem, excellent ORM support
- **DuckDB**: Better for analytics, not transactional workloads
- **Solution**: Use both - PostgreSQL for OLTP, DuckDB for OLAP (later)

### Why OpenAPI-first?
- **Planet Requirement**: Job description explicitly mentions OpenAPI codegen
- **Benefits**: Type safety, automatic docs, client generation
- **Workflow**: API spec is source of truth

### Why Monorepo?
- **Shared Types**: OpenAPI types used by API and frontend
- **Atomic Changes**: Update API + frontend in single commit
- **Developer Experience**: Single clone, unified tooling

### Why Kubernetes?
- **Planet Context**: Large-scale deployment capabilities
- **Learning**: Demonstrates cloud-native expertise
- **Production-Ready**: Industry standard for orchestration

## Next Steps

- [Development Workflow](004_DEVELOPMENT.md) - Learn how to develop
- [Deployment Guide](005_DEPLOYMENT.md) - Deploy to production
- [Database Schema Reference](old/SETUP.md#data-model) - Detailed schema

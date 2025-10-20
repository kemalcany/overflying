# DB (Postgres 18)

## Setup Options

### Docker Deployment (Recommended for Development)
Uses containerized Postgres accessible across all repos (api, worker, etc).
- Config: `alembic.ini` (default)
- Connection: `postgresql+psycopg2://postgres:postgres@localhost:5432/planet`
- Commands: `make db-*` (see Makefile)

### Local Postgres Deployment
Uses local Postgres installation via Unix socket.
- Config: `alembic.local.ini`
- Connection: `postgresql+psycopg2://kemal@/planet?host=/tmp`
- Commands: `make db-local-*` (see Makefile)

## Migrations
Located in `db/migrations/versions/`

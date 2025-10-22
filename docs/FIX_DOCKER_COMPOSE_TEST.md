# Fix: Docker Compose Test Configuration

## Issue

When running `make test-api`, you encountered an error:

```
failed to solve: target stage "development" could not be found
```

## Root Cause

The updated `docker-compose.test.yml` files for both API and Worker were trying to build Docker containers with `target: development`, but the Dockerfiles don't have a stage named `development`.

## Solution

**Simplified the test approach**: Instead of building containers, the test infrastructure now just provides the shared PostgreSQL and NATS services. Tests run directly on the host using pytest.

### What Changed

#### Before (Broken):
```yaml
services:
  api-test:
    build:
      context: .
      dockerfile: Dockerfile
      target: development  # ❌ This stage doesn't exist
    environment:
      DATABASE_URL: postgresql+psycopg2://test:test@test-db:5432/test_db
      NATS_URL: nats://test-nats:4222
```

#### After (Fixed):
```yaml
# Shared test infrastructure for API
include:
  - ../../infra/docker-compose/test-db.yml
  - ../../infra/docker-compose/test-nats.yml

# Note: For local testing, just run pytest directly
# The shared services will be available on:
#   - PostgreSQL: localhost:5433
#   - NATS: localhost:4222
```

## How to Use

### Quick Test (Recommended)

```bash
# Start shared test infrastructure
make test-db-up

# Run tests (in another terminal)
cd apps/api
DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" \
NATS_URL="nats://localhost:4222" \
pytest

# Stop infrastructure
make test-db-down
```

### Automated Test

```bash
# This does everything: starts infrastructure, runs tests, reports results
make test-api
```

### Manual Control

```bash
# Start infrastructure
make test-api-local

# In another terminal, run tests
cd apps/api
DATABASE_URL="postgresql+psycopg2://test:test@localhost:5433/test_db" \
NATS_URL="nats://localhost:4222" \
pytest

# Stop infrastructure
cd apps/api
docker compose -f docker-compose.test.yml down
```

## Benefits of This Approach

1. **Faster**: No need to build Docker images for testing
2. **Simpler**: Tests run directly with pytest
3. **Flexible**: Easy to debug and iterate
4. **DRY**: Still uses shared test infrastructure

## Shared Test Infrastructure

Both API and Worker reference the same test services:

```
infra/docker-compose/
├── test-db.yml      # PostgreSQL 16 on port 5433
└── test-nats.yml    # NATS 2.0 on ports 4222 (client) and 8222 (monitoring)
```

**Key benefit**: Update the database or NATS version once, and both API and Worker tests use it.

## CI/CD (GitHub Actions)

The GitHub Actions workflows use a different approach:
- They spin up services using the `services:` block
- No docker-compose needed in CI
- This local approach is just for development

See [.github/workflows/reusable-test-python.yml](.github/workflows/reusable-test-python.yml) for the CI implementation.

## Troubleshooting

### Port Already in Use

If you see:
```
Bind for 0.0.0.0:4222 failed: port is already allocated
```

**Solution**: Stop your development NATS first:
```bash
make down    # Stop dev infrastructure (infra/docker-compose.yml)
```

Or use different ports by setting environment variables:
```bash
TEST_NATS_CLIENT_PORT=14222 TEST_NATS_MONITOR_PORT=18222 make test-db-up
```

### Container Name Conflicts

The containers are named:
- `api-test-db` (or `worker-test-db` if started from worker directory)
- `api-test-nats` (or `worker-test-nats`)

This prevents conflicts with development containers.

### Can't Connect to Database

Make sure the infrastructure is running:
```bash
docker ps | grep test
```

You should see:
- `api-test-db` on port 5433
- `api-test-nats` on ports 4222 and 8222

Test connection:
```bash
docker exec api-test-db pg_isready -U test
```

## Alternative: Full Container Build (Advanced)

If you really need to test inside containers, add development stages to the Dockerfiles:

**apps/api/Dockerfile:**
```dockerfile
# Add after builder stage
FROM python:3.11-slim AS development
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY src ./src
RUN pip install pytest pytest-cov pytest-asyncio
CMD ["pytest", "-v"]
```

Then update docker-compose.test.yml:
```yaml
services:
  api-test:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    environment:
      DATABASE_URL: postgresql+psycopg2://test:test@test-db:5432/test_db
      NATS_URL: nats://test-nats:4222
```

But the current approach (tests on host, services in containers) is simpler and faster.

## Summary

✅ **Fixed**: Removed invalid `target: development` from docker-compose.test.yml files
✅ **Simplified**: Tests run on host, only infrastructure in containers
✅ **DRY**: Both API and Worker share the same test PostgreSQL and NATS
✅ **Fast**: No Docker build step needed for local testing

**To test right now:**
```bash
make test-api
```

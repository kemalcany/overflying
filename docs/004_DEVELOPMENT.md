# Development Workflow

This guide covers the day-to-day development workflow for Constellation.

## Local Development Setup

### Starting Services

#### Option 1: Individual Services

```bash
# Terminal 1 - Database
brew services start postgresql@18
# Or: cd db && docker compose up

# Terminal 2 - API
cd apps/api
source ../../.venv/bin/activate  # If using project venv
uvicorn src.main:app --reload --port 8000

# Terminal 3 - Web
cd apps/web
npm run dev

# Terminal 4 - Worker (future)
cd apps/worker
python src/main.py
```

#### Option 2: Using Make (future)

```bash
make dev    # Starts all services
make logs   # Shows logs
make down   # Stops all services
```

### Service URLs

- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Web App: http://localhost:3000

## Development Workflow

### 1. Feature Development

#### Backend Changes

```bash
cd apps/api

# 1. Create feature branch
git checkout -b feature/add-job-filtering

# 2. Create database migration if needed
cd ../../db
alembic revision -m "add job filters"
# Edit the generated migration file
make db-upgrade

# 3. Update API code
cd ../apps/api
# Edit src/main.py, src/schemas.py, etc.

# 4. Run tests
pytest

# 5. Test manually
uvicorn src.main:app --reload
# Try API at http://localhost:8000/docs
```

#### Frontend Changes

```bash
cd apps/web

# 1. Create feature branch (if not done)
git checkout -b feature/add-job-filtering

# 2. Update API client (if API changed)
cd ../..
make codegen  # Regenerates TypeScript types

# 3. Update components
cd apps/web
# Edit src/app/page.tsx, src/components/*, etc.

# 4. Run tests
npm test

# 5. Test manually
npm run dev
# Open http://localhost:3000
```

### 2. Testing Strategy

#### Backend Testing

**Unit Tests** (Fast, isolated)
```bash
cd apps/api

# Run all tests
pytest

# Run specific test file
pytest tests/test_jobs.py

# Run specific test
pytest tests/test_jobs.py::TestCreateJob::test_create_job_minimal

# Run with coverage
pytest --cov=src --cov-report=html
open htmlcov/index.html

# Watch mode (requires pytest-watch)
ptw
```

**Test Database**
```bash
# Start test database (Docker)
cd apps/api
docker compose -f docker-compose.test.yml up -d

# Or use local PostgreSQL on different port
createdb planet_test
```

**Writing Tests**
```python
# tests/test_jobs.py
from fastapi.testclient import TestClient

def test_create_job(client: TestClient):
    """Test creating a job with minimal data"""
    response = client.post(
        "/jobs",
        json={"name": "test-job", "priority": 10}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "test-job"
    assert data["state"] == "queued"
```

#### Frontend Testing

**Unit/Integration Tests** (Vitest + Testing Library)
```bash
cd apps/web

# Run all tests
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui

# Coverage
npm run test:coverage
open coverage/index.html
```

**E2E Tests** (Playwright)
```bash
cd apps/web

# Run E2E tests (headless)
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Install browsers (first time)
npx playwright install
```

**Writing Tests**
```typescript
// src/components/__tests__/JobForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { JobForm } from '../JobForm'

test('submits form with valid data', async () => {
  const onSubmit = vi.fn()
  render(<JobForm onSubmit={onSubmit} />)

  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'My Job' }
  })
  fireEvent.click(screen.getByText('Submit'))

  expect(onSubmit).toHaveBeenCalledWith({ name: 'My Job' })
})
```

### 3. OpenAPI Workflow

Constellation uses an OpenAPI-first approach for type safety.

```bash
# 1. Make API changes
cd apps/api
# Edit src/main.py

# 2. Check for API drift
make openapi-diff

# 3. Update OpenAPI spec
# Option A: Manually edit openapi/spec.yaml (recommended)
# Option B: Auto-sync from API
make openapi-sync

# 4. Regenerate TypeScript types
make codegen

# 5. Use types in frontend
cd apps/web
# Types are auto-imported from generated files
```

**Example: Adding a new endpoint**

1. Update API:
```python
# apps/api/src/main.py
@app.get("/jobs/{id}/status")
def get_job_status(id: UUID) -> JobStatusResponse:
    # Implementation
    pass
```

2. Check drift:
```bash
make openapi-diff
# Shows what changed
```

3. Update spec:
```yaml
# openapi/spec.yaml
/jobs/{id}/status:
  get:
    summary: Get job status
    responses:
      200:
        description: Job status
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/JobStatusResponse'
```

4. Generate types:
```bash
make codegen
```

5. Use in frontend:
```typescript
// apps/web/src/app/api.ts
import type { JobStatusResponse } from '@/generated/types'

export const getJobStatus = async (id: string): Promise<JobStatusResponse> => {
  // Implementation uses generated types
}
```

### 4. Database Migrations

#### Creating Migrations

```bash
cd db

# Auto-generate migration from model changes
alembic revision --autogenerate -m "add job tags column"

# Or create empty migration
alembic revision -m "add custom index"

# Edit the generated file in migrations/versions/
# migrations/versions/xxx_add_job_tags_column.py
```

Example migration:
```python
def upgrade():
    op.add_column('jobs', sa.Column('tags', sa.JSON(), nullable=True))
    op.create_index('idx_jobs_tags', 'jobs', ['tags'], postgresql_using='gin')

def downgrade():
    op.drop_index('idx_jobs_tags')
    op.drop_column('jobs', 'tags')
```

#### Running Migrations

```bash
# Apply all pending migrations
make db-upgrade

# Rollback last migration
make db-downgrade

# Show migration history
alembic history

# Show current version
alembic current
```

### 5. Code Quality

#### Linting & Formatting

**Python**
```bash
cd apps/api

# Format with black
black src/ tests/

# Lint with ruff
ruff check src/ tests/

# Type check with mypy (if configured)
mypy src/
```

**TypeScript**
```bash
cd apps/web

# Format with Prettier
npm run format

# Lint with ESLint
npm run lint

# Type check
npm run type-check
```

#### Pre-commit Hooks (future)

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Now runs automatically on git commit
# Or run manually:
pre-commit run --all-files
```

### 6. Debugging

#### Backend Debugging

**FastAPI Debug Mode**
```bash
# Already enabled with --reload
uvicorn src.main:app --reload --log-level debug
```

**Python Debugger**
```python
# Add breakpoint in code
import pdb; pdb.set_trace()

# Or use built-in breakpoint()
breakpoint()
```

**Database Queries**
```bash
# Connect to database
make db-shell

# Or directly
psql -d planet

# View running queries
SELECT * FROM pg_stat_activity WHERE datname = 'planet';

# Explain query
EXPLAIN ANALYZE SELECT * FROM jobs WHERE state = 'queued';
```

#### Frontend Debugging

**Browser DevTools**
- React DevTools (component inspection)
- Network tab (API calls)
- Console (logs)

**React Query DevTools**
```typescript
// Already included in development
// Open DevTools panel in browser
```

**Source Maps**
```bash
# Enabled by default in dev mode
npm run dev
# Original source files visible in browser debugger
```

### 7. Environment Variables

**Backend** (`apps/api/.env`)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/planet
PORT=8000
ENVIRONMENT=development
```

**Frontend** (`apps/web/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Loading .env Files**
```bash
# Backend (automatic with python-dotenv)
# Frontend (automatic with Next.js)
```

## Common Tasks

### Adding a New Job Field

1. Update database schema:
```bash
cd db
alembic revision -m "add job description field"
```

2. Update migration:
```python
def upgrade():
    op.add_column('jobs', sa.Column('description', sa.Text(), nullable=True))
```

3. Update Pydantic schemas:
```python
# apps/api/src/schemas.py
class JobCreate(BaseModel):
    name: str
    description: str | None = None  # Add this
    priority: int = 0
```

4. Run migration and tests:
```bash
make db-upgrade
cd apps/api && pytest
```

5. Update frontend types:
```bash
make codegen
cd apps/web && npm test
```

### Creating a New API Endpoint

See [OpenAPI Workflow](#3-openapi-workflow) above.

### Adding a New React Component

```bash
cd apps/web

# 1. Create component
mkdir -p src/components/JobFilters
touch src/components/JobFilters/index.tsx

# 2. Write component
# Edit src/components/JobFilters/index.tsx

# 3. Write tests
touch src/components/JobFilters/__tests__/JobFilters.test.tsx

# 4. Test
npm test JobFilters
```

## Useful Commands

### Database
```bash
make db-query          # Show all jobs
make db-shell          # Open psql
make db-upgrade        # Apply migrations
make db-downgrade      # Rollback migration
```

### API
```bash
cd apps/api
pytest                 # Run tests
pytest --cov           # With coverage
pytest -x              # Stop on first failure
pytest -v              # Verbose
```

### Web
```bash
cd apps/web
npm test               # Run tests
npm run test:watch     # Watch mode
npm run test:e2e       # E2E tests
npm run lint           # Lint
npm run format         # Format
```

### OpenAPI
```bash
make openapi-diff      # Check API drift
make openapi-sync      # Sync spec from API
make codegen           # Generate TS types
```

## Troubleshooting

### API won't start
```bash
# Check port is free
lsof -ti:8000 | xargs kill -9

# Check database connection
psql -d planet -c "SELECT 1"

# Check migrations are up to date
alembic current
make db-upgrade
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Tests failing
```bash
# Backend: ensure test DB is running
cd apps/api
docker compose -f docker-compose.test.yml up -d

# Frontend: clear cache
cd apps/web
npm test -- --clearCache
npm test
```

## Next Steps

- [Deployment Guide](005_DEPLOYMENT.md) - Deploy to production
- [Testing Reference](old/CRUD.md#testing-strategy) - Detailed testing guide
- [Architecture](003_ARCHITECTURE.md) - Understand the system

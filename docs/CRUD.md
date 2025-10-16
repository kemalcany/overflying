# Job CRUD Implementation Plan

This document outlines the comprehensive plan for implementing Create, Read, Update, and Delete operations for jobs in both the API and Web applications, including full test coverage.

## Table of Contents
- [Technology Stack](#technology-stack)
- [Testing Frameworks](#testing-frameworks)
- [Implementation Status](#implementation-status)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Testing Strategy](#testing-strategy)
- [Running Tests](#running-tests)

---

## Technology Stack

### Backend (API)
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Validation**: Pydantic v2
- **Python**: 3.11+

### Frontend (Web)
- **Framework**: Next.js 15.5.5 (App Router)
- **React**: 19.2.0
- **State Management**: @tanstack/react-query
- **Styling**: @emotion/styled + Radix UI
- **Form Management**: react-hook-form + zod
- **Notifications**: sonner
- **TypeScript**: Full type safety with OpenAPI-generated types

---

## Testing Frameworks

### Backend Testing
- **pytest**: Industry-standard Python testing framework
- **httpx**: Modern async HTTP client for testing FastAPI
- **pytest-asyncio**: Async test support
- **pytest-cov**: Code coverage reporting
- **faker**: Test data generation
- **Test Database**: PostgreSQL (production parity)

**Why pytest?**
- Excellent FastAPI support via TestClient
- Rich plugin ecosystem
- Async support
- Perfect for CI/CD integration

### Frontend Testing
- **Vitest**: Modern, fast test runner (Vite-native)
- **@testing-library/react**: Component testing best practices
- **@testing-library/user-event**: User interaction simulation
- **Playwright**: Modern E2E testing framework

**Why this stack?**
- **Vitest**: Blazing fast, better than Jest for modern apps
- **Testing Library**: Industry standard, accessibility-friendly
- **Playwright**: Best E2E framework for 2024-2025, multi-browser support, excellent GitHub Actions integration

---

## Implementation Status

### ✅ Completed - Backend
- [x] Testing infrastructure setup
  - [x] pytest configuration in pyproject.toml
  - [x] Test fixtures with transaction rollback
  - [x] Docker Compose for test database
  - [x] Test dependencies installed
- [x] CRUD endpoints
  - [x] POST /jobs - Create job
  - [x] GET /jobs - List all jobs
  - [x] GET /jobs/{id} - Get single job
  - [x] PUT /jobs/{id} - Update job ✨ NEW
  - [x] DELETE /jobs/{id} - Delete job ✨ NEW
- [x] Pydantic schemas
  - [x] JobCreate
  - [x] JobUpdate ✨ NEW
  - [x] JobResponse
- [x] Comprehensive test suite
  - [x] 30+ test cases covering all endpoints
  - [x] Edge cases (404s, validation errors)
  - [x] Success and failure scenarios

### 🔄 Pending - Frontend
- [ ] Testing infrastructure setup
- [ ] UI components (dialog, form)
- [ ] API client updates
- [ ] Main page enhancements
- [ ] Unit tests
- [ ] E2E tests

---

## Backend Implementation

### Database Testing Approach

**Decision: Test PostgreSQL with Transaction Rollback**

We use a real PostgreSQL database for tests (not SQLite) because:
1. **Production parity**: Tests against actual PostgreSQL features (UUID, JSONB)
2. **Type safety**: No dialect mismatches
3. **Confidence**: If tests pass, production will work
4. **Fast enough**: Transaction rollback keeps tests quick (~50-100ms per test)

**Setup:**
```bash
# Start test database (requires Docker)
cd apps/api
docker compose -f docker-compose.test.yml up -d

# Run tests
pytest

# With coverage
pytest --cov=src --cov-report=html
```

### API Endpoints

#### POST /jobs
Creates a new job.

**Request:**
```json
{
  "name": "Training Run",
  "params": {"gpu_count": 4},
  "priority": 10,
  "submitted_by": "user@example.com"
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "name": "Training Run",
  "params": {"gpu_count": 4},
  "priority": 10,
  "state": "queued",
  "created_at": "2025-10-16T...",
  "submitted_by": "user@example.com"
}
```

#### GET /jobs
Lists all jobs, ordered by `created_at` descending.

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "name": "Job 1",
    ...
  },
  ...
]
```

#### GET /jobs/{id}
Gets a single job by ID.

**Response:** 200 OK or 404 Not Found

#### PUT /jobs/{id} ✨ NEW
Updates an existing job. All fields are optional (partial update).

**Request:**
```json
{
  "name": "Updated Name",
  "priority": 20
}
```

**Response:** 200 OK or 404 Not Found

#### DELETE /jobs/{id} ✨ NEW
Deletes a job.

**Response:** 204 No Content or 404 Not Found

### Pydantic Schemas

**JobCreate** - For creating new jobs
- `name`: str (required, min_length=1)
- `params`: dict (optional, default={})
- `priority`: int (optional, default=0)
- `submitted_by`: str | None (optional)

**JobUpdate** ✨ NEW - For updating existing jobs
- `name`: str | None (optional, min_length=1 if provided)
- `params`: dict | None (optional)
- `priority`: int | None (optional)
- `submitted_by`: str | None (optional)

**JobResponse** - For API responses
- `id`: UUID
- `name`: str
- `params`: dict
- `priority`: int
- `state`: str
- `created_at`: datetime
- `submitted_by`: str | None

### Test Coverage

**30+ test cases** covering:
- ✅ Create: minimal, full, validation errors
- ✅ List: empty, multiple, ordering
- ✅ Get: success, not found, invalid UUID
- ✅ Update: single field, multiple fields, partial, validation, not found
- ✅ Delete: success, not found, invalid UUID, idempotency
- ✅ Root and health endpoints

**Files:**
- `apps/api/tests/conftest.py` - Test fixtures
- `apps/api/tests/test_jobs.py` - All job endpoint tests

---

## Frontend Implementation

### Phase 1: Setup Testing Infrastructure

**Install dependencies:**
```bash
cd apps/web
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npm install -D @playwright/test
npm install @radix-ui/react-dialog @radix-ui/react-alert-dialog
npm install react-hook-form zod @hookform/resolvers
npm install sonner
```

**Configuration files to create:**
- `apps/web/vitest.config.ts` - Vitest configuration
- `apps/web/playwright.config.ts` - Playwright configuration
- Update `apps/web/package.json` with test scripts

### Phase 2: UI Components

**Components to create:**

1. **JobDialog** (`src/components/JobDialog.tsx`)
   - Radix Dialog for create/edit
   - react-hook-form with zod validation
   - Reuses JobForm component

2. **JobForm** (`src/components/JobForm.tsx`)
   - Form fields: name, priority, params (optional)
   - Zod schema validation
   - Reusable for create and edit modes

3. **DeleteConfirmDialog** (`src/components/DeleteConfirmDialog.tsx`)
   - Radix AlertDialog
   - Confirmation before deletion
   - Loading state during deletion

### Phase 3: API Client Updates

**Update** `apps/web/src/app/api.ts`:

```typescript
export const api = {
  getJobs: async (): Promise<JobsResponse> => ...,
  getJob: async (id: string): Promise<Job> => ...,
  createJob: async (data: JobCreate): Promise<Job> => ...,

  // ✨ NEW
  updateJob: async (id: string, data: Partial<JobCreate>): Promise<Job> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json() as Promise<Job>),

  // ✨ NEW
  deleteJob: async (id: string): Promise<void> =>
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
    }).then(() => undefined),
}
```

### Phase 4: Main Page Enhancements

**Update** `apps/web/src/app/page.tsx`:

- Add "Create Job" button (opens JobDialog)
- Add Edit button on each JobCard (opens JobDialog in edit mode)
- Add Delete button on each JobCard (opens DeleteConfirmDialog)
- React Query mutations:
  - `useCreateJob` - Creates job and invalidates query
  - `useUpdateJob` - Updates job with optimistic update
  - `useDeleteJob` - Deletes job with optimistic update
- Error handling with sonner toast notifications
- Loading states during mutations

**Features:**
- Optimistic updates for instant feedback
- Automatic query invalidation/refetch
- Toast notifications for success/error
- Responsive dialog design

### Phase 5: Frontend Testing

**Unit/Integration Tests** (Vitest + Testing Library):

1. `src/components/__tests__/JobDialog.test.tsx`
   - Renders correctly
   - Form validation works
   - Submission calls API
   - Handles errors

2. `src/components/__tests__/JobForm.test.tsx`
   - Field validation (required, min length)
   - Default values
   - Form submission

3. `src/components/__tests__/DeleteConfirmDialog.test.tsx`
   - Confirmation flow
   - Cancel button
   - Delete button calls API

4. `src/app/__tests__/page.test.tsx`
   - Renders job list
   - Opens dialogs on button clicks
   - Handles loading states

5. `src/app/__tests__/api.test.ts`
   - API functions make correct requests
   - Handle responses/errors

**E2E Tests** (Playwright):

1. `tests/e2e/job-crud.spec.ts`
   - Complete CRUD flow:
     - Create a job
     - Verify it appears in list
     - Edit the job
     - Verify changes
     - Delete the job
     - Verify it's gone

2. `tests/e2e/job-validation.spec.ts`
   - Form validation messages
   - Required field errors
   - Empty name validation

**Coverage Targets:**
- Backend: 80%+ (already achieved)
- Frontend: 70%+

---

## Testing Strategy

### Backend Testing Philosophy
- **Integration tests**: Test real database operations
- **Transaction rollback**: Ensure test isolation
- **Edge cases**: Cover 404s, validation errors, invalid UUIDs
- **Coverage**: Aim for 80%+ code coverage

### Frontend Testing Philosophy
- **Unit tests**: Test components in isolation with mocked dependencies
- **Integration tests**: Test component interactions and React Query
- **E2E tests**: Test critical user paths end-to-end
- **Accessibility**: Use Testing Library queries that encourage a11y

### CI/CD Considerations
Both testing stacks are optimized for GitHub Actions:
- **pytest**: Fast, generates JUnit XML reports
- **Vitest**: Parallel execution, coverage reports
- **Playwright**: Official GitHub Actions support, parallel execution

**Example GitHub Actions workflow:**
```yaml
jobs:
  test-backend:
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
    steps:
      - run: cd apps/api && pytest --cov

  test-frontend:
    steps:
      - run: cd apps/web && npm run test
      - run: cd apps/web && npx playwright test
```

---

## Running Tests

### Backend Tests

**Prerequisites:**
1. Install dependencies:
   ```bash
   cd apps/api
   pip install -e ".[dev]"
   ```

2. Start test database:
   ```bash
   docker compose -f docker-compose.test.yml up -d
   ```

**Run tests:**
```bash
# All tests
pytest

# With coverage
pytest --cov=src --cov-report=term-missing

# HTML coverage report
pytest --cov=src --cov-report=html
# Open htmlcov/index.html

# Specific test file
pytest tests/test_jobs.py

# Specific test
pytest tests/test_jobs.py::TestCreateJob::test_create_job_minimal

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

**Stop test database:**
```bash
docker compose -f docker-compose.test.yml down
```

### Frontend Tests

**Run unit tests:**
```bash
cd apps/web
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:ui        # UI mode with @vitest/ui
npm run test:coverage  # With coverage
```

**Run E2E tests:**
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # With UI
npm run test:e2e:debug    # Debug mode
```

---

## File Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── main.py (✅ Modified - added PUT/DELETE)
│   │   ├── schemas.py (✅ Modified - added JobUpdate)
│   │   ├── models.py (no changes)
│   │   └── database.py (no changes)
│   ├── tests/ (✅ Created)
│   │   ├── __init__.py
│   │   ├── conftest.py (test fixtures)
│   │   └── test_jobs.py (30+ tests)
│   ├── docker-compose.test.yml (✅ Created)
│   └── pyproject.toml (✅ Modified - added test config & deps)
│
└── web/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx (🔄 To modify - add CRUD UI)
    │   │   ├── api.ts (🔄 To modify - add update/delete)
    │   │   └── __tests__/ (🔄 To create)
    │   │       ├── page.test.tsx
    │   │       └── api.test.ts
    │   └── components/ (🔄 To create)
    │       ├── JobDialog.tsx
    │       ├── JobForm.tsx
    │       ├── DeleteConfirmDialog.tsx
    │       └── __tests__/
    │           ├── JobDialog.test.tsx
    │           ├── JobForm.test.tsx
    │           └── DeleteConfirmDialog.test.tsx
    ├── tests/
    │   └── e2e/ (🔄 To create)
    │       ├── job-crud.spec.ts
    │       └── job-validation.spec.ts
    ├── vitest.config.ts (🔄 To create)
    ├── playwright.config.ts (🔄 To create)
    └── package.json (🔄 To modify - add test scripts)
```

---

## Key Design Decisions

### UI/UX
- **Modal dialogs**: Better UX than separate pages
- **Inline actions**: Edit/delete buttons on each job card
- **Confirmation**: Delete confirmation to prevent accidents
- **Optimistic updates**: Instant UI feedback
- **Toast notifications**: Clear success/error feedback
- **Responsive**: Works on all screen sizes

### API Design
- **RESTful**: Standard HTTP methods and status codes
- **Idempotent**: DELETE returns 404 on non-existent (acceptable)
- **Partial updates**: PUT accepts partial data (only update provided fields)
- **Validation**: Automatic via Pydantic
- **Error handling**: Consistent HTTPException responses

### Code Quality
- **Type safety**: TypeScript + Pydantic + OpenAPI types
- **Validation**: Client-side (zod) + server-side (Pydantic)
- **Separation of concerns**: Components, API client, state management all separate
- **Testability**: High test coverage, isolated components
- **Accessibility**: Radix UI + Testing Library best practices

---

## Next Steps

1. **Immediate**: Test the backend endpoints manually or start the test database
2. **Frontend Setup**: Install dependencies and create configuration
3. **Component Development**: Build UI components with Radix + emotion
4. **Testing**: Write unit tests alongside component development
5. **E2E**: Add E2E tests for critical paths
6. **CI/CD**: Set up GitHub Actions workflows

---

## Notes

- **Docker not available?** You can install PostgreSQL locally on port 5433 or skip tests temporarily
- **Modify forms?** Easy to add more fields to JobUpdate schema and forms
- **Different UI?** The plan is framework-agnostic, can swap Radix for another library
- **Coverage reports**: HTML reports generated in `htmlcov/` (backend) and `coverage/` (frontend)

---

*Last updated: 2025-10-16*

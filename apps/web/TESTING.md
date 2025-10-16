# Frontend Testing Guide

This document describes the testing setup and how to run tests for the web application.

## Testing Stack

### Unit & Integration Tests (Vitest)
- **Framework**: Vitest 3.2+
- **Testing Library**: @testing-library/react 16.3+
- **User Events**: @testing-library/user-event 14.6+
- **Environment**: jsdom

### E2E Tests (Playwright)
- **Framework**: Playwright 1.56+
- **Browser**: Chromium (installed)
- **Test Location**: `tests/e2e/`

## Running Tests

### Unit/Integration Tests

```bash
# Run all unit tests once
npm run test

# Watch mode (re-run on file changes)
npm run test:watch

# UI mode (interactive test runner)
npm run test:ui

# With coverage report
npm run test:coverage
```

Coverage reports are generated in:
- Terminal: `--cov-report=term-missing`
- HTML: `coverage/index.html`

### E2E Tests

**Prerequisites:** Make sure the dev server and API are running!

```bash
# Terminal 1: Start the web dev server
npm run dev

# Terminal 2: Start the API
cd ../api
python -m uvicorn src.main:app --reload

# Terminal 3: Run E2E tests
npm run test:e2e         # Headless mode
npm run test:e2e:ui      # UI mode (recommended for debugging)
npm run test:e2e:debug   # Debug mode with step-through
```

## Test Files

### Unit Tests

**Component Tests:**
- `src/components/__tests__/JobForm.test.tsx` (10 tests)
  - Form rendering
  - Validation (required fields, ranges)
  - Submission
  - Loading states
  - Default values

- `src/components/__tests__/JobDialog.test.tsx` (9 tests)
  - Dialog open/close
  - Form integration
  - Edit vs Create modes
  - Validation integration

- `src/components/__tests__/DeleteConfirmDialog.test.tsx` (9 tests)
  - Confirmation flow
  - Cancel/Confirm actions
  - Loading states
  - Job name display

**API Tests:**
- `src/app/__tests__/api.test.ts` (15+ tests)
  - GET /jobs
  - GET /jobs/{id}
  - POST /jobs
  - PUT /jobs/{id}
  - DELETE /jobs/{id}
  - Partial updates
  - Error handling

**Total Unit Tests: ~43 tests**

### E2E Tests

**CRUD Flow:**
- `tests/e2e/job-crud.spec.ts` (8 tests)
  - Complete CREATE → UPDATE → DELETE flow
  - Multiple job creation
  - Cancel operations (create, edit, delete)
  - Job metadata display
  - Empty state

**Validation:**
- `tests/e2e/job-validation.spec.ts` (13 tests)
  - Empty name validation
  - Whitespace validation
  - Priority range (0-100)
  - Special characters in names
  - Long names
  - Default values
  - Edit mode validation

**Total E2E Tests: 21 tests**

---

**Grand Total: ~64 tests**

## Test Coverage Goals

- **Components**: 80%+
- **API Client**: 90%+
- **Overall**: 70%+

## Writing New Tests

### Unit Test Template

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { YourComponent } from '../YourComponent'

describe('YourComponent', () => {
  it('does something', async () => {
    const user = userEvent.setup()
    render(<YourComponent />)

    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)

    expect(screen.getByText(/result/i)).toBeInTheDocument()
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('does something', async ({ page }) => {
    await page.getByRole('button', { name: /click/i }).click()
    await expect(page.getByText(/result/i)).toBeVisible()
  })
})
```

## Best Practices

### Unit Tests
1. **Test behavior, not implementation**
   - Use `getByRole`, `getByLabelText` instead of class names
   - Focus on user interactions

2. **Mock external dependencies**
   - Mock API calls with `vi.fn()`
   - Mock React Query when needed

3. **Keep tests isolated**
   - Clear mocks in `beforeEach`
   - Don't rely on test execution order

### E2E Tests
1. **Use semantic selectors**
   - Prefer `getByRole`, `getByText` over CSS selectors
   - Use `getByLabel` for form inputs

2. **Wait for async operations**
   - Use `await expect(...).toBeVisible()`
   - Set timeouts for slow operations

3. **Clean up test data**
   - In production, use test database
   - Reset state between tests

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Tests

### Vitest
```bash
# Run specific test file
npm run test JobForm.test.tsx

# Run tests matching pattern
npm run test -- --grep "validation"

# Debug in VS Code
# Add breakpoint and use "JavaScript Debug Terminal"
```

### Playwright
```bash
# Debug mode (step through)
npm run test:e2e:debug

# Run specific test
npx playwright test job-crud.spec.ts

# Run with visible browser
npx playwright test --headed

# Show trace viewer
npx playwright show-report
```

## Common Issues

### Issue: "Cannot find module '@testing-library/jest-dom'"
**Solution:** Make sure `vitest.setup.ts` imports it correctly

### Issue: E2E tests timeout
**Solution:**
- Increase timeout in test: `test.setTimeout(60000)`
- Check if API is running
- Check if port 3000 is available

### Issue: "Element not found" in E2E
**Solution:**
- Wait for element: `await expect(...).toBeVisible()`
- Check selector: Use Playwright Inspector
- Verify app state

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*Last updated: 2025-10-16*

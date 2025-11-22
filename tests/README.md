# Playwright E2E Tests for Finders CRM

This directory contains end-to-end tests for the Finders CRM application using Playwright.

## Quick Start

### 1. Install Dependencies

```bash
# Install Playwright and browsers
npx playwright install

# Install TypeScript dependencies (if not already installed)
npm install --save-dev @playwright/test typescript @types/node @types/pg
```

### 2. Configure Test Environment

1. Copy the example environment file:
   ```bash
   cp .env.test.example .env.test
   ```

2. Edit `.env.test` with your test database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=finders_crm_test
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   BACKEND_URL=http://localhost:10000
   FRONTEND_URL=http://localhost:3000
   
   TEST_ADMIN_EMAIL=admin@test.com
   TEST_ADMIN_PASSWORD=admin123
   ```

3. Create the test database:
   ```bash
   createdb finders_crm_test
   ```

4. Ensure your backend database tables are created (run migrations or setup scripts)

### 3. Run Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests in UI mode (recommended for development)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug
```

## Test Structure

```
tests/
├── e2e/                    # E2E test files
│   ├── auth.spec.ts       # Authentication tests
│   ├── properties.spec.ts  # Properties page tests
│   ├── leads.spec.ts      # Leads page tests
│   ├── calendar.spec.ts   # Calendar page tests
│   ├── reports.spec.ts    # Reports page tests
│   ├── hr.spec.ts         # HR page tests
│   ├── settings.spec.ts   # Settings page tests
│   ├── categories-statuses.spec.ts  # Categories and statuses tests
│   └── setup.spec.ts      # Setup tests (creates auth states)
├── helpers/               # Test helper functions
│   ├── auth.ts           # Authentication helpers
│   ├── db.ts             # Database helpers
│   └── api.ts            # API request helpers
├── .auth/                 # Authenticated storage states (auto-generated)
├── globalSetup.ts         # Global test setup (DB reset, seeding)
└── globalTeardown.ts      # Global test teardown (cleanup)
```

## Test Execution Flow

1. **Global Setup** (`globalSetup.ts`):
   - Resets test database
   - Seeds initial test data (users, categories, statuses, properties, leads, events)
   - Creates authenticated storage states for different user roles

2. **Test Execution**:
   - Each test file runs independently
   - Tests use pre-authenticated storage states
   - Tests create unique data using timestamps

3. **Global Teardown** (`globalTeardown.ts`):
   - Optional database cleanup (if `CLEAN_DB_ON_TEARDOWN=true`)

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page
    await page.goto('/my-page');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Your test code
    await expect(page.locator('h1')).toHaveText('Expected Text');
  });
});
```

### Using Helpers

```typescript
import { loginViaUI, logout } from '../helpers/auth';
import { query } from '../helpers/db';

test('should login', async ({ page }) => {
  await loginViaUI(page, {
    email: 'admin@test.com',
    password: 'admin123',
  });
  
  // Verify login
  await expect(page).toHaveURL(/\/properties/);
});
```

### Best Practices

1. **Wait for elements**: Always use `waitForSelector` or `waitForLoadState` before interacting
2. **Check visibility**: Use `isVisible()` before clicking elements that might not exist
3. **Unique data**: Use timestamps or UUIDs for test data to avoid conflicts
4. **Clean up**: Tests should be independent - don't rely on data from other tests
5. **Handle optional elements**: Use conditional checks for elements that might not be visible for all roles

## Debugging Tests

### View Test Report
```bash
npx playwright show-report
```

### Debug a Specific Test
```bash
npx playwright test tests/e2e/auth.spec.ts --debug
```

### View Screenshots
Screenshots are saved in `test-results/` directory on test failures.

### View Videos
Videos are saved in `test-results/` directory for failed tests.

### Console Logs
Add `console.log()` statements in your tests to debug:
```typescript
test('my test', async ({ page }) => {
  console.log('Current URL:', page.url());
  await page.screenshot({ path: 'debug.png' });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm install
          npx playwright install --with-deps
      - name: Run tests
        run: npx playwright test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: finders_crm_test
          DB_USER: postgres
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Database Connection Issues
- Verify `.env.test` has correct database credentials
- Ensure PostgreSQL is running
- Check database exists: `psql -l | grep finders_crm_test`

### Authentication Issues
- Verify test users exist in database
- Check JWT_SECRET matches backend configuration
- Clear `.auth/` directory and re-run setup

### Test Timeouts
- Increase timeout in `playwright.config.ts`
- Check if backend/frontend servers are running
- Verify network connectivity

### Flaky Tests
- Add more explicit waits
- Use `waitForLoadState('networkidle')` after navigation
- Check for race conditions in test code

## Test Data

Test data is automatically seeded in `globalSetup.ts`. The following data is created:

- **Users**: Admin, Agent, Operations Manager
- **Categories**: Apartment, Villa, Office, Shop, Land
- **Statuses**: Available, Sold, Rented, Reserved
- **Lead Statuses**: Active, Closed, Follow Up
- **Properties**: 5 sample properties
- **Leads**: 5 sample leads
- **Calendar Events**: 3 sample events

## Maintenance

### Updating Test Data
Edit `tests/globalSetup.ts` to modify seeded test data.

### Adding New Test Files
1. Create new file in `tests/e2e/`
2. Follow existing test patterns
3. Update `E2E_TEST_PLAN.md` with new test cases

### Updating Helpers
Modify helper files in `tests/helpers/` as needed. All tests automatically use updated helpers.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Plan](./E2E_TEST_PLAN.md)
- [Architecture Analysis](../E2E_TEST_ANALYSIS.md)


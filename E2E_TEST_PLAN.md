# E2E Test Plan - Finders CRM

## Overview
This document outlines the comprehensive E2E test plan for the Finders CRM application using Playwright.

## Test Environment Setup

### Prerequisites
1. PostgreSQL database (test database: `finders_crm_test`)
2. Backend server running on `http://localhost:10000`
3. Frontend server running on `http://localhost:3000`
4. Test users created in database

### Test Data
- **Admin User**: admin@test.com / admin123
- **Agent User**: agent@test.com / agent123
- **Operations Manager**: opsmanager@test.com / ops123

---

## Test Suites

### 1. Authentication Tests (`auth.spec.ts`)

#### Test Cases:
- ✅ Display login page
- ✅ Login successfully with valid credentials
- ✅ Show error with invalid credentials
- ✅ Show error with empty credentials
- ✅ Logout successfully
- ✅ Redirect authenticated user from login page
- ✅ Protect dashboard routes
- ✅ Protect properties route

**Required Test Data**: None (uses seeded test users)

---

### 2. Properties Tests (`properties.spec.ts`)

#### Test Cases:
- ✅ Display properties list
- ✅ Show add property button (permission-based)
- ✅ Filter properties by status
- ✅ Open add property modal
- ✅ Create a new property
- ✅ View property details
- ✅ Edit property
- ✅ Delete property with confirmation
- ✅ Search properties
- ✅ Navigate to categories page
- ✅ Navigate to statuses page

**Required Test Data**:
- Categories (Apartment, Villa, Office, Shop, Land)
- Statuses (Available, Sold, Rented, Reserved)
- At least 5 properties with various statuses

**Database Tables**: `properties`, `categories`, `statuses`, `users`

---

### 3. Leads Tests (`leads.spec.ts`)

#### Test Cases:
- ✅ Display leads list
- ✅ Show add lead button (permission-based)
- ✅ Filter leads by status
- ✅ Create a new lead
- ✅ View lead details
- ✅ Edit lead
- ✅ Delete lead with confirmation
- ✅ Add referral to lead
- ✅ Add note to lead
- ✅ Navigate to lead statuses page

**Required Test Data**:
- Lead statuses (Active, Closed, Follow Up)
- At least 5 leads
- Agents for assignment

**Database Tables**: `leads`, `lead_statuses`, `users`

---

### 4. Calendar Tests (`calendar.spec.ts`)

#### Test Cases:
- ✅ Display calendar
- ✅ Switch between month, week, and day views
- ✅ Create a new calendar event
- ✅ Click on calendar day to create event
- ✅ View event details
- ✅ Edit event
- ✅ Delete event
- ✅ Link event to property
- ✅ Link event to lead
- ✅ Filter events

**Required Test Data**:
- At least 3 calendar events
- Properties for linking
- Leads for linking

**Database Tables**: `calendar_events`, `properties`, `leads`, `users`

---

### 5. Reports Tests (`reports.spec.ts`)

#### Test Cases:
- ✅ Display reports page
- ✅ Show report tabs
- ✅ Switch between report tabs
- ✅ Display Monthly Agent Statistics tab
- ✅ Display DCSR Report tab
- ✅ Create a new report
- ✅ Filter reports by date range
- ✅ Export report to Excel
- ✅ Export report to PDF
- ✅ View report details
- ✅ Edit report
- ✅ Delete report

**Required Test Data**:
- Properties with various statuses
- Leads
- Users (agents)
- Existing reports (optional)

**Database Tables**: `reports`, `monthly_agent_reports`, `dcsr_reports`, `operations_commission_reports`, `properties`, `leads`, `users`

---

### 6. HR Tests (`hr.spec.ts`)

#### Test Cases:
- ✅ Display users list
- ✅ Show add user button (permission-based)
- ✅ Filter users by role
- ✅ Create a new user
- ✅ View user details
- ✅ Edit user
- ✅ Delete user with confirmation
- ✅ Search users
- ✅ Assign agent to team leader
- ✅ View user documents

**Required Test Data**:
- Multiple users with different roles
- Team leaders
- Agents

**Database Tables**: `users`, `user_documents`

---

### 7. Settings Tests (`settings.spec.ts`)

#### Test Cases:
- ✅ Display settings page
- ✅ Show settings tabs or sections
- ✅ Update SMTP settings
- ✅ Update commission settings
- ✅ Validate settings form
- ✅ Restrict access to non-admin users

**Required Test Data**: None (uses system settings)

**Database Tables**: `settings`

---

### 8. Categories and Statuses Tests (`categories-statuses.spec.ts`)

#### Test Cases:
- ✅ Display categories list
- ✅ Create a new category
- ✅ Edit category
- ✅ Delete category
- ✅ Display statuses list
- ✅ Create a new status
- ✅ Edit status
- ✅ Delete status

**Required Test Data**:
- Existing categories
- Existing statuses

**Database Tables**: `categories`, `statuses`

---

## Test Execution Strategy

### Test Isolation
- Each test should be independent
- Database is reset before all tests (in globalSetup)
- Test data is seeded before all tests
- Tests use authenticated storage states

### Test Data Management
- **Setup**: Database reset and seed in `globalSetup.ts`
- **Teardown**: Optional cleanup in `globalTeardown.ts`
- **Isolation**: Each test creates unique data (using timestamps)

### Authentication Strategy
- Pre-authenticated storage states created in setup
- Different user roles tested separately
- Permission-based tests verify role restrictions

### Flaky Test Prevention
- Use `waitForLoadState('networkidle')` after navigation
- Use proper wait conditions (not just timeouts)
- Check element visibility before interaction
- Handle optional elements gracefully

---

## Running Tests

### Initial Setup
```bash
# Install Playwright
npx playwright install

# Copy and configure test environment
cp .env.test.example .env.test
# Edit .env.test with your database credentials

# Create test database
createdb finders_crm_test

# Run database migrations (if needed)
# Run backend setup scripts to create tables
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test Suite
```bash
npx playwright test tests/e2e/auth.spec.ts
npx playwright test tests/e2e/properties.spec.ts
```

### Run Tests in UI Mode
```bash
npx playwright test --ui
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Tests for Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Generate Test Report
```bash
npx playwright show-report
```

---

## Test Coverage Summary

### Pages Covered
- ✅ Login/Home page
- ✅ Properties page
- ✅ Properties Categories page
- ✅ Properties Statuses page
- ✅ Leads page
- ✅ Lead Statuses page
- ✅ Calendar page
- ✅ Reports page
- ✅ HR page
- ✅ Settings page

### User Flows Covered
- ✅ Authentication flow (login, logout)
- ✅ Property CRUD operations
- ✅ Lead CRUD operations
- ✅ Calendar event management
- ✅ Report generation and export
- ✅ User management (HR)
- ✅ Settings management
- ✅ Category and status management

### Edge Cases Covered
- ✅ Invalid credentials
- ✅ Empty form submissions
- ✅ Permission-based access control
- ✅ Confirmation dialogs
- ✅ Form validation
- ✅ Search and filtering

---

## Maintenance

### Adding New Tests
1. Create test file in `tests/e2e/`
2. Follow existing test patterns
3. Use helpers from `tests/helpers/`
4. Update this test plan document

### Updating Test Data
1. Modify `tests/globalSetup.ts` seed function
2. Update `scripts/seedTestDB.ts` if needed
3. Ensure test data is unique (use timestamps)

### Debugging Failed Tests
1. Check test report: `npx playwright show-report`
2. View screenshots in `test-results/`
3. Check videos in `test-results/`
4. Run tests in debug mode: `npx playwright test --debug`

---

## Known Limitations

1. **Image Upload Tests**: File upload tests may need adjustment based on actual implementation
2. **CSRF Tokens**: Tests handle CSRF tokens automatically via storage state
3. **Time-dependent Tests**: Calendar tests use relative dates to avoid flakiness
4. **Permission Tests**: Some permission tests may need adjustment based on actual role implementation

---

## Future Enhancements

1. Add visual regression tests
2. Add API integration tests
3. Add performance tests
4. Add accessibility tests
5. Add mobile responsive tests


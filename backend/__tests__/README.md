# Report Unit Tests

This directory contains comprehensive unit tests for all report types in the Finders CRM system.

## Test Coverage

The test suite covers the following reports:

1. **Monthly Agent Statistics Report** (`monthlyAgentStatistics.test.js`)
   - Creating reports with valid/invalid data
   - Getting all reports with filters
   - Getting report by ID
   - Updating reports
   - Recalculating reports
   - Deleting reports
   - Getting lead sources

2. **DCSR Report** (`dcsrReport.test.js`)
   - Creating company-wide reports
   - Filtering by date range, month, year
   - Updating and recalculating reports
   - Deleting reports

3. **Sale & Rent Source Report** (`saleRentSource.test.js`)
   - Generating reports for specific agents
   - Handling multiple sources
   - Handling empty results
   - Error scenarios

4. **Operations Commission Report** (`operationsCommission.test.js`)
   - Creating commission reports
   - Updating commission percentages and amounts
   - Recalculating commission data
   - Filtering and querying reports

5. **Operations Daily Report** (`operationsDaily.test.js`)
   - Creating daily reports for operations staff
   - Manual input fields (contracts, efficiency metrics)
   - Recalculating automatic fields
   - Filtering by operations_id and date range

## Running Tests

### Install Dependencies

First, make sure you have the test dependencies installed:

```bash
cd backend
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- monthlyAgentStatistics.test.js
npm test -- dcsrReport.test.js
npm test -- saleRentSource.test.js
npm test -- operationsCommission.test.js
npm test -- operationsDaily.test.js
```

## Test Scenarios Covered

Each test file covers the following scenarios:

### Success Cases
- ✅ Valid data creation
- ✅ Successful retrieval
- ✅ Successful updates
- ✅ Successful deletion
- ✅ Successful recalculation

### Validation Cases
- ✅ Missing required fields
- ✅ Invalid date formats
- ✅ Invalid date ranges (end before start)
- ✅ Duplicate report creation

### Error Cases
- ✅ Database connection errors
- ✅ Report not found (404)
- ✅ Server errors (500)
- ✅ Conflict errors (409)

### Edge Cases
- ✅ Empty result sets
- ✅ Backwards compatibility (date_from/date_to)
- ✅ Optional parameters
- ✅ Integer parsing
- ✅ Multiple filters

## Test Structure

Each test file follows this structure:

```javascript
describe('Report Name', () => {
  describe('createReport', () => {
    // Test creation scenarios
  });
  
  describe('getAllReports', () => {
    // Test retrieval scenarios
  });
  
  describe('getReportById', () => {
    // Test single report retrieval
  });
  
  describe('updateReport', () => {
    // Test update scenarios
  });
  
  describe('deleteReport', () => {
    // Test deletion scenarios
  });
});
```

## Mocking

The tests use Jest mocks to:
- Mock database models (`reportsModel`, `dcsrReportsModel`, etc.)
- Mock database connections (`config/db`)
- Isolate controller logic from database operations

## Adding New Tests

When adding new test cases:

1. Follow the existing test structure
2. Test both success and failure scenarios
3. Include edge cases
4. Mock all external dependencies
5. Use descriptive test names
6. Group related tests with `describe` blocks

## Notes

- Tests are isolated and don't require a running database
- All database operations are mocked
- Tests run quickly without external dependencies
- Coverage reports can be generated with `npm run test:coverage`


# PROPERTY EDIT FUNCTIONALITY - EXTENSIVE TESTING GUIDE

## REQUIRED FIELDS (Must be filled)
Based on the database schema and validation logic:
- `status_id` (number) - Must be a valid status ID
- `location` (string) - Cannot be empty
- `category_id` (number) - Must be a valid category ID  
- `owner_name` (string) - Cannot be empty
- `phone_number` (string) - Cannot be empty
- `surface` (number) - Must be a positive number
- `view_type` (string) - Must be one of: 'open view', 'sea view', 'mountain view', 'no view'
- `price` (number) - Must be a positive number
- `concierge` (boolean) - Must be true or false
- `details` (string) - Cannot be empty
- `interior_details` (string) - Cannot be empty

## TEST SCENARIOS TO TRY

### 1. MISSING REQUIRED FIELDS (Should Show Validation Errors)
- [ ] Try to save with empty `status_id`
- [ ] Try to save with empty `location`
- [ ] Try to save with empty `category_id`
- [ ] Try to save with empty `owner_name`
- [ ] Try to save with empty `phone_number`
- [ ] Try to save with empty `surface`
- [ ] Try to save with empty `view_type`
- [ ] Try to save with empty `price`
- [ ] Try to save with unchecked `concierge`
- [ ] Try to save with empty `details`
- [ ] Try to save with empty `interior_details`

### 2. INVALID DATA TYPES (Should Show Type Errors)
- [ ] Try to save `status_id` as string "abc"
- [ ] Try to save `category_id` as string "xyz"
- [ ] Try to save `surface` as string "not a number"
- [ ] Try to save `price` as string "invalid price"
- [ ] Try to save `built_year` as string "future year"
- [ ] Try to save `phone_number` as number 12345

### 3. BOUNDARY VALUES & EDGE CASES
- [ ] Try `surface` = 0 (should fail - must be positive)
- [ ] Try `surface` = -100 (should fail - negative not allowed)
- [ ] Try `surface` = 999999999.99 (very large number)
- [ ] Try `price` = 0 (should fail - must be positive)
- [ ] Try `price` = -50000 (should fail - negative not allowed)
- [ ] Try `price` = 999999999999.99 (very large number)
- [ ] Try `built_year` = 1800 (very old year)
- [ ] Try `built_year` = 2030 (future year)
- [ ] Try `phone_number` = "123" (too short)
- [ ] Try `phone_number` = "a".repeat(1000) (very long string)

### 4. INVALID VIEW TYPE VALUES
- [ ] Try `view_type` = "invalid view"
- [ ] Try `view_type` = "GARDEN VIEW"
- [ ] Try `view_type` = "123"
- [ ] Try `view_type` = ""

### 5. SQL INJECTION ATTEMPTS
- [ ] Try `location` = "'; DROP TABLE properties; --"
- [ ] Try `owner_name` = "'; INSERT INTO users VALUES (999, 'hacker', 'hacker@evil.com'); --"
- [ ] Try `details` = "'; UPDATE properties SET price = 0; --"
- [ ] Try `phone_number` = "'; DELETE FROM properties; --"

### 6. XSS ATTEMPTS
- [ ] Try `owner_name` = "<script>alert('XSS')</script>"
- [ ] Try `location` = "<img src=x onerror=alert('XSS')>"
- [ ] Try `details` = "javascript:alert('XSS')"
- [ ] Try `notes` = "<iframe src='javascript:alert(\"XSS\")'></iframe>"

### 7. SPECIAL CHARACTERS & UNICODE
- [ ] Try `owner_name` = "José María O'Connor-Smith"
- [ ] Try `location` = "123 Main St. #4B, New York, NY 10001"
- [ ] Try `details` = "Floor: 15th, Balcony: Yes, Parking: Underground"
- [ ] Try `notes` = "Special characters: !@#$%^&*()_+-=[]{}|;':\",./<>?"

### 8. VERY LONG STRINGS
- [ ] Try `location` = "a".repeat(10000) (10,000 characters)
- [ ] Try `owner_name` = "a".repeat(1000) (1,000 characters)
- [ ] Try `details` = "a".repeat(5000) (5,000 characters)
- [ ] Try `notes` = "a".repeat(10000) (10,000 characters)

### 9. WHITESPACE ONLY VALUES
- [ ] Try `location` = "   " (only spaces)
- [ ] Try `owner_name` = "\t\t\t" (only tabs)
- [ ] Try `details` = "\n\n\n" (only newlines)
- [ ] Try `phone_number` = " " (single space)

### 10. NULL/UNDEFINED VALUES
- [ ] Try to set `status_id` to null
- [ ] Try to set `category_id` to undefined
- [ ] Try to set `price` to null
- [ ] Try to set `concierge` to null

## TESTING STEPS

1. **Open Properties Page**: Navigate to http://localhost:3000/dashboard/properties
2. **Login**: Ensure you're logged in with appropriate permissions
3. **Find a Property**: Look for an existing property to edit
4. **Click Edit**: Click the edit button on any property
5. **Systematic Testing**: Go through each test scenario above
6. **Document Results**: Note what happens for each test case
7. **Check Console**: Monitor browser console for errors
8. **Check Network**: Monitor network requests in DevTools
9. **Check Backend Logs**: Monitor backend console for errors

## EXPECTED BEHAVIORS

### Frontend Validation (Should Happen Before API Call)
- Required field validation
- Data type validation
- Format validation

### Backend Validation (Should Happen After API Call)
- Database constraint validation
- Business logic validation
- Security validation

### Error Handling
- Clear error messages
- Form not submitted on validation failure
- User-friendly error display
- No crashes or infinite loops

## REPORTING

For each test case, document:
1. **Test Case**: What was tested
2. **Input**: What data was entered
3. **Expected Result**: What should happen
4. **Actual Result**: What actually happened
5. **Status**: Pass/Fail/Error
6. **Notes**: Any additional observations

---

**START TESTING NOW**: Open the properties page and begin systematic testing!



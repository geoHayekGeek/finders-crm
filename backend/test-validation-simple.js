const { body, validationResult } = require('express-validator');
const { validatePropertyUpdate } = require('./middlewares/propertyValidation');

console.log('Testing property validation rules...');

// Test case 1: Valid data
console.log('\n=== Test 1: Valid Property Data ===');
const validData = {
  title: 'Test Property',
  description: 'A valid property description that meets the minimum length requirement',
  price: 250000,
  surface: 150,
  location: 'Downtown',
  status_id: 1,
  category_id: 1,
  owner_name: 'John Doe',
  phone_number: '+1234567890',
  view_type: 'open view',
  concierge: true,
  details: 'Some detailed information about the property that meets the minimum length requirement',
  interior_details: 'Interior details about the property that meets the minimum length requirement'
};

console.log('Valid data:', JSON.stringify(validData, null, 2));

// Test case 2: Missing required fields
console.log('\n=== Test 2: Missing Required Fields ===');
const invalidData1 = {
  title: 'Test Property',
  // Missing description, price, surface, location, status_id, category_id, etc.
};

console.log('Invalid data (missing fields):', JSON.stringify(invalidData1, null, 2));

// Test case 3: XSS attempt
console.log('\n=== Test 3: XSS Attempt ===');
const invalidData2 = {
  title: 'Test Property',
  description: '<script>alert("xss")</script>',
  price: 250000,
  surface: 150,
  location: 'Downtown',
  status_id: 1,
  category_id: 1,
  owner_name: 'John Doe',
  phone_number: '+1234567890',
  view_type: 'open view',
  concierge: true,
  details: 'javascript:alert("xss")',
  interior_details: 'onload=alert("xss")'
};

console.log('Invalid data (XSS attempt):', JSON.stringify(invalidData2, null, 2));

// Test case 4: Invalid values
console.log('\n=== Test 4: Invalid Values ===');
const invalidData3 = {
  title: 'Test Property',
  description: 'A valid property description that meets the minimum length requirement',
  price: -1000, // Invalid negative price
  surface: 0, // Invalid zero surface
  location: 'Downtown',
  status_id: 1,
  category_id: 1,
  owner_name: 'John Doe',
  phone_number: 'invalid-phone', // Invalid phone format
  view_type: 'invalid-view', // Invalid view type
  concierge: true,
  details: 'Some detailed information about the property that meets the minimum length requirement',
  interior_details: 'Interior details about the property that meets the minimum length requirement'
};

console.log('Invalid data (invalid values):', JSON.stringify(invalidData3, null, 2));

console.log('\n=== Validation Test Results ===');

// Test validation for each case
const testCases = [
  { name: 'Valid Data', data: validData, expectedValid: true },
  { name: 'Missing Required Fields', data: invalidData1, expectedValid: false },
  { name: 'XSS Attempt', data: invalidData2, expectedValid: false },
  { name: 'Invalid Values', data: invalidData3, expectedValid: false }
];

testCases.forEach((testCase, index) => {
  console.log(`\n--- ${testCase.name} ---`);
  
  // Create mock request
  const mockReq = { body: testCase.data };
  const mockRes = {
    status: (code) => ({
      json: (data) => ({ statusCode: code, data })
    })
  };
  const mockNext = () => {};
  
  try {
    // Apply validation rules
    validatePropertyUpdate.forEach(validation => {
      validation(mockReq, mockRes, mockNext);
    });
    
    // Check results
    const errors = validationResult(mockReq);
    const isValid = errors.isEmpty();
    
    console.log(`Expected: ${testCase.expectedValid ? 'Valid' : 'Invalid'}`);
    console.log(`Actual: ${isValid ? 'Valid' : 'Invalid'}`);
    console.log(`Result: ${isValid === testCase.expectedValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!isValid) {
      console.log('Validation errors:');
      errors.array().forEach(error => {
        console.log(`  - ${error.path}: ${error.msg}`);
      });
    }
    
  } catch (error) {
    console.log(`Error during validation: ${error.message}`);
    console.log(`Result: ❌ ERROR`);
  }
});




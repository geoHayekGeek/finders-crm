const express = require('express');
const { body, validationResult } = require('express-validator');
const { validatePropertyUpdate, handleValidationErrors } = require('./middlewares/propertyValidation');

// Create a test Express app
const app = express();
app.use(express.json());

// Add test route with validation
app.post('/test-property', validatePropertyUpdate, handleValidationErrors, (req, res) => {
  res.json({ success: true, message: 'Property validation passed' });
});

// Test cases
const testCases = [
  {
    name: 'Valid Property Data',
    data: {
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
    },
    expectedValid: true
  },
  {
    name: 'XSS Attempt in Description',
    data: {
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
      details: 'Some detailed information about the property that meets the minimum length requirement',
      interior_details: 'Interior details about the property that meets the minimum length requirement'
    },
    expectedValid: false
  },
  {
    name: 'XSS Attempt in Details',
    data: {
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
      details: 'javascript:alert("xss")',
      interior_details: 'Interior details about the property that meets the minimum length requirement'
    },
    expectedValid: false
  },
  {
    name: 'Invalid Price (Negative)',
    data: {
      title: 'Test Property',
      description: 'A valid property description that meets the minimum length requirement',
      price: -1000,
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
    },
    expectedValid: false
  },
  {
    name: 'Invalid Surface (Zero)',
    data: {
      title: 'Test Property',
      description: 'A valid property description that meets the minimum length requirement',
      price: 250000,
      surface: 0,
      location: 'Downtown',
      status_id: 1,
      category_id: 1,
      owner_name: 'John Doe',
      phone_number: '+1234567890',
      view_type: 'open view',
      concierge: true,
      details: 'Some detailed information about the property that meets the minimum length requirement',
      interior_details: 'Interior details about the property that meets the minimum length requirement'
    },
    expectedValid: false
  }
];

console.log('=== Express Validation Test ===\n');

// Test each case
testCases.forEach((testCase, index) => {
  console.log(`--- Test ${index + 1}: ${testCase.name} ---`);
  
  // Create a test request
  const testReq = {
    method: 'POST',
    url: '/test-property',
    body: testCase.data,
    headers: { 'content-type': 'application/json' }
  };
  
  const testRes = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    }
  };
  
  let nextCalled = false;
  const testNext = (error) => {
    if (error) {
      console.log(`  Next called with error: ${error.message}`);
    }
    nextCalled = true;
  };
  
  // Simulate the validation process
  try {
    // Apply validation middleware
    validatePropertyUpdate.forEach(validation => {
      validation(testReq, testRes, testNext);
    });
    
    // Check validation results
    const errors = validationResult(testReq);
    const isValid = errors.isEmpty();
    
    console.log(`  Expected: ${testCase.expectedValid ? 'Valid' : 'Invalid'}`);
    console.log(`  Actual: ${isValid ? 'Valid' : 'Invalid'}`);
    console.log(`  Result: ${isValid === testCase.expectedValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!isValid) {
      console.log('  Validation errors:');
      errors.array().forEach(error => {
        console.log(`    - ${error.path}: ${error.msg}`);
      });
    }
    
  } catch (error) {
    console.log(`  Error during validation: ${error.message}`);
    console.log(`  Result: ❌ ERROR`);
  }
  
  console.log('');
});

console.log('=== Test Summary ===');
console.log('Note: This test simulates the validation middleware but may not catch all validation errors');
console.log('The actual Express validation chain needs to be tested in a running server context.');




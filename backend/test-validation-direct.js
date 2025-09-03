const express = require('express');
const { body, validationResult } = require('express-validator');
const { validatePropertyUpdate, handleValidationErrors, sanitizeRequestBody } = require('./middlewares/propertyValidation');

console.log('Testing validation middleware directly...');

// Create a test Express app
const app = express();
app.use(express.json());

// Test route with validation (without authentication)
app.put('/test-property/:id', 
  sanitizeRequestBody,
  validatePropertyUpdate, 
  handleValidationErrors, 
  (req, res) => {
    res.json({ 
      success: true, 
      message: 'Property validation passed',
      data: req.body 
    });
  }
);

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

console.log('\n=== Direct Validation Test Results ===');

// Test each case by simulating the Express middleware chain
testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  
  // Create mock request and response
  const mockReq = {
    method: 'PUT',
    url: '/test-property/1',
    body: testCase.data,
    params: { id: '1' }
  };
  
  const mockRes = {
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
  
  let validationPassed = true;
  let validationErrors = [];
  
  try {
    // Test sanitization first
    sanitizeRequestBody(mockReq, mockRes, () => {});
    
    // Test validation
    validatePropertyUpdate.forEach(validation => {
      validation(mockReq, mockRes, (error) => {
        if (error) {
          validationPassed = false;
          validationErrors.push(error.message);
        }
      });
    });
    
    // Check validation results
    const errors = validationResult(mockReq);
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
    
    // Check if XSS attempts were caught
    if (testCase.name.includes('XSS')) {
      const xssErrors = errors.array().filter(error => 
        error.msg.includes('malicious') || 
        error.msg.includes('XSS') ||
        error.msg.includes('script') ||
        error.msg.includes('javascript') ||
        error.msg.includes('onload')
      );
      
      console.log(`  XSS detection: ${xssErrors.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
    }
    
  } catch (error) {
    console.log(`  Error during validation: ${error.message}`);
    console.log(`  Result: ❌ ERROR`);
  }
});

console.log('\n=== Test Summary ===');
console.log('This test directly validates the middleware functions.');
console.log('If XSS attempts are not caught, there may be an issue with the custom validation functions.');




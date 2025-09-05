const { body, validationResult } = require('express-validator');
const { validatePropertyUpdate } = require('./middlewares/propertyValidation');

console.log('Testing property validation rules...');

// Simulate a request body with various test cases
const testCases = [
  {
    name: 'Valid property data',
    data: {
      title: 'Test Property',
      description: 'A valid property description',
      price: 250000,
      surface: 150,
      location: 'Downtown',
      status_id: 1,
      category_id: 1,
      built_year: 2020,
      phone_number: '+1234567890',
      view_type: 'city',
      concierge: true,
      details: 'Some details',
      interior_details: 'Interior details',
      notes: 'Some notes'
    },
    expectedValid: true
  },
  {
    name: 'Missing required fields',
    data: {
      title: 'Test Property',
      // Missing description, price, surface, location, status_id, category_id
    },
    expectedValid: false
  },
  {
    name: 'Invalid price (negative)',
    data: {
      title: 'Test Property',
      description: 'A valid property description',
      price: -1000,
      surface: 150,
      location: 'Downtown',
      status_id: 1,
      category_id: 1
    },
    expectedValid: false
  },
  {
    name: 'Invalid surface (zero)',
    data: {
      title: 'Test Property',
      description: 'A valid property description',
      price: 250000,
      surface: 0,
      location: 'Downtown',
      status_id: 1,
      category_id: 1
    },
    expectedValid: false
  },
  {
    name: 'Invalid built year (future)',
    data: {
      title: 'Test Property',
      description: 'A valid property description',
      price: 250000,
      surface: 150,
      location: 'Downtown',
      status_id: 1,
      category_id: 1,
      built_year: 2030
    },
    expectedValid: false
  },
  {
    name: 'Invalid phone number format',
    data: {
      title: 'Test Property',
      description: 'A valid property description',
      price: 250000,
      surface: 150,
      location: 'Downtown',
      status_id: 1,
      category_id: 1,
      phone_number: 'invalid-phone'
    },
    expectedValid: false
  },
  {
    name: 'Invalid view type',
    data: {
      title: 'Test Property',
      description: 'A valid property description',
      price: 250000,
      surface: 150,
      location: 'Downtown',
      status_id: 1,
      category_id: 1,
      view_type: 'invalid-view'
    },
    expectedValid: false
  },
  {
    name: 'XSS attempt in text fields',
    data: {
      title: 'Test Property',
      description: '<script>alert("xss")</script>',
      price: 250000,
      surface: 150,
      location: 'Downtown',
      status_id: 1,
      category_id: 1,
      details: 'javascript:alert("xss")',
      interior_details: 'onload=alert("xss")'
    },
    expectedValid: false
  }
];

console.log('\n=== Property Validation Test Results ===');

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`Input data:`, JSON.stringify(testCase.data, null, 2));
  
  // Create a mock request object
  const mockReq = {
    body: testCase.data
  };
  
  // Create a mock response object
  const mockRes = {
    status: (code) => ({
      json: (data) => ({ statusCode: code, data })
    })
  };
  
  // Create a mock next function
  let nextCalled = false;
  const mockNext = () => {
    nextCalled = true;
  };
  
  try {
    // Test the validation middleware
    const validationChain = validatePropertyUpdate;
    validationChain.forEach(validation => {
      validation(mockReq, mockRes, mockNext);
    });
    
    // Check validation results
    const errors = validationResult(mockReq);
    const isValid = errors.isEmpty();
    
    console.log(`Expected valid: ${testCase.expectedValid}`);
    console.log(`Actual valid: ${isValid}`);
    console.log(`Test result: ${isValid === testCase.expectedValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!isValid) {
      console.log(`Validation errors:`, errors.array());
    }
    
  } catch (error) {
    console.log(`Test error: ${error.message}`);
    console.log(`Test result: ❌ ERROR`);
  }
});





const { body, validationResult } = require('express-validator');
const { validatePropertyUpdateSimple } = require('./middlewares/propertyValidationSimple');

console.log('Testing validation chain directly...');

// Test the validation chain directly
const testValidationChain = () => {
  console.log('\n=== Testing Validation Chain Directly ===\n');
  
  // Test case with XSS attempt
  const testData = {
    description: '<script>alert("xss")</script>',
    details: 'javascript:alert("xss")',
    interior_details: 'onload=alert("xss")'
  };
  
  console.log('Test data:', JSON.stringify(testData, null, 2));
  
  // Create mock request
  const mockReq = { body: testData };
  const mockRes = {
    status: (code) => ({
      json: (data) => ({ statusCode: code, data })
    })
  };
  const mockNext = () => {};
  
  console.log('\n--- Executing Validation Chain ---');
  
  try {
    // Execute each validation rule
    validatePropertyUpdateSimple.forEach((validation, index) => {
      console.log(`\nExecuting validator ${index + 1}...`);
      
      // Check if this is a custom validation
      if (validation.toString().includes('custom')) {
        console.log('  This is a custom validation function');
      }
      
      // Execute the validation
      validation(mockReq, mockRes, mockNext);
    });
    
    // Check validation results
    const errors = validationResult(mockReq);
    const isValid = errors.isEmpty();
    
    console.log(`\n--- Validation Results ---`);
    console.log(`Validation result: ${isValid ? 'Valid' : 'Invalid'}`);
    
    if (!isValid) {
      console.log('Validation errors:');
      errors.array().forEach(error => {
        console.log(`  - ${error.path}: ${error.msg}`);
      });
      
      // Check if XSS attempts were caught
      const xssErrors = errors.array().filter(error => 
        error.msg.includes('malicious') || 
        error.msg.includes('XSS') ||
        error.msg.includes('script') ||
        error.msg.includes('javascript') ||
        error.msg.includes('onload')
      );
      
      console.log(`\nXSS detection: ${xssErrors.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
      if (xssErrors.length > 0) {
        console.log('XSS attempts were successfully blocked!');
      } else {
        console.log('XSS attempts were NOT blocked!');
      }
    } else {
      console.log('❌ FAIL: XSS attempts were not caught by validation');
    }
    
  } catch (error) {
    console.log(`Error during validation: ${error.message}`);
    console.log(`Result: ❌ ERROR`);
  }
};

// Test with different data
const testCases = [
  {
    name: 'XSS in Description',
    data: { description: '<script>alert("xss")</script>' }
  },
  {
    name: 'XSS in Details',
    data: { details: 'javascript:alert("xss")' }
  },
  {
    name: 'XSS in Interior Details',
    data: { interior_details: 'onload=alert("xss")' }
  }
];

console.log('=== Testing Individual Fields ===\n');

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  
  const mockReq = { body: testCase.data };
  const mockRes = {
    status: (code) => ({
      json: (data) => ({ statusCode: code, data })
    })
  };
  const mockNext = () => {};
  
  try {
    // Execute validation chain
    validatePropertyUpdateSimple.forEach(validation => {
      validation(mockReq, mockRes, mockNext);
    });
    
    const errors = validationResult(mockReq);
    const isValid = errors.isEmpty();
    
    console.log(`Expected: Invalid (XSS attempt)`);
    console.log(`Actual: ${isValid ? 'Valid' : 'Invalid'}`);
    console.log(`Result: ${!isValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!isValid) {
      console.log('Validation errors:');
      errors.array().forEach(error => {
        console.log(`  - ${error.path}: ${error.msg}`);
      });
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
    console.log(`Result: ❌ ERROR`);
  }
});

// Run the main test
testValidationChain();




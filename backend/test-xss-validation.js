const { body, validationResult } = require('express-validator');
const { validatePropertyUpdate } = require('./middlewares/propertyValidation');

console.log('Testing XSS validation...');

// Test XSS attempts
const xssTestData = {
  title: 'Test Property',
  description: '<script>alert("xss")</script>',
  price: 100000,
  surface: 100,
  location: 'Test Location',
  status_id: 1,
  category_id: 1,
  owner_name: 'Test Owner',
  phone_number: '+1234567890',
  view_type: 'open view',
  concierge: true,
  details: 'javascript:alert("xss")',
  interior_details: 'onload=alert("xss")'
};

console.log('XSS test data:', JSON.stringify(xssTestData, null, 2));

// Create mock request
const mockReq = { body: xssTestData };
const mockRes = {
  status: (code) => ({
    json: (data) => ({ statusCode: code, data })
  })
};
const mockNext = () => {};

console.log('\n=== Running XSS Validation Test ===');

try {
  // Apply validation rules
  validatePropertyUpdate.forEach(validation => {
    validation(mockReq, mockRes, mockNext);
  });
  
  // Check results
  const errors = validationResult(mockReq);
  const isValid = errors.isEmpty();
  
  console.log(`Validation result: ${isValid ? 'Valid' : 'Invalid'}`);
  
  if (!isValid) {
    console.log('\nValidation errors:');
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




const { body, validationResult } = require('express-validator');

console.log('Debugging validation middleware...');

// Test the custom validation function directly
const testXSSValidation = (value) => {
  console.log(`Testing value: "${value}"`);
  if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
    console.log('XSS detected!');
    throw new Error('Contains potentially malicious content');
  }
  console.log('No XSS detected');
  return true;
};

// Test with XSS attempts
console.log('\n=== Testing XSS Detection Function ===');
try {
  testXSSValidation('normal text');
  testXSSValidation('<script>alert("xss")</script>');
} catch (error) {
  console.log('Caught error:', error.message);
}

try {
  testXSSValidation('javascript:alert("xss")');
} catch (error) {
  console.log('Caught error:', error.message);
}

try {
  testXSSValidation('onload=alert("xss")');
} catch (error) {
  console.log('Caught error:', error.message);
}

// Now test the actual validation chain
console.log('\n=== Testing Validation Chain ===');
const validateTest = [
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .custom((value) => {
      console.log(`Custom validation called with: "${value}"`);
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        console.log('XSS detected in custom validation!');
        throw new Error('Description contains potentially malicious content');
      }
      console.log('Custom validation passed');
      return true;
    })
];

console.log('Validation chain created with', validateTest.length, 'validators');

// Test the validation chain
const testReq = {
  body: {
    description: '<script>alert("xss")</script>'
  }
};

const testRes = {
  status: (code) => ({
    json: (data) => ({ statusCode: code, data })
  })
};

const testNext = () => {};

console.log('\n=== Testing Validation Chain Execution ===');
try {
  validateTest.forEach(validation => {
    console.log('Executing validator...');
    validation(testReq, testRes, testNext);
  });
  
  const errors = validationResult(testReq);
  console.log('Validation result:', errors.isEmpty() ? 'Valid' : 'Invalid');
  if (!errors.isEmpty()) {
    console.log('Errors:', errors.array());
  }
} catch (error) {
  console.log('Error during validation:', error.message);
}




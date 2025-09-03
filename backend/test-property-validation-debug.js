const express = require('express');
const { body, validationResult } = require('express-validator');

console.log('Debugging property validation middleware...');

// Import the middleware
let validatePropertyUpdate, handleValidationErrors, sanitizeRequestBody;
try {
  const propertyValidation = require('./middlewares/propertyValidation');
  validatePropertyUpdate = propertyValidation.validatePropertyUpdate;
  handleValidationErrors = propertyValidation.handleValidationErrors;
  sanitizeRequestBody = propertyValidation.sanitizeRequestBody;
  console.log('✅ Middleware imported successfully');
  console.log('Number of validation rules:', validatePropertyUpdate.length);
} catch (error) {
  console.error('❌ Error importing middleware:', error.message);
  process.exit(1);
}

// Create a test Express app
const app = express();
app.use(express.json());

// Test route with the imported middleware
app.put('/test-property-debug/:id', 
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

// Start server
const server = app.listen(10006, () => {
  console.log('Property validation debug test server running on port 10006');
  console.log('\n=== Testing Property Validation Middleware ===\n');
  
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
      name: 'XSS in Description',
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
    }
  ];
  
  let testIndex = 0;
  
  const runNextTest = () => {
    if (testIndex >= testCases.length) {
      console.log('\n=== All Tests Completed ===');
      server.close(() => {
        console.log('Test server closed');
        process.exit(0);
      });
      return;
    }
    
    const testCase = testCases[testIndex];
    console.log(`\n--- Test ${testIndex + 1}: ${testCase.name} ---`);
    
    // Make HTTP request
    const http = require('http');
    const postData = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'localhost',
      port: 10006,
      path: '/test-property-debug/1',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const isValid = res.statusCode === 200;
        console.log(`  Expected: ${testCase.expectedValid ? 'Valid' : 'Invalid'}`);
        console.log(`  Actual: ${isValid ? 'Valid' : 'Invalid'}`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Result: ${isValid === testCase.expectedValid ? '✅ PASS' : '❌ FAIL'}`);
        
        if (res.statusCode === 400) {
          try {
            const errorData = JSON.parse(data);
            console.log('  Validation errors:');
            if (errorData.errors) {
              errorData.errors.forEach(error => {
                console.log(`    - ${error.field}: ${error.message}`);
              });
            }
          } catch (e) {
            console.log('  Response:', data);
          }
        }
        
        testIndex++;
        setTimeout(runNextTest, 100);
      });
    });
    
    req.on('error', (e) => {
      console.error(`  Error: ${e.message}`);
      testIndex++;
      setTimeout(runNextTest, 100);
    });
    
    req.write(postData);
    req.end();
  };
  
  // Start testing
  setTimeout(runNextTest, 500);
});




const express = require('express');
const { body, validationResult } = require('express-validator');
const { validatePropertyUpdateSimple, handleValidationErrors, sanitizeRequestBody } = require('./middlewares/propertyValidationSimple');

console.log('Testing simplified property validation middleware...');

// Create a test Express app
const app = express();
app.use(express.json());

// Test route with simplified validation
app.put('/test-simple-property/:id', 
  sanitizeRequestBody,
  validatePropertyUpdateSimple, 
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
const server = app.listen(10007, () => {
  console.log('Simplified property validation test server running on port 10007');
  console.log('\n=== Testing Simplified Property Validation ===\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Valid Property Data',
      data: {
        title: 'Test Property',
        description: 'A valid property description that meets the minimum length requirement',
        price: 250000,
        surface: 150,
        status_id: 1,
        category_id: 1,
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
        status_id: 1,
        category_id: 1,
        details: 'Some detailed information about the property that meets the minimum length requirement',
        interior_details: 'Interior details about the property that meets the minimum length requirement'
      },
      expectedValid: false
    },
    {
      name: 'XSS in Details',
      data: {
        title: 'Test Property',
        description: 'A valid property description that meets the minimum length requirement',
        price: 250000,
        surface: 150,
        status_id: 1,
        category_id: 1,
        details: 'javascript:alert("xss")',
        interior_details: 'Interior details about the property that meets the minimum length requirement'
      },
      expectedValid: false
    },
    {
      name: 'XSS in Interior Details',
      data: {
        title: 'Test Property',
        description: 'A valid property description that meets the minimum length requirement',
        price: 250000,
        surface: 150,
        status_id: 1,
        category_id: 1,
        details: 'Some detailed information about the property that meets the minimum length requirement',
        interior_details: 'onload=alert("xss")'
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
      port: 10007,
      path: '/test-simple-property/1',
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
        
        // Check if XSS attempts were caught
        if (testCase.name.includes('XSS')) {
          const xssCaught = res.statusCode === 400;
          console.log(`  XSS detection: ${xssCaught ? '✅ PASS' : '❌ FAIL'}`);
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




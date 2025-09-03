const express = require('express');
const { body, validationResult } = require('express-validator');
const { validatePropertyUpdate, handleValidationErrors, sanitizeRequestBody } = require('./middlewares/propertyValidation');

console.log('Starting Express server for validation testing...');

// Create a test Express app
const app = express();
app.use(express.json());

// Test route with validation
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

// Start server
const server = app.listen(10001, () => {
  console.log('Test server running on port 10001');
  console.log('\n=== Testing Validation via HTTP Requests ===\n');
  
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

  // Test each case
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
    
    // Make HTTP request to test the validation
    const http = require('http');
    const postData = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'localhost',
      port: 10001,
      path: '/test-property/1',
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
        setTimeout(runNextTest, 100); // Small delay between tests
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




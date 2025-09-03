const express = require('express');
const { body, validationResult } = require('express-validator');

console.log('Testing minimal XSS validation...');

// Create a test Express app
const app = express();
app.use(express.json());

// Minimal test route with just XSS validation
app.put('/test-minimal-xss', 
  body('description')
    .custom((value) => {
      console.log(`Custom validation called with: "${value}"`);
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        console.log('XSS detected!');
        return Promise.reject(new Error('XSS attempt detected'));
      }
      console.log('No XSS detected');
      return Promise.resolve(true);
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors found:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }
    console.log('Validation passed');
    res.json({ success: true, message: 'Validation passed' });
  }
);

// Start server
const server = app.listen(10004, () => {
  console.log('Minimal XSS test server running on port 10004');
  console.log('\n=== Testing Minimal XSS Validation ===\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Valid Description',
      data: { description: 'This is a valid description' },
      expectedValid: true
    },
    {
      name: 'XSS Script Tag',
      data: { description: '<script>alert("xss")</script>' },
      expectedValid: false
    },
    {
      name: 'XSS JavaScript Protocol',
      data: { description: 'javascript:alert("xss")' },
      expectedValid: false
    },
    {
      name: 'XSS Event Handler',
      data: { description: 'onload=alert("xss")' },
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
      port: 10004,
      path: '/test-minimal-xss',
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
                console.log(`    - ${error.msg}`);
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




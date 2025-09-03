const express = require('express');
const { body, validationResult } = require('express-validator');

console.log('Testing gradual validation chain build-up...');

// Create a test Express app
const app = express();
app.use(express.json());

// Test route 1: Just XSS validation
app.put('/test-1-xss-only', 
  body('description')
    .custom((value) => {
      console.log(`[Test 1] Custom validation called with: "${value}"`);
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        console.log('[Test 1] XSS detected!');
        return Promise.reject(new Error('XSS attempt detected'));
      }
      console.log('[Test 1] No XSS detected');
      return Promise.resolve(true);
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }
    res.json({ success: true, message: 'Validation passed' });
  }
);

// Test route 2: XSS + basic validation
app.put('/test-2-xss-basic', 
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .custom((value) => {
      console.log(`[Test 2] Custom validation called with: "${value}"`);
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        console.log('[Test 2] XSS detected!');
        return Promise.reject(new Error('XSS attempt detected'));
      }
      console.log('[Test 2] No XSS detected');
      return Promise.resolve(true);
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }
    res.json({ success: true, message: 'Validation passed' });
  }
);

// Test route 3: XSS + basic + length validation
app.put('/test-3-xss-basic-length', 
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2,000 characters')
    .custom((value) => {
      console.log(`[Test 3] Custom validation called with: "${value}"`);
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        console.log('[Test 3] XSS detected!');
        return Promise.reject(new Error('XSS attempt detected'));
      }
      console.log('[Test 3] No XSS detected');
      return Promise.resolve(true);
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }
    res.json({ success: true, message: 'Validation passed' });
  }
);

// Start server
const server = app.listen(10005, () => {
  console.log('Gradual validation test server running on port 10005');
  console.log('\n=== Testing Gradual Validation Chain Build-up ===\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Valid Description',
      data: { description: 'This is a valid description that meets the minimum length requirement' },
      expectedValid: true
    },
    {
      name: 'XSS Script Tag',
      data: { description: '<script>alert("xss")</script>' },
      expectedValid: false
    }
  ];
  
  let testIndex = 0;
  let routeIndex = 0;
  
  const routes = [
    { path: '/test-1-xss-only', name: 'XSS Only' },
    { path: '/test-2-xss-basic', name: 'XSS + Basic' },
    { path: '/test-3-xss-basic-length', name: 'XSS + Basic + Length' }
  ];
  
  const runNextTest = () => {
    if (testIndex >= testCases.length) {
      testIndex = 0;
      routeIndex++;
      if (routeIndex >= routes.length) {
        console.log('\n=== All Tests Completed ===');
        server.close(() => {
          console.log('Test server closed');
          process.exit(0);
        });
        return;
      }
    }
    
    const testCase = testCases[testIndex];
    const route = routes[routeIndex];
    
    console.log(`\n--- Test ${testIndex + 1} on ${route.name} ---`);
    
    // Make HTTP request
    const http = require('http');
    const postData = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'localhost',
      port: 10005,
      path: route.path,
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




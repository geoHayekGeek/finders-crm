const http = require('http');

console.log('Testing API endpoint for XSS validation...');

// Test data with XSS attempts
const testData = {
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

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/api/properties/test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending test data:', JSON.stringify(testData, null, 2));

const req = http.request(options, (res) => {
  console.log(`\nResponse Status: ${res.statusCode}`);
  console.log(`Response Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:', data);
    
    if (res.statusCode === 400) {
      console.log('✅ SUCCESS: XSS attempt was blocked (400 Bad Request)');
    } else if (res.statusCode === 200) {
      console.log('❌ FAIL: XSS attempt was NOT blocked (200 OK)');
    } else {
      console.log(`⚠️  UNKNOWN: Got status ${res.statusCode}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ ERROR: ${e.message}`);
  console.log('Make sure the backend server is running on port 5000');
});

req.write(postData);
req.end();

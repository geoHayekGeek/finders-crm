// test-api.js
const http = require('http');

function testAPI() {
  console.log('🧪 Testing API Endpoints...\n');
  
  const endpoints = [
    '/',
    '/api/categories',
    '/api/statuses',
    '/api/properties'
  ];
  
  let completed = 0;
  
  endpoints.forEach(endpoint => {
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: endpoint,
      method: 'GET',
      timeout: 5000
    };
    
    console.log(`🔍 Testing ${endpoint}...`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${endpoint} - Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            if (jsonData.success && jsonData.data) {
              console.log(`   📊 Data: ${jsonData.data.length || 'N/A'} items`);
            }
          } catch (e) {
            console.log(`   📄 Response: ${data.substring(0, 100)}...`);
          }
        }
        console.log('');
        completed++;
        if (completed === endpoints.length) {
          console.log('🎯 API Testing completed!');
          process.exit(0);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${endpoint} - Error: ${error.message}\n`);
      completed++;
      if (completed === endpoints.length) {
        console.log('🎯 API Testing completed!');
        process.exit(0);
      }
    });
    
    req.on('timeout', () => {
      console.log(`⏰ ${endpoint} - Timeout\n`);
      req.destroy();
      completed++;
      if (completed === endpoints.length) {
        console.log('🎯 API Testing completed!');
        process.exit(0);
      }
    });
    
    req.end();
  });
}

testAPI();

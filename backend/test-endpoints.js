// test-endpoints.js
const fetch = require('node-fetch');

async function testEndpoints() {
  try {
    console.log('🔍 Testing API endpoints...');
    
    // First try to login to get a token
    console.log('📝 Attempting login...');
    const loginResponse = await fetch('http://localhost:10000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'ops1@test.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      const loginText = await loginResponse.text();
      console.log('Login response:', loginText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    const token = loginData.token;
    
    // Test reference sources endpoint
    console.log('\n🌐 Testing reference sources endpoint...');
    const referencesResponse = await fetch('http://localhost:10000/api/leads/reference-sources', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Reference sources status:', referencesResponse.status);
    const referencesData = await referencesResponse.text();
    console.log('Reference sources response:', referencesData);
    
    // Test operations users endpoint
    console.log('\n⚙️ Testing operations users endpoint...');
    const operationsResponse = await fetch('http://localhost:10000/api/leads/operations-users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Operations users status:', operationsResponse.status);
    const operationsData = await operationsResponse.text();
    console.log('Operations users response:', operationsData);
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error);
  }
}

testEndpoints();

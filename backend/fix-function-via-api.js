const fetch = require('node-fetch');

async function fixFunctionViaAPI() {
  try {
    console.log('🔧 Attempting to fix function via API...');
    
    // First, let's check if the server is running
    const healthCheck = await fetch('http://localhost:10000/api/');
    if (!healthCheck.ok) {
      console.log('❌ Server is not running on port 10000');
      return;
    }
    console.log('✅ Server is running');
    
    // Try to create a simple property to see what error we get
    console.log('🧪 Testing property creation to see the exact error...');
    try {
      const testProperty = {
        status_id: 1,
        location: 'Test Location',
        category_id: 1,
        owner_name: 'Test Owner',
        price: 100000
      };
      
      const response = await fetch('http://localhost:10000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // This will fail auth but might show us the error
        },
        body: JSON.stringify(testProperty)
      });
      
      if (response.status === 401) {
        console.log('✅ API is working (got expected auth error)');
      } else {
        console.log('📊 Response status:', response.status);
        const responseText = await response.text();
        console.log('📄 Response:', responseText);
      }
    } catch (error) {
      console.log('❌ Error testing property creation:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixFunctionViaAPI().catch(console.error);

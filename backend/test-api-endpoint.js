// test-api-endpoint.js
const express = require('express');
const jwt = require('jsonwebtoken');
const NotificationController = require('./controllers/notificationController');
const { authenticateToken } = require('./middlewares/permissions');

async function testApiEndpoint() {
  try {
    console.log('🧪 Testing API endpoint...');
    
    // Create a test token
    const token = jwt.sign({ id: 38, email: 'test@example.com' }, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔑 Test token created');
    
    // Create a mock request object
    const mockReq = {
      user: { id: 38 },
      params: { notificationId: '49' }
    };
    
    const mockRes = {
      json: (data) => {
        console.log('📤 Response:', data);
        return mockRes;
      },
      status: (code) => {
        console.log('📊 Status code:', code);
        return mockRes;
      }
    };
    
    // Test the markAsRead controller method
    console.log('🔍 Testing markAsRead controller...');
    await NotificationController.markAsRead(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
  }
}

// Run the test
testApiEndpoint()
  .then(() => {
    console.log('🎉 API endpoint test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });

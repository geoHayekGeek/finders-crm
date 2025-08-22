// test-add-property.js - Test script for adding properties
const fetch = require('node-fetch');

async function testAddProperty() {
  try {
    console.log('🧪 Testing Add Property API...');
    
    const testProperty = {
      status_id: 1,
      location: "Test Location - Beirut",
      category_id: 1,
      building_name: "Test Building",
      owner_name: "Test Owner",
      phone_number: "+961 70 123 456",
      surface: 150.5,
      details: "Test property details",
      interior_details: "Modern interior",
      built_year: 2020,
      view_type: "sea view",
      concierge: true,
      price: 500000,
      notes: "Test property for development",
      referral_source: "Direct",
      referral_dates: ["2024-01-15"],
      main_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      image_gallery: [
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      ]
    };

    console.log('📤 Sending test property data...');
    console.log('📍 Location:', testProperty.location);
    console.log('💰 Price:', testProperty.price);
    console.log('🖼️  Main image size:', testProperty.main_image.length, 'characters');
    console.log('🖼️  Gallery images:', testProperty.image_gallery.length);

    const response = await fetch('http://localhost:10000/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Temporarily bypass auth for testing
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify(testProperty)
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Status Text:', response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Property created:');
      console.log('🆔 ID:', result.data?.id);
      console.log('📝 Message:', result.message);
    } else {
      const error = await response.json();
      console.log('❌ ERROR:');
      console.log('📝 Message:', error.message);
      console.log('🔍 Details:', error);
    }

  } catch (error) {
    console.error('💥 Network/System Error:', error.message);
  }
}

// Run the test
testAddProperty();

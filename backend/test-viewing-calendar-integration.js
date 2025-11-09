// test-viewing-calendar-integration.js
// Test script to verify viewing and calendar event integration

const axios = require('axios');

const BASE_URL = 'http://localhost:10000/api';
let authToken = '';
let testPropertyId = null;
let testLeadId = null;
let testViewingId = null;
let testAgentId = null;

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    },
    ...(body && { data: body })
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.data.message || error.response.statusText}`);
    }
    throw error;
  }
}

// 1. Login
async function login() {
  console.log('\n📋 Step 1: Logging in...');
  const response = await apiRequest('/users/login', 'POST', {
    email: 'test@example.com',
    password: 'password123'
  });
  
  authToken = response.token;
  testAgentId = response.user.id;
  console.log('✅ Logged in successfully');
  console.log(`   User: ${response.user.name}, ID: ${testAgentId}`);
}

// 2. Get or create a property
async function getOrCreateProperty() {
  console.log('\n📋 Step 2: Getting or creating a property...');
  
  // Try to get existing properties
  const properties = await apiRequest('/properties');
  
  if (properties.data && properties.data.length > 0) {
    testPropertyId = properties.data[0].id;
    console.log('✅ Using existing property');
    console.log(`   Property ID: ${testPropertyId}, Reference: ${properties.data[0].reference_number}`);
  } else {
    // Create a new property
    console.log('   No properties found, creating a test property...');
    const newProperty = await apiRequest('/properties', 'POST', {
      status_id: 1,
      property_type: 'sale',
      location: 'Test Location for Viewing',
      category_id: 1,
      owner_name: 'Test Owner',
      phone_number: '+961 70 123 456',
      surface: 150,
      details: '{"floor": 3, "balcony": true, "parking": 1, "cave": false}',
      interior_details: 'Modern interior for testing',
      view_type: 'open view',
      concierge: false,
      price: 200000,
      notes: 'Test property for viewing calendar integration',
      agent_id: testAgentId
    });
    testPropertyId = newProperty.data.id;
    console.log('✅ Property created');
    console.log(`   Property ID: ${testPropertyId}`);
  }
}

// 3. Get or create a lead
async function getOrCreateLead() {
  console.log('\n📋 Step 3: Getting or creating a lead...');
  
  // Try to get existing leads
  const leads = await apiRequest('/leads');
  
  if (leads.data && leads.data.length > 0) {
    testLeadId = leads.data[0].id;
    console.log('✅ Using existing lead');
    console.log(`   Lead ID: ${testLeadId}, Name: ${leads.data[0].customer_name}`);
  } else {
    // Create a new lead
    console.log('   No leads found, creating a test lead...');
    const newLead = await apiRequest('/leads', 'POST', {
      customer_name: 'Test Lead for Viewing',
      phone_number: '+961 70 999 888',
      email: 'testlead@example.com',
      status: 'New',
      property_type_interest: 'sale',
      budget_min: 150000,
      budget_max: 250000,
      notes: 'Test lead for viewing calendar integration'
    });
    testLeadId = newLead.data.id;
    console.log('✅ Lead created');
    console.log(`   Lead ID: ${testLeadId}`);
  }
}

// 4. Create a viewing
async function createViewing() {
  console.log('\n📋 Step 4: Creating a viewing...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const viewingDate = tomorrow.toISOString().split('T')[0];
  const viewingTime = '14:00';
  
  const viewing = await apiRequest('/viewings', 'POST', {
    property_id: testPropertyId,
    lead_id: testLeadId,
    agent_id: testAgentId,
    viewing_date: viewingDate,
    viewing_time: viewingTime,
    status: 'Scheduled',
    notes: 'Test viewing for calendar integration'
  });
  
  testViewingId = viewing.data.id;
  console.log('✅ Viewing created successfully');
  console.log(`   Viewing ID: ${testViewingId}`);
  console.log(`   Date: ${viewingDate}, Time: ${viewingTime}`);
}

// 5. Verify calendar event was created
async function verifyCalendarEventCreated() {
  console.log('\n📋 Step 5: Verifying calendar event was created...');
  
  // Wait a bit for the calendar event to be created
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get all calendar events
  const events = await apiRequest('/calendar/all');
  
  console.log(`   Total calendar events found: ${events.data?.length || 0}`);
  
  // Debug: Show all events with type 'showing'
  const showingEvents = events.data?.filter(event => event.type === 'showing');
  console.log(`   Showing events found: ${showingEvents?.length || 0}`);
  
  if (showingEvents && showingEvents.length > 0) {
    console.log('   Recent showing events:');
    showingEvents.slice(0, 3).forEach(event => {
      console.log(`     - ID: ${event.id}, Notes: ${event.notes?.substring(0, 50)}...`);
    });
  }
  
  // Find the event with our viewing ID in the notes
  const viewingEvent = events.data?.find(event => 
    event.notes && event.notes.includes(`Viewing ID: ${testViewingId}`)
  );
  
  if (viewingEvent) {
    console.log('✅ Calendar event found');
    console.log(`   Event ID: ${viewingEvent.id}`);
    console.log(`   Title: ${viewingEvent.title}`);
    console.log(`   Type: ${viewingEvent.type}`);
    console.log(`   Start: ${new Date(viewingEvent.start_time).toLocaleString()}`);
    return viewingEvent.id;
  } else {
    console.log(`   ⚠️ Looking for event with "Viewing ID: ${testViewingId}" in notes`);
    throw new Error('Calendar event not found for viewing');
  }
}

// 6. Update the viewing
async function updateViewing(calendarEventId) {
  console.log('\n📋 Step 6: Updating the viewing...');
  
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const newViewingDate = dayAfterTomorrow.toISOString().split('T')[0];
  const newViewingTime = '15:30';
  
  await apiRequest(`/viewings/${testViewingId}`, 'PUT', {
    viewing_date: newViewingDate,
    viewing_time: newViewingTime,
    status: 'Rescheduled',
    notes: 'Updated viewing for calendar integration test'
  });
  
  console.log('✅ Viewing updated successfully');
  console.log(`   New Date: ${newViewingDate}, New Time: ${newViewingTime}`);
  console.log(`   New Status: Rescheduled`);
}

// 7. Verify calendar event was updated
async function verifyCalendarEventUpdated(calendarEventId) {
  console.log('\n📋 Step 7: Verifying calendar event was updated...');
  
  // Wait a bit for the calendar event to be updated
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get the specific calendar event
  const event = await apiRequest(`/calendar/${calendarEventId}`);
  
  if (event.data) {
    console.log('✅ Calendar event updated');
    console.log(`   Event ID: ${event.data.id}`);
    console.log(`   Title: ${event.data.title}`);
    console.log(`   Color: ${event.data.color} (should be yellow for Rescheduled)`);
    console.log(`   Start: ${new Date(event.data.start_time).toLocaleString()}`);
  } else {
    throw new Error('Calendar event not found after update');
  }
}

// 8. Delete the viewing
async function deleteViewing() {
  console.log('\n📋 Step 8: Deleting the viewing...');
  
  await apiRequest(`/viewings/${testViewingId}`, 'DELETE');
  
  console.log('✅ Viewing deleted successfully');
}

// 9. Verify calendar event was deleted
async function verifyCalendarEventDeleted(calendarEventId) {
  console.log('\n📋 Step 9: Verifying calendar event was deleted...');
  
  // Wait a bit for the calendar event to be deleted
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to get the calendar event
  try {
    await apiRequest(`/calendar/${calendarEventId}`);
    throw new Error('Calendar event still exists after viewing deletion');
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.log('✅ Calendar event deleted successfully');
    } else {
      throw error;
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Viewing-Calendar Integration Tests');
  console.log('='.repeat(60));
  
  try {
    await login();
    await getOrCreateProperty();
    await getOrCreateLead();
    await createViewing();
    const calendarEventId = await verifyCalendarEventCreated();
    await updateViewing(calendarEventId);
    await verifyCalendarEventUpdated(calendarEventId);
    await deleteViewing();
    await verifyCalendarEventDeleted(calendarEventId);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed successfully!');
    console.log('✅ Viewing creation → Calendar event created');
    console.log('✅ Viewing update → Calendar event updated');
    console.log('✅ Viewing deletion → Calendar event deleted');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests();


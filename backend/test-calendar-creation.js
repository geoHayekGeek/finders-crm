// Test calendar event creation directly
const CalendarEvent = require('./models/calendarEventModel');

async function testCalendarCreation() {
  try {
    console.log('Testing calendar event creation...');
    
    const eventData = {
      title: 'Test Event',
      description: 'Test description',
      start_time: new Date(),
      end_time: new Date(Date.now() + 3600000), // 1 hour later
      all_day: false,
      color: 'blue',
      type: 'showing',
      location: 'Test location',
      attendees: ['Test Attendee'],
      notes: 'Test notes | Viewing ID: 999',
      created_by: 32, // Test user ID
      assigned_to: 32,
      property_id: 1163,
      lead_id: 954
    };
    
    console.log('Creating event with data:', eventData);
    
    const event = await CalendarEvent.createEvent(eventData);
    console.log('✅ Event created successfully:', event);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating calendar event:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

testCalendarCreation();


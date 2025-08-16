# Calendar Component Documentation

## Overview

The Calendar component is a fully functional, modern calendar interface built for the Finders CRM system. It provides comprehensive event management capabilities with a beautiful, responsive UI that's ready for backend integration.

## Features

### 🗓️ Multiple View Modes
- **Month View**: Traditional calendar grid showing all days with event previews
- **Week View**: Detailed weekly schedule with hourly breakdown
- **Day View**: Hour-by-hour daily schedule view

### 📅 Event Management
- **Create Events**: Add new events with comprehensive details
- **Edit Events**: Modify existing events
- **Delete Events**: Remove events with confirmation
- **Event Types**: Categorized events (meeting, showing, inspection, closing, other)
- **Color Coding**: 6 different color options for visual organization
- **All-Day Events**: Support for full-day events

### 🎨 Rich Event Details
- **Title & Description**: Event name and detailed description
- **Date & Time**: Start and end times with validation
- **Location**: Event venue or address
- **Attendees**: List of participants (comma-separated)
- **Notes**: Additional information and reminders
- **Event Type**: Categorized for better organization

### 🔍 Smart Filtering & Search
- **Sidebar Filters**: All, Today, Upcoming, Past events
- **Quick Stats**: Event counts for different time periods
- **Smart Sorting**: Chronological event ordering

### 💾 Data Persistence
- **Local Storage**: Events saved locally for immediate use
- **Sample Data**: Pre-loaded sample events for demonstration
- **Backend Ready**: Structured for easy API integration

## Components Structure

```
Calendar/
├── page.tsx              # Main calendar page
├── Calendar.tsx          # Core calendar component
├── CalendarHeader.tsx    # View switcher and navigation
├── EventModal.tsx        # Event creation/editing modal
├── EventList.tsx         # Sidebar event list
└── sampleEvents.ts       # Sample data utility
```

## Usage

### Basic Navigation
1. **Access**: Navigate to `/dashboard/calendar` from the main dashboard
2. **View Switching**: Use the Month/Week/Day tabs to change calendar views
3. **Date Navigation**: Use arrow buttons or click on dates to navigate
4. **Today Button**: Quick return to current date

### Creating Events
1. Click the **"Add Event"** button or click on any date
2. Fill in event details:
   - **Title** (required)
   - **Description** (optional)
   - **Start/End Time** (required for timed events)
   - **All Day** toggle for full-day events
   - **Color** selection for visual organization
   - **Event Type** for categorization
   - **Location** for venue information
   - **Attendees** (comma-separated list)
   - **Notes** for additional details
3. Click **"Create Event"** to save

### Managing Events
- **Click on Events**: Click any event to edit its details
- **Edit Mode**: Modify any field and click **"Update Event"**
- **Delete Events**: Use the delete button with confirmation
- **Event Colors**: Change colors for better visual organization

### Sample Data
- Click **"Load Sample Events"** to populate the calendar with example events
- Sample events demonstrate various event types and scenarios
- Perfect for testing and demonstration purposes

## Event Types

| Type | Icon | Description | Use Case |
|------|------|-------------|----------|
| Meeting | 👥 | General meetings and discussions | Client meetings, team discussions |
| Showing | 🏠 | Property viewings and tours | Open houses, property showings |
| Inspection | 🔍 | Property inspections and assessments | Pre-listing inspections, maintenance checks |
| Closing | 📋 | Property closings and settlements | Final closings, document signings |
| Other | 📅 | Miscellaneous events | Appointments, reminders, custom events |

## Color System

| Color | Hex | Use Case |
|-------|-----|----------|
| Blue | #3B82F6 | Default, general events |
| Green | #10B981 | Successful, completed events |
| Red | #EF4444 | Important, urgent events |
| Yellow | #F59E0B | Warning, attention needed |
| Purple | #8B5CF6 | Special, VIP events |
| Pink | #EC4899 | Social, networking events |

## Technical Details

### State Management
- **Local State**: React hooks for component state
- **Event Storage**: localStorage for persistence
- **Real-time Updates**: Immediate UI updates on changes

### Responsive Design
- **Mobile First**: Optimized for all screen sizes
- **Touch Friendly**: Gesture support for mobile devices
- **Responsive Grid**: Adaptive layouts for different viewports

### Performance
- **Memoized Calculations**: Efficient date and event processing
- **Lazy Rendering**: Only render visible calendar cells
- **Optimized Re-renders**: Minimal unnecessary updates

## Backend Integration

The calendar is designed for easy backend integration:

### API Endpoints Needed
```typescript
// GET /api/events - Fetch all events
// POST /api/events - Create new event
// PUT /api/events/:id - Update existing event
// DELETE /api/events/:id - Delete event
```

### Event Data Structure
```typescript
interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink'
  type: 'meeting' | 'showing' | 'inspection' | 'closing' | 'other'
  location?: string
  attendees?: string[]
  notes?: string
  userId?: string        // For user-specific events
  propertyId?: string    // For property-related events
  clientId?: string      // For client-related events
}
```

### Integration Steps
1. **Replace localStorage calls** with API calls
2. **Add authentication headers** to requests
3. **Implement error handling** for API failures
4. **Add loading states** during API calls
5. **Implement real-time updates** (WebSocket/SSE)

## Customization

### Styling
- **Tailwind CSS**: Easy to customize with utility classes
- **CSS Variables**: Consistent color scheme and spacing
- **Component Props**: Flexible configuration options

### Event Types
- **Add New Types**: Extend the type system in the interface
- **Custom Icons**: Replace emoji icons with custom SVGs
- **Type-specific Fields**: Add fields specific to certain event types

### Views
- **Custom Views**: Add new calendar view modes
- **View-specific Features**: Enhance specific views with additional functionality
- **Custom Navigation**: Modify date navigation behavior

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Features Used**: ES6+, CSS Grid, Flexbox, localStorage

## Future Enhancements

### Planned Features
- **Recurring Events**: Weekly, monthly, yearly recurring patterns
- **Event Templates**: Pre-defined event templates for common scenarios
- **Calendar Sharing**: Share calendars with team members
- **Export/Import**: Calendar data export (iCal, CSV)
- **Notifications**: Email/SMS reminders for upcoming events
- **Calendar Sync**: Integration with Google Calendar, Outlook

### Advanced Features
- **Drag & Drop**: Drag events to reschedule
- **Event Conflicts**: Detection and resolution of scheduling conflicts
- **Resource Booking**: Room and equipment reservation
- **Multi-calendar**: Support for multiple calendar sources
- **Advanced Filtering**: Date ranges, event types, attendees

## Troubleshooting

### Common Issues
1. **Events Not Saving**: Check localStorage permissions
2. **Date Navigation Issues**: Verify date object handling
3. **Performance Issues**: Check for large event datasets
4. **Mobile Responsiveness**: Test on various screen sizes

### Debug Mode
- Enable browser developer tools
- Check console for error messages
- Verify localStorage data integrity
- Test with sample events first

## Support

For technical support or feature requests:
- Check the component documentation
- Review the code comments
- Test with sample data first
- Ensure browser compatibility

---

**Note**: This calendar component is designed to be production-ready and can be easily integrated with any backend system. The sample events provide a great starting point for testing and demonstration purposes.

import { CalendarEvent } from '@/app/dashboard/calendar/page'

export const sampleEvents: Omit<CalendarEvent, 'id'>[] = [
  {
    title: 'Property Showing - Downtown Condo',
    description: 'Showing the new downtown condo to potential buyers. Beautiful 2-bedroom unit with city views.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 14, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 15, 0),
    allDay: false,
    color: 'blue',
    type: 'showing',
    location: '123 Main St, Downtown',
    attendees: ['John Smith', 'Sarah Johnson'],
    notes: 'Bring property brochures and floor plans'
  },
  {
    title: 'Client Meeting - Investment Property',
    description: 'Discussing investment opportunities with high-net-worth client.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2, 10, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2, 11, 30),
    allDay: false,
    color: 'green',
    type: 'meeting',
    location: 'Office Conference Room A',
    attendees: ['Michael Brown', 'David Wilson'],
    notes: 'Prepare investment portfolio and market analysis'
  },
  {
    title: 'Property Inspection - Suburban House',
    description: 'Conducting thorough inspection of 4-bedroom suburban house before listing.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3, 9, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3, 11, 0),
    allDay: false,
    color: 'purple',
    type: 'inspection',
    location: '456 Oak Ave, Suburbs',
    attendees: ['Lisa Davis', 'Tom Anderson'],
    notes: 'Bring inspection checklist and camera'
  },
  {
    title: 'Closing - Beachfront Property',
    description: 'Final closing for the beachfront property sale. All documents ready.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 5, 13, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 5, 15, 0),
    allDay: false,
    color: 'red',
    type: 'closing',
    location: 'Law Office of Johnson & Associates',
    attendees: ['Buyer', 'Seller', 'Attorney', 'Title Company'],
    notes: 'Bring all closing documents and identification'
  },
  {
    title: 'Team Training Session',
    description: 'Monthly team training on new CRM features and sales techniques.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7, 14, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7, 16, 0),
    allDay: false,
    color: 'yellow',
    type: 'meeting',
    location: 'Training Room B',
    attendees: ['All Agents', 'Sales Manager'],
    notes: 'Laptops required for hands-on training'
  },
  {
    title: 'Open House - Luxury Villa',
    description: 'Open house for the luxury villa. Expecting high turnout.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 8, 12, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 8, 17, 0),
    allDay: false,
    color: 'pink',
    type: 'showing',
    location: '789 Luxury Lane, Hillside',
    attendees: ['Marketing Team', 'Support Staff'],
    notes: 'Set up signs, refreshments, and marketing materials'
  },
  {
    title: 'Market Analysis Review',
    description: 'Review current market trends and adjust pricing strategies.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 10, 9, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 10, 10, 30),
    allDay: false,
    color: 'blue',
    type: 'meeting',
    location: 'Conference Room C',
    attendees: ['Analytics Team', 'Senior Agents'],
    notes: 'Prepare market reports and competitor analysis'
  },
  {
    title: 'Client Appreciation Event',
    description: 'Annual client appreciation event to strengthen relationships.',
    start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 14, 18, 0),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 14, 21, 0),
    allDay: false,
    color: 'green',
    type: 'other',
    location: 'Grand Hotel Ballroom',
    attendees: ['All Clients', 'Team Members'],
    notes: 'Catering and entertainment arranged'
  }
]

export const getSampleEvents = (): CalendarEvent[] => {
  return sampleEvents.map((event, index) => ({
    ...event,
    id: `sample-${index + 1}`
  }))
}

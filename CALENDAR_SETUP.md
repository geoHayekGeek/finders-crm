# Calendar System Setup Guide

This guide will help you set up the complete calendar system for the Finders CRM application.

## 🗄️ Database Setup

### 1. Create Calendar Events Table

Run the database setup script to create the required table:

```bash
cd backend
npm run setup-calendar
```

This will:
- Create the `calendar_events` table
- Add necessary indexes for performance
- Set up triggers for automatic timestamp updates

### 2. Table Structure

The `calendar_events` table includes:

- **id**: Unique identifier (auto-increment)
- **title**: Event title (required)
- **description**: Event description
- **start_time**: Event start time (required)
- **end_time**: Event end time (required)
- **all_day**: Boolean for all-day events
- **color**: Event color (blue, green, red, yellow, purple, pink)
- **type**: Event type (meeting, showing, inspection, closing, other)
- **location**: Event location
- **attendees**: Array of attendee names/IDs
- **notes**: Additional notes
- **created_by**: User ID who created the event
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

## 🔧 Backend Setup

### 1. Calendar Model (`backend/models/calendarEventModel.js`)

Provides database operations:
- Create, read, update, delete events
- Query events by date range, month, week, day
- Search events by text
- Get events by user

### 2. Calendar Controller (`backend/controllers/calendarController.js`)

Handles HTTP requests:
- **GET** `/api/calendar/all` - Get all events
- **GET** `/api/calendar/range` - Get events by date range
- **GET** `/api/calendar/month` - Get events by month
- **GET** `/api/calendar/week` - Get events by week
- **GET** `/api/calendar/day` - Get events by day
- **GET** `/api/calendar/:id` - Get event by ID
- **POST** `/api/calendar` - Create new event
- **PUT** `/api/calendar/:id` - Update event
- **DELETE** `/api/calendar/:id` - Delete event
- **GET** `/api/calendar/search` - Search events

### 3. Calendar Routes (`backend/routes/calendarRoutes.js`)

Defines API endpoints and maps them to controller functions.

### 4. Main Routes (`backend/routes/index.js`)

Mounts calendar routes at `/api/calendar`.

## 🌐 Frontend Setup

### 1. API Routes

- **`/api/calendar`** - Main calendar endpoint (GET, POST)
- **`/api/calendar/[id]`** - Individual event endpoint (GET, PUT, DELETE)

### 2. Components

- **Calendar Page** (`frontend/src/app/dashboard/calendar/page.tsx`)
  - Main calendar interface
  - Fetches events from API
  - Handles CRUD operations
  - Error handling and loading states

- **Calendar Component** (`frontend/src/components/Calendar.tsx`)
  - Renders calendar grid (month/week/day views)
  - Handles date and hour clicks
  - Displays events

- **Event Modal** (`frontend/src/components/EventModal.tsx`)
  - Form for creating/editing events
  - User assignment with UserSelector
  - Validation and error handling

- **UserSelector** (`frontend/src/components/UserSelector.tsx`)
  - Search and select multiple users
  - Fetches users from database
  - Fallback to mock data if backend unavailable

### 3. Features

- **Mobile Responsive**: Optimized for all screen sizes
- **Multiple Views**: Month, week, and day views
- **Event Management**: Create, edit, delete events
- **User Assignment**: Assign multiple attendees to events
- **Color Coding**: Different colors for event types
- **Date Navigation**: Easy navigation between dates
- **Hour Click**: Click on hour slots to create events
- **Search**: Find events by title, description, or location

## 🚀 Getting Started

### 1. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

The server will start on port 10000.

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on port 3000.

### 3. Setup Database

```bash
cd backend
npm run setup-calendar
```

### 4. Test the System

1. Open `http://localhost:3000/dashboard/calendar`
2. Try creating a new event
3. Assign users to events
4. Test different calendar views
5. Edit and delete events

## 🔌 API Endpoints

### Base URL: `http://localhost:10000/api/calendar`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/all` | Get all events |
| GET | `/range?start=2024-01-01&end=2024-01-31` | Get events by date range |
| GET | `/month?year=2024&month=1` | Get events by month |
| GET | `/week?startOfWeek=2024-01-01` | Get events by week |
| GET | `/day?date=2024-01-15` | Get events by day |
| GET | `/:id` | Get event by ID |
| POST | `/` | Create new event |
| PUT | `/:id` | Update event |
| DELETE | `/:id` | Delete event |
| GET | `/search?q=meeting` | Search events |

## 📱 Mobile Features

- **Responsive Design**: Adapts to all screen sizes
- **Mobile Sidebar**: Events list appears below toggle button
- **Touch Friendly**: Large touch targets and gestures
- **Scrollable Events**: Internal scrolling prevents page scroll
- **Optimized Forms**: Mobile-friendly input fields

## 🎨 Event Types & Colors

- **Meeting** (Blue): Team meetings, client consultations
- **Property Showing** (Green): Property tours and viewings
- **Inspection** (Red): Property inspections and assessments
- **Closing** (Yellow): Property closings and settlements
- **Other** (Purple): Miscellaneous events

## 🔒 Security & Validation

- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- Date validation (end time must be after start time)
- Required field validation
- Error handling and logging

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check database credentials in `.env`
   - Ensure PostgreSQL is running
   - Verify database exists

2. **Table Creation Failed**
   - Run `npm run setup-calendar` again
   - Check database permissions
   - Review SQL syntax

3. **API Endpoints Not Working**
   - Verify backend server is running on port 10000
   - Check CORS configuration
   - Review route mounting

4. **Frontend Not Loading Events**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Check network tab for failed requests

### Debug Mode

Enable detailed logging by checking console output:
- Backend: Look for database query logs
- Frontend: Check browser console for API calls
- Network: Monitor network requests in DevTools

## 📚 Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Express.js Guide**: https://expressjs.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

## 🤝 Support

If you encounter issues:
1. Check the console logs
2. Verify all services are running
3. Test database connectivity
4. Review API endpoint responses
5. Check browser network tab

The system includes fallback mock data when the backend is unavailable, so the frontend will still function for testing purposes.

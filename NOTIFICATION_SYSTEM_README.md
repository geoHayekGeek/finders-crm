# 🔔 Notification System Implementation

## Overview

A comprehensive notification system has been implemented for the Finders CRM that provides real-time notifications for property-related activities. The system includes database schema, backend API, and frontend UI components.

## 🏗️ Architecture

### Database Layer
- **Table**: `notifications` - Stores all notification data
- **Functions**: 
  - `create_notification_for_users()` - Creates notifications for multiple users
  - `get_property_notification_users()` - Gets users who should be notified for property changes
- **Triggers**: Auto-update `updated_at` timestamp

### Backend Layer
- **Model**: `Notification` - Handles all database operations
- **Controller**: `NotificationController` - Manages API endpoints
- **Routes**: `/api/notifications/*` - RESTful API endpoints
- **Integration**: Property operations trigger notifications automatically

### Frontend Layer
- **Component**: `NotificationBell` - Interactive notification UI
- **API Client**: `notificationsApi` - Handles API communication
- **Real-time Updates**: Notifications refresh when dropdown opens

## 🚀 Features

### Notification Types
- **Property Created**: Notifies management and assigned agents
- **Property Updated**: Notifies management and assigned agents
- **Property Deleted**: Notifies management and assigned agents
- **Property Assigned**: Notifies the assigned agent
- **Property Referral**: Notifies users added as referrals

### User Roles & Notifications
- **Admin**: Receives all property notifications
- **Operations Manager**: Receives all property notifications
- **Operations**: Receives all property notifications
- **Agent Manager**: Receives all property notifications
- **Team Leader**: Receives notifications for their team's properties
- **Agent**: Receives notifications for assigned properties and referrals

### UI Features
- **Badge Count**: Shows unread notification count
- **Dropdown Panel**: Displays notifications with rich formatting
- **Mark as Read**: Individual and bulk read actions
- **Real-time Updates**: Refreshes when opened
- **Loading States**: Smooth user experience
- **Responsive Design**: Works on all screen sizes

## 📊 Database Schema

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'urgent')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('property', 'lead', 'user', 'system')),
    entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 API Endpoints

### GET `/api/notifications`
- **Description**: Get notifications for authenticated user
- **Query Parameters**:
  - `limit` (number): Number of notifications to return (default: 50)
  - `offset` (number): Number of notifications to skip (default: 0)
  - `unreadOnly` (boolean): Return only unread notifications
  - `entityType` (string): Filter by entity type

### GET `/api/notifications/stats`
- **Description**: Get notification statistics for user
- **Returns**: Total, unread, urgent unread, and today's count

### GET `/api/notifications/unread-count`
- **Description**: Get unread notification count
- **Returns**: Current unread count

### PATCH `/api/notifications/:id/read`
- **Description**: Mark specific notification as read
- **Returns**: Updated notification data

### PATCH `/api/notifications/mark-all-read`
- **Description**: Mark all notifications as read
- **Returns**: Number of notifications updated

### DELETE `/api/notifications/:id`
- **Description**: Delete specific notification
- **Returns**: Deleted notification data

### POST `/api/notifications/test`
- **Description**: Create test notification (development)
- **Body**: `{ title?, message?, type? }`

## 🎯 Notification Triggers

### Property Operations
1. **Property Created**:
   - Notifies: Admin, Operations Manager, Operations, Agent Manager
   - Excludes: User who created the property
   - Message: "A new property '[Building Name]' has been added to the system."

2. **Property Updated**:
   - Notifies: Admin, Operations Manager, Operations, Agent Manager, Assigned Agent
   - Excludes: User who updated the property
   - Message: "The property '[Building Name]' has been updated."

3. **Property Deleted**:
   - Notifies: Admin, Operations Manager, Operations, Agent Manager, Assigned Agent
   - Excludes: User who deleted the property
   - Message: "The property '[Building Name]' has been deleted."

4. **Property Referral Added**:
   - Notifies: Specific user added as referral
   - Message: "You have been added as a referral for the property '[Building Name]'."

## 🎨 Frontend Components

### NotificationBell Component
```tsx
<NotificationBell />
```

**Features**:
- Bell icon with animated badge
- Dropdown panel with notifications
- Mark as read functionality
- Real-time updates
- Loading states
- Responsive design

**Props**: None (uses authentication context)

**State Management**:
- `notifications`: Array of notification objects
- `unreadCount`: Number of unread notifications
- `loading`: Loading state for API calls
- `isOpen`: Dropdown open/closed state

## 🔄 Real-time Updates

The notification system provides near real-time updates through:

1. **On Component Mount**: Fetches initial notifications
2. **On Dropdown Open**: Refreshes notifications
3. **After Actions**: Updates local state immediately
4. **API Integration**: Uses authenticated API calls

## 🛠️ Setup Instructions

### 1. Database Setup
```bash
cd backend
node setup-notifications-db.js
```

### 2. Backend Dependencies
The notification system uses existing dependencies:
- `pg` for database operations
- `express` for API routes
- Existing authentication middleware

### 3. Frontend Integration
The notification bell is already integrated into the dashboard layout:
```tsx
// In dashboard/layout.tsx
<NotificationBell />
```

## 📱 Usage Examples

### Creating a Test Notification
```javascript
// Via API
POST /api/notifications/test
{
  "title": "Test Notification",
  "message": "This is a test notification",
  "type": "info"
}
```

### Getting Notifications
```javascript
// Via API
GET /api/notifications?limit=10&unreadOnly=true

// Via Frontend
const response = await notificationsApi.getAll({
  limit: 10,
  unreadOnly: true
});
```

### Marking as Read
```javascript
// Via API
PATCH /api/notifications/123/read

// Via Frontend
await notificationsApi.markAsRead(123);
```

## 🔒 Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **User Isolation**: Users can only see their own notifications
- **CSRF Protection**: Uses existing CSRF protection
- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Prevention**: Uses parameterized queries

## 🚀 Performance Optimizations

- **Database Indexes**: Optimized for common queries
- **Pagination**: Limits notification loading
- **Caching**: Frontend caches notification state
- **Lazy Loading**: Notifications load only when needed
- **Cleanup**: Old notifications are automatically cleaned up

## 🧪 Testing

### Backend Testing
```bash
# Test notification creation
curl -X POST http://localhost:10000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Test message"}'

# Test getting notifications
curl -X GET http://localhost:10000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing
1. Login to the dashboard
2. Click the notification bell
3. Verify notifications load
4. Test mark as read functionality
5. Test mark all as read functionality

## 🔮 Future Enhancements

1. **Real-time WebSocket Updates**: Push notifications without refresh
2. **Email Notifications**: Send email for urgent notifications
3. **Push Notifications**: Browser push notifications
4. **Notification Preferences**: User-configurable notification settings
5. **Notification Categories**: More granular notification types
6. **Bulk Actions**: Delete multiple notifications
7. **Search & Filter**: Advanced notification filtering
8. **Notification History**: Archive old notifications

## 📝 Configuration

### Environment Variables
No additional environment variables required. Uses existing database and authentication configuration.

### Database Configuration
The notification system uses the existing database connection and follows the same patterns as other models.

## 🐛 Troubleshooting

### Common Issues

1. **Notifications Not Appearing**:
   - Check if user is authenticated
   - Verify database connection
   - Check browser console for errors

2. **API Errors**:
   - Verify JWT token is valid
   - Check CSRF token if applicable
   - Verify database permissions

3. **Performance Issues**:
   - Check database indexes
   - Monitor API response times
   - Consider pagination limits

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in the backend environment.

## 📊 Monitoring

### Key Metrics
- Notification creation rate
- Read/unread ratios
- API response times
- Error rates

### Logging
All notification operations are logged with appropriate levels:
- `INFO`: Successful operations
- `WARN`: Non-critical issues
- `ERROR`: Failed operations

## 🤝 Contributing

When adding new notification types:

1. Update the database schema if needed
2. Add notification creation logic to the appropriate controller
3. Update the frontend icon mapping
4. Add tests for the new functionality
5. Update this documentation

## 📄 License

This notification system is part of the Finders CRM project and follows the same licensing terms.

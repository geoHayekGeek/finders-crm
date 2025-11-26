# E2E Test Analysis - Finders CRM

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.4.6 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL (using `pg` library)
- **Authentication**: JWT tokens stored in localStorage
- **API Base URL**: `http://localhost:10000/api` (default)
- **Frontend URL**: `http://localhost:3000` (default)

### Database Structure
- **Database**: PostgreSQL
- **Connection**: Uses `pg` Pool from `backend/config/db.js`
- **Tables**: users, properties, leads, categories, statuses, lead_statuses, referrals, calendar_events, viewings, notifications, reports, settings, etc.

### Authentication Flow
1. User logs in via `/` (home page) with email/password
2. Backend validates credentials and returns JWT token + user data
3. Frontend stores token in localStorage and user data
4. All API requests include `Authorization: Bearer <token>` header
5. Protected routes check authentication via `ProtectedRoute` component
6. Logout clears localStorage and redirects to home

### User Roles & Permissions
- **admin**: Full access
- **operations manager**: Most access except admin management
- **operations**: Limited management access
- **agent manager**: Agent and team management
- **team_leader**: Team management
- **agent**: Read-only access to assigned data
- **accountant**: Financial data access

---

## Pages & Routes Analysis

### Public Routes
1. **`/` (Home/Login Page)**
   - Login form (email, password)
   - Redirects to `/properties` on successful login
   - Shows error messages for invalid credentials

### Protected Routes (Require Authentication)

#### Dashboard Routes (`/dashboard/*`)
All dashboard routes are wrapped in `DashboardLayout` with navigation sidebar.

1. **`/dashboard`** - Dashboard home (redirects to properties)
2. **`/properties`** (also `/dashboard/properties`)
   - Properties list with filters
   - Create/Edit/Delete/View property modals
   - Image upload functionality
   - Categories and statuses management
   - **CRUD Operations**: Full CRUD for properties
   - **Forms**: Add property, Edit property, View property, Delete confirmation
   - **Filters**: Status, category, property type, agent, location, price range
   - **Permissions**: `canManageProperties`, `canViewProperties`

3. **`/properties/categories`**
   - Categories list
   - Create/Edit/Delete categories
   - **CRUD Operations**: Full CRUD for categories
   - **Permissions**: `canManageCategoriesAndStatuses`

4. **`/properties/statuses`**
   - Statuses list
   - Create/Edit/Delete statuses
   - **CRUD Operations**: Full CRUD for statuses
   - **Permissions**: `canManageCategoriesAndStatuses`

5. **`/dashboard/leads`**
   - Leads list with filters
   - Create/Edit/Delete/View lead modals
   - Lead referrals management
   - Lead notes
   - **CRUD Operations**: Full CRUD for leads
   - **Forms**: Add lead, Edit lead, View lead, Delete confirmation
   - **Filters**: Status, agent, date range, referral source
   - **Permissions**: `canManageLeads`, `canViewLeads`

6. **`/dashboard/leads/statuses`**
   - Lead statuses management
   - **CRUD Operations**: Full CRUD for lead statuses
   - **Permissions**: `canManageLeads`

7. **`/dashboard/calendar`**
   - Calendar view (month/week/day)
   - Create/Edit/Delete calendar events
   - Event types: meeting, showing, inspection, closing, other
   - Link events to properties and leads
   - **CRUD Operations**: Full CRUD for calendar events
   - **Forms**: Event modal with property/lead selection
   - **Permissions**: Role-based event permissions

8. **`/dashboard/reports`**
   - Multiple report tabs:
     - Monthly Agent Statistics
     - DCSR Report
     - Operations Commission
     - Sale & Rent Source
     - Operations Daily
   - **CRUD Operations**: Create/Update/Delete reports
   - **Forms**: Report creation/editing forms
   - **Permissions**: `canViewAgentPerformance`

9. **`/dashboard/hr`**
   - User management (CRUD)
   - Team leader/agent assignments
   - User documents management
   - **CRUD Operations**: Full CRUD for users
   - **Forms**: Add user, Edit user, View user, Delete user
   - **Filters**: Role, location, search
   - **Permissions**: `canAccessHR`

10. **`/dashboard/settings`**
    - System settings management
    - SMTP configuration
    - Commission settings
    - **CRUD Operations**: Update settings
    - **Permissions**: `admin` only

11. **`/dashboard/viewings`**
    - Viewings management
    - **CRUD Operations**: Full CRUD for viewings
    - **Permissions**: Role-based

12. **`/notifications`**
    - Notifications list
    - Mark as read/unread
    - **CRUD Operations**: Read/Update notifications

#### Password Reset Routes
- **`/forgot-password`** - Request password reset
- **`/reset-password`** - Reset password with token
- **`/new-password`** - Set new password

---

## API Routes Analysis

### Authentication Routes (`/api/users`)
- `POST /api/users/login` - Login (public)
- `POST /api/users/register` - Register (public, but admin-only in practice)
- `GET /api/users/all` - Get all users (protected)
- `GET /api/users/agents` - Get agents (protected)
- `GET /api/users/role/:role` - Get users by role (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Delete user (protected)

### Properties Routes (`/api/properties`)
- `GET /api/properties` - Get all properties (filtered by role)
- `GET /api/properties/filtered` - Get filtered properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `POST /api/properties/:id/upload-main-image` - Upload main image
- `POST /api/properties/:id/upload-gallery` - Upload gallery images
- `DELETE /api/properties/:id/images/:imageUrl` - Remove image

### Leads Routes (`/api/leads`)
- `GET /api/leads` - Get all leads (filtered by role)
- `GET /api/leads/filtered` - Get filtered leads
- `GET /api/leads/:id` - Get single lead
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/:id/referrals` - Get lead referrals
- `POST /api/leads/:id/referrals` - Add lead referral
- `DELETE /api/leads/:id/referrals/:referralId` - Delete lead referral
- `GET /api/leads/:id/notes` - Get lead notes
- `POST /api/leads/:id/notes` - Add lead note

### Calendar Routes (`/api/calendar`)
- `GET /api/calendar` - Get all events
- `GET /api/calendar/:id` - Get single event
- `POST /api/calendar` - Create event
- `PUT /api/calendar/:id` - Update event
- `DELETE /api/calendar/:id` - Delete event
- `GET /api/calendar/:id/permissions` - Get event permissions

### Reports Routes
- `/api/reports` - Monthly agent reports
- `/api/dcsr-reports` - DCSR reports
- `/api/operations-commission` - Operations commission reports
- `/api/operations-daily` - Operations daily reports

### Other Routes
- `/api/categories` - Categories CRUD
- `/api/statuses` - Statuses CRUD
- `/api/lead-statuses` - Lead statuses CRUD
- `/api/viewings` - Viewings CRUD
- `/api/notifications` - Notifications CRUD
- `/api/settings` - Settings management

---

## Forms & User Interactions

### Login Form (`/`)
- Email input
- Password input (with show/hide toggle)
- Submit button
- Error message display

### Property Forms
- **Add Property**: Reference number, status, type, location, category, building name, owner name, phone, surface, details, interior details, built year, view type, concierge, agent, price, notes, referrals, images
- **Edit Property**: Same fields as add
- **View Property**: Read-only display of all fields
- **Delete Property**: Confirmation dialog

### Lead Forms
- **Add Lead**: Customer name, phone, agent, referral source, notes, status, date
- **Edit Lead**: Same fields as add
- **View Lead**: Read-only display with referrals and notes
- **Delete Lead**: Confirmation dialog

### Calendar Event Form
- Title, description, start/end date/time, all day toggle, color, type, location, attendees, notes, property link, lead link

### User Forms (HR)
- **Add User**: Name, email, password, role, location, phone, DOB
- **Edit User**: Same fields as add
- **View User**: Read-only display with documents
- **Delete User**: Confirmation dialog

### Settings Form
- SMTP settings, commission settings, other system settings

---

## Test Data Requirements

### Required Test Users
1. **Admin User**
   - Email: `admin@test.com`
   - Password: `admin123`
   - Role: `admin`

2. **Operations Manager**
   - Email: `opsmanager@test.com`
   - Password: `ops123`
   - Role: `operations manager`

3. **Agent**
   - Email: `agent@test.com`
   - Password: `agent123`
   - Role: `agent`

### Required Test Data
- **Categories**: At least 3 categories (Apartment, Villa, Office)
- **Statuses**: At least 3 statuses (Available, Sold, Rented)
- **Lead Statuses**: At least 2 statuses (active, closed)
- **Properties**: At least 5 properties with various statuses and categories
- **Leads**: At least 5 leads with various statuses
- **Calendar Events**: At least 3 events
- **Users**: Multiple users with different roles

---

## Database Tables for Testing

### Core Tables
- `users` - User accounts
- `properties` - Property listings
- `leads` - Lead records
- `categories` - Property categories
- `statuses` - Property statuses
- `lead_statuses` - Lead statuses
- `referrals` - Property referrals
- `calendar_events` - Calendar events
- `viewings` - Property viewings
- `notifications` - User notifications
- `settings` - System settings
- `reports` - Various report tables

### Foreign Key Dependencies
- Properties → categories, statuses, users (agent)
- Leads → users (agent), lead_statuses
- Referrals → properties, users (employee)
- Calendar events → properties, leads, users (created_by)
- Viewings → properties, users (agent)

---

## Protected vs Public Routes

### Public Routes
- `/` - Login page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset with token
- `/new-password` - New password setup

### Protected Routes (All others)
All routes under `/dashboard/*`, `/properties/*`, `/notifications` require authentication.

---

## Middleware & Security

### Authentication Middleware
- `authenticateToken` - Verifies JWT token
- `filterDataByRole` - Filters data based on user role

### Permission Middleware
- `canManageProperties` - Check property management permission
- `canViewProperties` - Check property view permission
- `canManageLeads` - Check lead management permission
- `canViewLeads` - Check lead view permission
- `canViewAllData` - Check full data access
- `canViewAgentPerformance` - Check agent performance access
- `canAccessHR` - Check HR access

### Security Middleware
- `csrfProtection` - CSRF token validation
- `xssProtection` - XSS protection
- `rateLimiter` - Rate limiting
- `sanitizeRequestBody` - Input sanitization

---

## Redirects & Navigation

1. **Unauthenticated users** → Redirected to `/` (login)
2. **Authenticated users on `/`** → Redirected to `/properties`
3. **After login** → Redirected to `/properties`
4. **After logout** → Redirected to `/`
5. **Protected route access without auth** → Redirected to `/`

---

## Test Scenarios Summary

### Authentication Tests
- Login with valid credentials
- Login with invalid credentials
- Login with inactive account
- Logout functionality
- Protected route access without auth
- Token expiration handling

### Properties Tests
- View properties list
- Filter properties
- Create property
- Edit property
- Delete property
- View property details
- Upload property images
- Manage categories
- Manage statuses

### Leads Tests
- View leads list
- Filter leads
- Create lead
- Edit lead
- Delete lead
- View lead details
- Add lead referrals
- Add lead notes

### Calendar Tests
- View calendar (month/week/day)
- Create event
- Edit event
- Delete event
- Link event to property
- Link event to lead

### Reports Tests
- View reports list
- Create report
- Edit report
- Delete report
- Export reports

### HR Tests
- View users list
- Create user
- Edit user
- Delete user
- Assign agent to team leader
- Upload user documents

### Settings Tests
- View settings
- Update SMTP settings
- Update commission settings

### Permission Tests
- Agent can only see assigned data
- Operations manager can see all except admin data
- Admin can see everything
- Role-based form access


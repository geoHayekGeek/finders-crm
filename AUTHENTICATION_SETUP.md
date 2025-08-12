# 🔐 Authentication Setup Guide

## Overview
This guide explains how to set up and use the authentication system for the Finders CRM application. The system is designed for admin-only access, where administrators create and manage user accounts.

## 🚀 Quick Start

### 1. Backend Setup
First, ensure your backend is running:

```bash
cd backend
npm install
npm start
```

Your backend should be running on `http://localhost:3001`

### 2. Create Admin User
Run the admin creation script to create your first admin user:

```bash
cd backend
node createAdmin.js
```

This will create an admin user with:
- **Email**: `admin@finderscrm.com`
- **Password**: `admin123`
- **Role**: `admin`

⚠️ **IMPORTANT**: Change this password immediately after first login!

### 3. Frontend Setup
In a new terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Your frontend will be running on `http://localhost:3000`

## 🔑 Authentication Flow

### Login Process
1. User visits the landing page (`/`)
2. Enters email and password
3. Frontend sends credentials to backend (`POST /api/users/login`)
4. Backend validates credentials and returns JWT token + user data
5. Frontend stores token in localStorage and redirects to dashboard
6. All subsequent requests include the JWT token in Authorization header

### Protected Routes
- All dashboard routes (`/dashboard/*`) are protected
- Unauthenticated users are redirected to login page
- JWT token is automatically included in API requests

### Logout Process
1. User clicks "Sign out" in dashboard
2. Frontend clears localStorage (token + user data)
3. User is redirected to landing page
4. All protected routes become inaccessible

## 🛠️ API Endpoints

### Authentication
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user info

### Properties
- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🔒 Security Features

### JWT Tokens
- Tokens are stored in localStorage
- Automatically included in all API requests
- Protected routes check token validity

### Input Validation
- All form inputs are validated
- Backend validates all requests
- XSS protection through proper escaping

### Rate Limiting
- Backend implements rate limiting
- Prevents brute force attacks
- Configurable limits per endpoint

## 👥 User Management

### User Roles
- **admin**: Full system access, can manage users
- **broker**: Can manage properties, clients, and leads
- **agent**: Can view and manage assigned properties
- **manager**: Can manage properties and view reports

### Adding New Users
Currently, only admins can add users through the backend. To add a new user:

1. Use the backend admin panel (if implemented)
2. Directly insert into database
3. Use the API with admin privileges

## 🎨 UI Improvements Made

### Input Field Visibility
- Increased border thickness (`border-2`)
- Larger padding (`px-4 py-3`)
- Better contrast for placeholder text
- Improved focus states with blue borders

### Form Styling
- Larger, more visible input fields
- Better spacing between form elements
- Clear error message display
- Loading states for better UX

### Authentication Context
- Centralized auth state management
- Automatic token handling
- Protected route wrapper
- Seamless login/logout flow

## 🚨 Troubleshooting

### Common Issues

#### "Network error" on login
- Ensure backend is running on port 3001
- Check CORS configuration in backend
- Verify API endpoint exists

#### "Login failed" message
- Check email/password combination
- Verify user exists in database
- Check backend logs for errors

#### Can't access dashboard after login
- Check browser console for errors
- Verify token is stored in localStorage
- Check if backend is validating JWT correctly

#### Logout not working
- Check if token is properly cleared
- Verify redirect is working
- Check browser console for errors

### Debug Steps
1. Check browser console for errors
2. Verify backend is running and accessible
3. Check network tab for failed requests
4. Verify localStorage contains token
5. Check backend logs for authentication errors

## 🔧 Configuration

### Environment Variables
Create a `.env` file in your backend directory:

```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
DB_CONNECTION_STRING=your-database-connection-string
```

### CORS Configuration
Ensure your backend allows requests from the frontend:

```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

## 📱 Testing

### Test Credentials
Use the admin account created by the script:
- **Email**: `admin@finderscrm.com`
- **Password**: `admin123`

### Test Scenarios
1. **Login Success**: Enter correct credentials
2. **Login Failure**: Enter incorrect credentials
3. **Protected Routes**: Try accessing dashboard without login
4. **Logout**: Test logout functionality
5. **Token Persistence**: Refresh page after login

## 🚀 Next Steps

### Immediate Actions
1. ✅ Change default admin password
2. ✅ Test login/logout flow
3. ✅ Verify protected routes work
4. ✅ Test API endpoints with authentication

### Future Enhancements
1. **Password Reset**: Implement forgot password functionality
2. **User Registration**: Add admin user creation interface
3. **Role Management**: Implement role-based access control
4. **Session Management**: Add session timeout and refresh tokens
5. **Audit Logging**: Track user actions for security

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review browser console errors
3. Check backend logs
4. Verify database connectivity
5. Test API endpoints directly

---

**Remember**: Security is crucial for a CRM system. Always use strong passwords and keep your JWT secret secure!


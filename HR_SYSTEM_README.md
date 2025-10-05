# HR Management System Documentation

## Overview
The HR Management System is a comprehensive module for managing all system users with document management capabilities. This system allows administrators to view, edit, and manage users along with their associated documents (contracts, legal files, etc.).

## Features

### 1. User Management
- **View all users** in a clean table format
- **Filter users** by:
  - Role (Admin, Team Leader, Agent, Operations)
  - Work Location (custom locations like Beirut, Kesserwan, etc.)
  - Search (by name, email, user code, or phone)
- **User Statistics Dashboard**:
  - Total users count
  - Agents count
  - Team Leaders count
  - Assigned agents count
- **User Actions**:
  - View user details
  - Edit user information
  - Delete users
  - Manage user documents

### 2. Document Management
- **Upload multiple documents** per user
- **Supported file types**:
  - PDF documents
  - Microsoft Word (`.doc`, `.docx`)
  - Microsoft Excel (`.xls`, `.xlsx`)
  - Images (`.jpg`, `.jpeg`, `.png`)
- **File size limit**: 10MB per file
- **Document features**:
  - Custom labels for each document
  - Optional notes
  - Track who uploaded each document
  - Upload date and time
  - File size display
  - Download documents
  - Edit document metadata
  - Delete documents (soft delete)

### 3. Export Functionality
- Export user list to CSV
- Export user list to Excel
- Filtered data export (exports only filtered results)

## Database Schema

### New Tables

#### 1. User Updates
```sql
-- Added work_location column to users table
ALTER TABLE users ADD COLUMN work_location VARCHAR(255);
```

#### 2. User Documents Table
```sql
CREATE TABLE user_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_label VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Database Migration
Run the SQL migration files in order:
```bash
cd backend
psql -d your_database_name -f database/add-work-location-to-users.sql
psql -d your_database_name -f database/create-user-documents-table.sql
```

### 2. Backend Setup
The backend routes are automatically registered. Ensure your server is running:
```bash
cd backend
npm start
```

### 3. Frontend Access
The HR page is accessible at: `/dashboard/hr`

**Permissions**: Only users with `canManageUsers` permission (Admin and Operations Manager) can access the HR page.

## API Endpoints

### User Management
- `GET /api/users/all` - Get all users
- `POST /api/users/register` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/agents` - Get agents only

### Document Management
- `POST /api/users/:userId/documents` - Upload document
- `GET /api/users/:userId/documents` - Get user documents
- `GET /api/users/documents/:documentId` - Get specific document
- `GET /api/users/documents/:documentId/download` - Download document
- `PUT /api/users/documents/:documentId` - Update document metadata
- `DELETE /api/users/documents/:documentId` - Delete document

## File Storage

Documents are stored in: `backend/public/documents/users/`

**Important**: Ensure this directory exists and has proper write permissions:
```bash
mkdir -p backend/public/documents/users
chmod 755 backend/public/documents/users
```

## Component Structure

### Frontend Components

1. **Main Page**: `frontend/src/app/dashboard/hr/page.tsx`
   - Main HR dashboard with table view
   - Filtering and search functionality
   - User statistics cards
   - Export functionality

2. **Document Component**: `frontend/src/components/UserDocuments.tsx`
   - Document upload interface
   - Document list with actions
   - Edit and delete functionality
   - Download functionality

### Backend Structure

1. **Models**:
   - `backend/models/userModel.js` - User management (updated)
   - `backend/models/userDocumentModel.js` - Document management (new)

2. **Controllers**:
   - `backend/controllers/userController.js` - User operations (updated)
   - `backend/controllers/userDocumentController.js` - Document operations (new)

3. **Routes**:
   - `backend/routes/userRoutes.js` - User endpoints
   - `backend/routes/userDocumentRoutes.js` - Document endpoints (new)

## Usage Examples

### Adding a User with Work Location
1. Navigate to HR page
2. Click "Add User" button
3. Fill in user details including work location (e.g., "Beirut", "Kesserwan")
4. Submit the form

### Uploading Documents
1. Click "Documents" button next to a user
2. Click "Upload New Document" 
3. Select file (PDF, Word, Excel, or Image)
4. Provide a descriptive label (e.g., "Employment Contract 2024")
5. Optionally add notes
6. Click "Upload"

### Managing Documents
- **Download**: Click the download icon next to any document
- **Edit**: Click the edit icon to change the label or notes
- **Delete**: Click the delete icon (soft delete - can be restored from database)

## Security Considerations

1. **File Upload Security**:
   - File type validation on both frontend and backend
   - File size limit enforcement (10MB)
   - Unique filename generation to prevent conflicts

2. **Access Control**:
   - HR page only accessible to Admin and Operations Manager
   - Document downloads require authentication
   - User ID verification on all document operations

3. **Data Protection**:
   - Soft delete for documents (can be recovered if needed)
   - Cascade delete for user documents when user is deleted
   - Audit trail (uploaded_by, upload_date fields)

## Future Enhancements

Potential features for future development:
- Document versioning
- Document expiration dates (e.g., for contracts)
- Document categories/tags
- Bulk document upload
- Document preview in browser
- Email notifications for document uploads
- Document approval workflow
- Hard delete option with confirmation

## Troubleshooting

### File Upload Fails
- Check directory permissions: `backend/public/documents/users`
- Verify file size is under 10MB
- Ensure file type is supported
- Check backend logs for errors

### Documents Not Showing
- Verify database connection
- Check that `user_documents` table exists
- Ensure user has proper authentication token

### Access Denied
- Verify user role has `canManageUsers` permission
- Check authentication token is valid
- Ensure user is logged in

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Verify database migrations ran successfully
3. Check browser console for frontend errors
4. Review API responses in Network tab

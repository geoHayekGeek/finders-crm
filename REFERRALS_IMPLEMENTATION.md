# Referrals System Implementation

## Overview
The referrals system allows users to track who referred properties to the CRM system. Referrals can be either existing employees or custom names, and each referral includes a date for tracking purposes.

## Features

### Frontend Components
- **ReferralSelector**: A comprehensive component that allows users to:
  - Select from existing employees
  - Add custom referral names
  - Set referral dates
  - Manage multiple referrals per property
  - View and edit existing referrals

### Backend Implementation
- **Database**: New `referrals` table with proper foreign key relationships
- **API**: Updated property creation and retrieval to handle referrals
- **Validation**: Proper data validation and error handling

## Database Schema

### Referrals Table
```sql
CREATE TABLE referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('employee', 'custom') NOT NULL DEFAULT 'custom',
  employee_id INT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_property_id (property_id),
  INDEX idx_employee_id (employee_id),
  INDEX idx_date (date),
  INDEX idx_type (type)
);
```

### Properties Table Updates
- Added `referrals_count` column to track the number of referrals per property

### Database Views
- `properties_with_referrals`: A view that joins properties with their referral information

## API Endpoints

### Create Property (Updated)
- **POST** `/api/properties`
- Now accepts `referrals` array in the request body
- Each referral object should contain:
  ```json
  {
    "name": "string",
    "type": "employee" | "custom",
    "employee_id": "number (optional, for employee type)",
    "date": "YYYY-MM-DD"
  }
  ```

### Get Properties (Updated)
- **GET** `/api/properties`
- Now returns properties with their associated referrals
- Referrals are included as an array in each property object

## Frontend Usage

### Adding Referrals to Properties
1. Open the Add Property or Edit Property modal
2. Scroll to the "Referrals" section
3. Click on the referral selector
4. Choose between "Employee" or "Custom" referral type
5. For employees: Select from the dropdown
6. For custom: Enter the referral name
7. Set the referral date
8. Click "Add Referral"
9. Repeat for multiple referrals

### Referral Management
- **Edit Dates**: Click on any date field to modify
- **Remove Referrals**: Click the X button next to any referral
- **View Referrals**: In the View Property modal, referrals are displayed with their type and date

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ReferralSelector.tsx    # Main referral component
│   └── types/
│       └── property.ts             # Updated with Referral interface

backend/
├── database/
│   └── referrals.sql               # Database schema
├── models/
│   └── propertyModel.js            # Updated to handle referrals
├── controllers/
│   └── propertyController.js       # Updated to accept referrals
├── setup-referrals-db.js           # Database setup script
└── test-referrals.js               # Testing script
```

## Setup Instructions

### 1. Database Setup
```bash
cd backend
node setup-referrals-db.js
```

### 2. Test the Implementation
```bash
cd backend
node test-referrals.js
```

### 3. Frontend Integration
The ReferralSelector component is automatically integrated into:
- Add Property modal
- Edit Property modal
- View Property modal

## Data Flow

1. **User Input**: User selects referral type, name, and date
2. **Frontend Validation**: Ensures all required fields are filled
3. **API Request**: Sends property data including referrals array
4. **Backend Processing**: 
   - Creates property record
   - Creates referral records in transaction
   - Updates referrals count
5. **Response**: Returns created property with referral information
6. **Frontend Update**: Displays updated property with referrals

## Validation Rules

- **Referral Name**: Required, non-empty string
- **Referral Type**: Must be either "employee" or "custom"
- **Employee ID**: Required when type is "employee", must reference existing user
- **Date**: Required, must be valid date format
- **Multiple Referrals**: Property can have multiple referrals

## Error Handling

- **Database Errors**: Proper transaction rollback on failure
- **Validation Errors**: Clear error messages for missing/invalid data
- **Network Errors**: Graceful fallback and user notification
- **Permission Errors**: Role-based access control for referral management

## Future Enhancements

- **Referral Analytics**: Track referral performance and success rates
- **Referral Rewards**: System for rewarding successful referrals
- **Bulk Import**: Import referrals from external sources
- **Referral History**: Track changes to referral information over time
- **Integration**: Connect with external CRM systems for referral tracking

## Testing

The system includes comprehensive testing:
- Database schema validation
- API endpoint testing
- Frontend component testing
- Integration testing between frontend and backend

## Performance Considerations

- **Indexing**: Proper database indexes for referral queries
- **Lazy Loading**: Referrals are loaded only when needed
- **Caching**: Referral data can be cached for frequently accessed properties
- **Pagination**: Support for large numbers of referrals per property

## Security

- **Input Validation**: All referral data is validated before processing
- **SQL Injection Protection**: Parameterized queries prevent injection attacks
- **Access Control**: Role-based permissions for referral management
- **Data Integrity**: Foreign key constraints ensure data consistency


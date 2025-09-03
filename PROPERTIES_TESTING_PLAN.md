# Properties Page Comprehensive Testing Plan

## 🎯 Testing Objectives
Test all features of the properties page including CRUD operations, filtering, referrals, and UI components.

## 📋 Test Categories

### 1. **CRUD Operations Testing**
#### ✅ Add Property
- [ ] Open Add Property Modal
- [ ] Fill all required fields (status_id, location, category_id, owner_name, price)
- [ ] Test with optional fields
- [ ] Test with referrals (employee and custom)
- [ ] Test date selection in referrals
- [ ] Submit and verify success
- [ ] Check if property appears in list
- [ ] Verify referrals are saved correctly

#### ✅ Edit Property
- [ ] Open Edit Property Modal
- [ ] Verify all fields are populated correctly
- [ ] Modify various fields
- [ ] Test editing referrals (add/remove/modify)
- [ ] Test date modification in referrals
- [ ] Submit and verify success
- [ ] Check if changes are reflected in list

#### ✅ View Property
- [ ] Open View Property Modal
- [ ] Verify all property details are displayed
- [ ] Check if referrals are shown correctly
- [ ] Test image gallery navigation
- [ ] Verify referral dates are formatted correctly

#### ✅ Delete Property
- [ ] Open Delete Property Modal
- [ ] Test delete confirmation
- [ ] Verify property is removed from list
- [ ] Check if referrals are also deleted

### 2. **Filtering & Search Testing**
#### ✅ Basic Filters
- [ ] Test Status filter (All, specific statuses)
- [ ] Test Category filter (All, specific categories)
- [ ] Test Agent filter
- [ ] Test View Type filter
- [ ] Test Price range filters (min/max)
- [ ] Test Surface area filters (min/max)
- [ ] Test Built Year filters (min/max)

#### ✅ Search Functionality
- [ ] Test search by reference number
- [ ] Test search by location
- [ ] Test search by owner name
- [ ] Test search with special characters
- [ ] Test search with numbers

#### ✅ Filter Combinations
- [ ] Test multiple filters applied simultaneously
- [ ] Test clearing individual filters
- [ ] Test clearing all filters
- [ ] Test filter persistence across page reloads

### 3. **Referral System Testing**
#### ✅ Referral Selection
- [ ] Test employee referral selection
- [ ] Test custom referral name input
- [ ] Test date picker functionality
- [ ] Test adding multiple referrals
- [ ] Test removing referrals
- [ ] Test editing referral dates

#### ✅ Referral Data Flow
- [ ] Verify referral data is captured in frontend
- [ ] Verify referral data is sent to backend
- [ ] Verify referral data is saved in database
- [ ] Verify referral data is retrieved correctly
- [ ] Test referral date format consistency

### 4. **UI/UX Testing**
#### ✅ View Modes
- [ ] Test Grid view display
- [ ] Test Table view display
- [ ] Test switching between views
- [ ] Test responsive design

#### ✅ Pagination
- [ ] Test page navigation
- [ ] Test items per page selection
- [ ] Test pagination with filters

#### ✅ Export Functionality
- [ ] Test CSV export
- [ ] Test PDF export
- [ ] Test export with filters applied

### 5. **Data Validation Testing**
#### ✅ Required Fields
- [ ] Test submission without required fields
- [ ] Verify proper error messages
- [ ] Test field validation (numeric, date, etc.)

#### ✅ Data Types
- [ ] Test numeric field validation
- [ ] Test date field validation
- [ ] Test string field validation

### 6. **Error Handling Testing**
#### ✅ Network Errors
- [ ] Test backend connection failure
- [ ] Test authentication failure
- [ ] Test permission errors

#### ✅ Data Errors
- [ ] Test invalid data submission
- [ ] Test malformed referral data
- [ ] Test database constraint violations

## 🧪 Testing Steps

### Phase 1: Basic Functionality
1. Start both frontend and backend servers
2. Navigate to properties page
3. Test basic CRUD operations
4. Verify data persistence

### Phase 2: Advanced Features
1. Test filtering and search
2. Test referral system
3. Test export functionality
4. Test pagination

### Phase 3: Edge Cases
1. Test with large datasets
2. Test error conditions
3. Test concurrent operations
4. Test data validation

### Phase 4: Integration Testing
1. Test frontend-backend communication
2. Test database operations
3. Test referral system end-to-end
4. Test image handling

## 📊 Expected Results
- All CRUD operations work correctly
- Filtering and search return accurate results
- Referral system captures and stores dates correctly
- UI is responsive and user-friendly
- Error handling is graceful and informative
- Data consistency is maintained across operations

## 🐛 Known Issues to Monitor
- Referral date not being received by backend
- Referrals not showing in view modal
- Form validation edge cases
- Image handling performance

## 🔧 Testing Tools
- Browser Developer Tools (Console, Network, Elements)
- Backend terminal logs
- Database queries for verification
- Manual UI interaction testing


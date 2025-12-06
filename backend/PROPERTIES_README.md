# Properties Database System

This document describes the properties database system for the Finders CRM application.

## Database Tables

### 1. Categories Table (`categories`)
Stores all property categories with their codes and descriptions.

**Structure:**
- `id`: Primary key
- `name`: Category name (e.g., "Apartment", "Villa", "Office")
- `code`: Short code (e.g., "A", "V", "O")
- `description`: Category description
- `is_active`: Whether the category is active
- `created_at`, `updated_at`: Timestamps

**Default Categories:**
- Apartment (A)
- Chalet (C)
- Duplex (D)
- Factory (F)
- Land (L)
- Office (O)
- Cloud Kitchen (CK)
- Polyclinic (PC)
- Project (P)
- Pub (PB)
- Restaurant (R)
- Rooftop (RT)
- Shop (S)
- Showroom (SR)
- Studio (ST)
- Villa (V)
- Warehouse (W)
- Industrial Building (IB)
- Pharmacy (PH)
- Bank (B)
- Hangar (H)
- Industrial Warehouse (IW)

### 2. Statuses Table (`statuses`)
Stores all property statuses with colors for UI display.

**Structure:**
- `id`: Primary key
- `name`: Status name (e.g., "Active", "Sold", "Rented")
- `code`: Status code (e.g., "active", "sold", "rented")
- `description`: Status description
- `color`: Hex color for UI display
- `is_active`: Whether the status is active
- `created_at`, `updated_at`: Timestamps

**Default Statuses:**
- Active (#10B981) - Property is available for sale/rent
- Inactive (#6B7280) - Property is temporarily unavailable
- Sold (#EF4444) - Property has been sold
- Rented (#8B5CF6) - Property has been rented
- Under Contract (#F59E0B) - Property is under contract
- Pending (#3B82F6) - Property is pending approval
- Reserved (#EC4899) - Property is reserved for a client

### 3. Properties Table (`properties`)
Main table storing all property information.

**Structure:**
- `id`: Primary key
- `reference_number`: Unique reference number (auto-generated)
- `status_id`: Foreign key to statuses table
- `location`: Property location
- `category_id`: Foreign key to categories table
- `building_name`: Optional building name
- `owner_name`: Property owner's name
- `phone_number`: Owner's phone number
- `surface`: Property surface area
- `details`: JSONB field for Floor, Balcony, Parking, Cave
- `interior_details`: Interior description
- `built_year`: Year the property was built
- `view_type`: View type (open view, sea view, mountain view, no view)
- `concierge`: Whether concierge service is available
- `agent_id`: Foreign key to users table (assigned agent)
- `price`: Property price
- `notes`: Additional notes
- `referral_source`: Referral source information
- `referral_dates`: Array of referral dates
- `created_at`, `updated_at`: Timestamps

## Reference Number Generation

Properties automatically generate unique reference numbers using the format:
`F + PropertyType + Category + Year + SequentialID`

**Format Breakdown:**
- `F` - Finders (always)
- PropertyType - `S` for Sale, `R` for Rent
- Category - Category code (e.g., `S` for Shop, `A` for Apartment)
- Year - Last 2 digits of current year (e.g., `25` for 2025)
- SequentialID - 3-digit sequential number starting at 001 for each year

**Examples:**
- `FRS25001` - Finders Rent Shop 2025 #001 (first property of this type/category/year)
- `FRS25002` - Finders Rent Shop 2025 #002 (second property)
- `FSA25001` - Finders Sale Apartment 2025 #001
- `FVA25001` - Finders Rent Villa 2025 #001

**Note:** The sequential ID resets to 001 each year for each property type + category combination.

## Database Functions

### 1. `generate_reference_number(category_code, type)`
Generates unique reference numbers for properties.

### 2. `get_properties_with_details()`
Returns properties with joined data from categories, statuses, and users tables.

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/with-count` - Get categories with property count
- `GET /api/categories/search` - Search categories
- `GET /api/categories/:id` - Get category by ID
- `GET /api/categories/code/:code` - Get category by code
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Statuses
- `GET /api/statuses` - Get all statuses
- `GET /api/statuses/with-count` - Get statuses with property count
- `GET /api/statuses/stats` - Get status statistics
- `GET /api/statuses/search` - Search statuses
- `GET /api/statuses/:id` - Get status by ID
- `GET /api/statuses/code/:code` - Get status by code
- `POST /api/statuses` - Create new status
- `PUT /api/statuses/:id` - Update status
- `DELETE /api/statuses/:id` - Delete status

### Properties
- `GET /api/properties` - Get all properties (filtered by role)
- `GET /api/properties/filtered` - Get properties with filters
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `GET /api/properties/stats/overview` - Get property statistics
- `GET /api/properties/agent/:agentId` - Get properties by agent

## Setup Instructions

1. **Run the setup script:**
   ```bash
   npm run setup-properties
   ```

2. **Verify the setup:**
   The script will create all tables and test the functions.

3. **Check the database:**
   Verify that all tables exist and contain the expected data.

## Usage Examples

### Creating a Property
```javascript
const propertyData = {
  status_id: 1, // Active status
  location: "Beirut, Lebanon",
  category_id: 1, // Apartment
  building_name: "Marina Towers",
  owner_name: "John Doe",
  phone_number: "+961 70 123 456",
  surface: 150.5,
  details: {
    floor: 5,
    balcony: true,
    parking: 1,
    cave: false
  },
  interior_details: "Fully furnished with modern appliances",
  built_year: 2020,
  view_type: "sea view",
  concierge: true,
  agent_id: 1,
  price: 250000,
  notes: "Beautiful sea view apartment",
  referral_source: "External referral",
  referral_dates: ["2025-01-15"]
};

const newProperty = await Property.createProperty(propertyData);
```

### Filtering Properties
```javascript
const filters = {
  status_id: 1, // Active properties only
  category_id: 1, // Apartments only
  price_min: 100000,
  price_max: 500000,
  view_type: "sea view",
  search: "Beirut"
};

const properties = await Property.getPropertiesWithFilters(filters);
```

## Analytics Features

The system provides comprehensive analytics:

1. **Property Overview**: Total count, active, inactive, sold, rented, under contract
2. **By Location**: Property distribution by location
3. **By Category**: Property distribution by category
4. **By Status**: Property distribution by status
5. **By View**: Property distribution by view type
6. **By Price Range**: Property distribution by price ranges

## Security & Permissions

- **Admin & Operations Manager**: Full access to all properties and management functions
- **Operations**: Can view and manage all properties
- **Agent Manager**: Can view and manage properties, assign to agents
- **Agent**: Can only view properties assigned to them

## Database Indexes

The system includes optimized indexes for:
- Reference numbers
- Status and category relationships
- Agent assignments
- Location searches (full-text search)
- Price ranges
- Creation dates

## Notes

- All deletions are soft deletes (setting `is_active` to false)
- Reference numbers are automatically generated and guaranteed unique
- The system supports multiple referral dates per property
- Details are stored as JSONB for flexible property attributes
- Full-text search is available on location fields

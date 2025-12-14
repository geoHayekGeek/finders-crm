# Data Reseeding Script

This script deletes all existing properties, leads, viewings, and referrals, then creates new random data and assigns them to all current agents and team leaders.

## Prerequisites

1. Ensure your database is set up and running
2. Make sure you have:
   - At least one agent or team leader in the database
   - At least one operations user (role: 'operations' or 'operations_manager')
   - Statuses and categories configured in the database
   - Reference sources configured

## Usage

### Option 1: Run directly with Node

```bash
node scripts/reseedData.js
```

### Option 2: Add to package.json (recommended)

Add this script to your `package.json`:

```json
{
  "scripts": {
    "reseed-data": "node scripts/reseedData.js"
  }
}
```

Then run:

```bash
npm run reseed-data
```

## What the Script Does

1. **Deletes all existing data** (in order):
   - Viewing updates
   - Viewings
   - Referrals (property referrals)
   - Properties
   - Lead referrals
   - Leads
   - Resets all sequences

2. **Fetches reference data**:
   - Statuses (for properties)
   - Categories (for properties)
   - Reference sources (for leads)
   - Operations users (required for leads)

3. **Fetches agents and team leaders**:
   - Gets all users with role 'agent'
   - Gets all users with role 'team_leader'
   - Combines them for random assignment

4. **Creates random data**:
   - **Properties**: 50-100 random properties
     - Random locations, categories, statuses
     - Random agents/team leaders assigned
     - 30% chance of having referrals
   - **Leads**: 80-150 random leads
     - Random agents/team leaders assigned
     - Random operations users assigned
     - Random reference sources (30% chance)
   - **Viewings**: 30-60 random viewings
     - Links random properties to random leads
     - Random agents/team leaders assigned
     - Random dates and times

## Data Characteristics

### Properties
- Random locations from predefined list
- Random property types (sale/rent)
- Random categories from database
- Random statuses from database
- Random prices ($50,000 - $5,000,000)
- Random surface areas (50-500 sqm)
- Random view types
- 30% chance of having referrals

### Leads
- Random customer names
- Random phone numbers (Lebanese format)
- Random agents/team leaders assigned
- Required operations user assigned
- Random statuses (Active, Contacted, Qualified, Converted, Closed)
- 30% chance of having reference source

### Viewings
- Links random properties to random leads
- Random agents/team leaders assigned
- Random dates (2023-2024)
- Random times (9 AM - 6 PM, 15-minute intervals)
- Random statuses (Scheduled, Completed, Cancelled, No Show, Rescheduled)
- 40% chance of being marked as "serious"

## Important Notes

⚠️ **WARNING**: This script will DELETE ALL existing data for:
- Properties
- Leads
- Viewings
- Referrals (both property and lead referrals)

Make sure to backup your database before running this script if you need to preserve any data!

## Troubleshooting

### Error: "No agents or team leaders found"
- Make sure you have at least one user with role 'agent' or 'team_leader' in the database

### Error: "No operations users found"
- Make sure you have at least one user with role 'operations' or 'operations_manager' in the database

### Error: "No statuses found"
- Run the statuses.sql migration script to create default statuses

### Error: "No categories found"
- Run the categories.sql migration script to create default categories

### Database Connection Errors
- Check your `.env` file has the correct database credentials
- Ensure the database is running and accessible

## Environment Variables

Make sure your `.env` file contains:

```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
DB_PORT=5432
```

Or for production:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```







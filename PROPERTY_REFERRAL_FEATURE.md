# Property Referral Feature Implementation

## Overview
This feature allows agents and team leaders to refer properties to other agents/team leaders. The referred agent can then confirm or reject the referral. When confirmed, the property is automatically assigned to them.

## Features Implemented

### 1. Database Schema Updates
- Added `status` column to `referrals` table (pending, confirmed, rejected)
- Added `referred_to_agent_id` to track which agent the property is being referred to
- Added `referred_by_user_id` to track who made the referral
- Created indexes for better performance

**Migration File:** `backend/database/add_property_referral_status.sql`

### 2. Backend API Endpoints

#### Refer a Property
- **POST** `/api/properties/:id/refer`
- Body: `{ "referred_to_agent_id": number }`
- Creates a pending referral for the property

#### Get Pending Referrals
- **GET** `/api/properties/referrals/pending`
- Returns all pending referrals for the current user (agent/team leader)

#### Get Pending Referrals Count
- **GET** `/api/properties/referrals/pending/count`
- Returns the count of pending referrals for the current user

#### Confirm Referral
- **PUT** `/api/properties/referrals/:id/confirm`
- Confirms the referral and assigns the property to the agent

#### Reject Referral
- **PUT** `/api/properties/referrals/:id/reject`
- Rejects the referral (status becomes 'rejected')

### 3. Frontend Components

#### ReferPropertyModal
- Modal component for referring a property to an agent/team leader
- Shows list of available agents (excluding current user)
- Located in: `frontend/src/components/ReferPropertyModal.tsx`

#### PendingReferralsBadge
- Badge component in the navbar showing count of pending referrals
- Only visible to agents and team leaders
- Located in: `frontend/src/components/PendingReferralsBadge.tsx`

#### PendingReferralsModal
- Modal component showing all pending referrals
- Allows confirming or rejecting referrals
- Shows property details and who referred it
- Located in: `frontend/src/components/PendingReferralsModal.tsx`

#### PropertyCard Updates
- Added referral button (UserPlus icon) for agents and team leaders
- Button only shows if user can refer (agent/team leader and not assigned to property)
- Located in: `frontend/src/components/PropertyCard.tsx`

#### ReferralSelector Updates
- Updated to show pending/rejected/confirmed status badges
- Shows status alongside internal/external badges
- Located in: `frontend/src/components/ReferralSelector.tsx`

## User Flow

### Referring a Property
1. Agent/Team Leader views a property card
2. Clicks the referral button (UserPlus icon)
3. Selects an agent/team leader from the dropdown
4. Clicks "Refer Property"
5. A pending referral is created
6. The referred agent receives a notification

### Confirming/Rejecting a Referral
1. Agent/Team Leader sees a badge in the navbar with pending count
2. Clicks the badge to open pending referrals modal
3. Views all pending referrals with property details
4. Clicks "Confirm" to accept (property is assigned) or "Reject" to decline
5. Notification is sent to the referrer

## Status Types

- **Pending**: Referral is awaiting confirmation
- **Confirmed**: Referral was accepted, property is assigned
- **Rejected**: Referral was declined
- **Internal**: Existing referral type (earns commission)
- **External**: Existing referral type (no commission)

## Permissions

- **Agents**: Can refer properties to other agents/team leaders (not themselves)
- **Team Leaders**: Can refer properties to other agents/team leaders (not themselves)
- **Other Roles**: Cannot refer properties (no referral button shown)

## Database Migration

To apply the database changes, run:

```sql
-- Run the migration file
\i backend/database/add_property_referral_status.sql
```

Or execute the SQL commands from `backend/database/add_property_referral_status.sql` in your PostgreSQL database.

## API Usage Examples

### Refer a Property
```javascript
POST /api/properties/123/refer
Authorization: Bearer <token>
Content-Type: application/json

{
  "referred_to_agent_id": 456
}
```

### Get Pending Referrals
```javascript
GET /api/properties/referrals/pending
Authorization: Bearer <token>
```

### Confirm Referral
```javascript
PUT /api/properties/referrals/789/confirm
Authorization: Bearer <token>
```

### Reject Referral
```javascript
PUT /api/properties/referrals/789/reject
Authorization: Bearer <token>
```

## Notes

- Agents cannot refer properties to themselves
- Only one pending referral can exist per property per agent
- When a referral is confirmed, the property is automatically assigned to the agent
- Notifications are created for both referrer and referred agent
- The referral status is shown in the ReferralSelector component alongside internal/external status


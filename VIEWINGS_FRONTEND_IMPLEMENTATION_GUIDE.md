
# Viewings Frontend Implementation Guide

## Overview
This guide provides complete instructions and code templates for implementing the remaining Viewings frontend components. All backend infrastructure is complete and ready.

## Components Status

### ✅ Completed Components
1. Types (`frontend/src/types/viewing.ts`)
2. API Integration (`frontend/src/utils/api.ts` - viewingsApi)
3. Permissions Context (updated)
4. Navigation (updated with Eye icon)
5. Property Selector (`PropertySelectorForViewings.tsx`)
6. Lead Selector (`LeadSelectorForViewings.tsx`)

### 📝 Components to Create

## 1. Viewings Table Columns Component

**File**: `frontend/src/components/ViewingsTableColumns.tsx`

**Purpose**: Define table columns for the DataTable component

**Key Features**:
- Display viewing date/time
- Show property reference and location
- Show lead name
- Display agent name
- Show status with color coding
- Action buttons (View, Edit, Delete)

**Code Pattern** (similar to `LeadsTableColumns.tsx`):
```typescript
import { ColumnDef } from '@tanstack/react-table'
import { Viewing } from '@/types/viewing'
import { Eye, Edit, Trash2 } from 'lucide-react'

export const getViewingsColumns = (canManageViewings: boolean): ColumnDef<Viewing>[] => [
  {
    accessorKey: 'viewing_date',
    header: 'Date',
    cell: ({ row }) => {
      const date = new Date(row.original.viewing_date)
      return date.toLocaleDateString()
    }
  },
  {
    accessorKey: 'viewing_time',
    header: 'Time',
  },
  {
    accessorKey: 'property_reference',
    header: 'Property',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.property_reference}</p>
        <p className="text-sm text-gray-500">{row.original.property_location}</p>
      </div>
    )
  },
  {
    accessorKey: 'lead_name',
    header: 'Lead',
  },
  {
    accessorKey: 'agent_name',
    header: 'Agent',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const statusColors = {
        'Scheduled': 'bg-blue-100 text-blue-800',
        'Completed': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-red-100 text-red-800',
        'No Show': 'bg-orange-100 text-orange-800',
        'Rescheduled': 'bg-purple-100 text-purple-800'
      }
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.original.status as keyof typeof statusColors]}`}>
          {row.original.status}
        </span>
      )
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <button onClick={() => row.original.onView?.(row.original)}>
          <Eye className="h-4 w-4" />
        </button>
        {canManageViewings && (
          <>
            <button onClick={() => row.original.onEdit?.(row.original)}>
              <Edit className="h-4 w-4" />
            </button>
            <button onClick={() => row.original.onDelete?.(row.original)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </>
        )}
      </div>
    )
  }
]
```

## 2. Viewings Filter Component

**File**: `frontend/src/components/ViewingsFilters.tsx`

**Purpose**: Provide filtering capabilities for viewings

**Key Features**:
- Status dropdown
- Agent selector
- Date range (from/to)
- Search box
- Clear filters button

**Code Pattern**:
```typescript
import { ViewingFilters } from '@/types/viewing'
import { VIEWING_STATUSES } from '@/types/viewing'
import AgentSelector from './AgentSelector'

interface ViewingsFiltersProps {
  filters: ViewingFilters
  setFilters: (filters: ViewingFilters) => void
  onClearFilters: () => void
}

export default function ViewingsFilters({ filters, setFilters, onClearFilters }: ViewingsFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <select
          value={filters.status || 'All'}
          onChange={(e) => setFilters({ ...filters, status: e.target.value === 'All' ? undefined : e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="All">All Statuses</option>
          {VIEWING_STATUSES.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Agent Filter */}
      <AgentSelector
        selectedAgentId={filters.agent_id}
        onSelect={(agentId) => setFilters({ ...filters, agent_id: agentId || undefined })}
        allowClear
      />

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search property, lead name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Clear Button */}
      <button
        onClick={onClearFilters}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
      >
        Clear Filters
      </button>
    </div>
  )
}
```

## 3. Viewings Card Component

**File**: `frontend/src/components/ViewingsCard.tsx`

**Purpose**: Display viewing information in grid view

**Key Features**:
- Property and lead information
- Date, time, and status
- Agent information
- Quick action buttons

**Code Pattern**:
```typescript
import { Viewing } from '@/types/viewing'
import { Calendar, Clock, MapPin, User, Eye, Edit, Trash2 } from 'lucide-react'
import { VIEWING_STATUSES } from '@/types/viewing'

interface ViewingsCardProps {
  viewing: Viewing
  onView: (viewing: Viewing) => void
  onEdit: (viewing: Viewing) => void
  onDelete: (viewing: Viewing) => void
  canManageViewings: boolean
}

export default function ViewingsCard({ viewing, onView, onEdit, onDelete, canManageViewings }: ViewingsCardProps) {
  const statusInfo = VIEWING_STATUSES.find(s => s.value === viewing.status)
  
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-3">
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: statusInfo?.color + '20', color: statusInfo?.color }}
        >
          {viewing.status}
        </span>
      </div>

      {/* Property Info */}
      <div className="mb-3">
        <p className="font-bold text-lg text-gray-900">{viewing.property_reference}</p>
        <div className="flex items-center text-sm text-gray-600 mt-1">
          <MapPin className="h-4 w-4 mr-1" />
          <p>{viewing.property_location}</p>
        </div>
      </div>

      {/* Lead Info */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700">Lead: {viewing.lead_name}</p>
        {viewing.lead_phone && (
          <p className="text-sm text-gray-600">{viewing.lead_phone}</p>
        )}
      </div>

      {/* Date & Time */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{new Date(viewing.viewing_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          <span>{viewing.viewing_time}</span>
        </div>
      </div>

      {/* Agent Info */}
      <div className="mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <User className="h-4 w-4 mr-2" />
          <span>{viewing.agent_name}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onView(viewing)}
          className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </button>
        {canManageViewings && (
          <>
            <button
              onClick={() => onEdit(viewing)}
              className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={() => onDelete(viewing)}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

## 4. Viewings Modals Component

**File**: `frontend/src/components/ViewingsModals.tsx`

**Purpose**: Handle all viewing modals (Add, Edit, View, Delete)

**Key Modals**:
1. **Add Viewing Modal**: Create new viewing with property & lead selection
2. **Edit Viewing Modal**: Update viewing details
3. **View Viewing Modal**: Display viewing with updates section
4. **Delete Viewing Modal**: Confirm deletion

**Key Features**:
- Property and Lead selectors (required)
- Date and time pickers (required)
- Agent selector (conditional based on role)
- Status dropdown
- Notes textarea
- Updates section in view modal (with add/delete capabilities)

**Code Structure**:
```typescript
import { useState } from 'react'
import { Viewing, CreateViewingFormData, EditViewingFormData, VIEWING_STATUSES } from '@/types/viewing'
import PropertySelectorForViewings from './PropertySelectorForViewings'
import LeadSelectorForViewings from './LeadSelectorForViewings'
import AgentSelector from './AgentSelector'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'

interface ViewingsModalsProps {
  // Add Modal
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  onSaveAdd: (data: CreateViewingFormData) => Promise<any>
  
  // Edit Modal
  showEditModal: boolean
  setShowEditModal: (show: boolean) => void
  editingViewing: Viewing | null
  editFormData: EditViewingFormData
  setEditFormData: (data: EditViewingFormData) => void
  onSaveEdit: () => Promise<void>
  
  // View Modal
  showViewModal: boolean
  setShowViewModal: (show: boolean) => void
  viewingViewing: Viewing | null
  onRefreshViewing: (viewingId: number) => Promise<Viewing | null>
  
  // Delete Modal
  showDeleteModal: boolean
  setShowDeleteModal: (show: boolean) => void
  deletingViewing: Viewing | null
  deleteConfirmation: string
  setDeleteConfirmation: (value: string) => void
  onConfirmDelete: () => Promise<void>
}

export default function ViewingsModals({ ...props }: ViewingsModalsProps) {
  const { user } = useAuth()
  const { canManageViewings } = usePermissions()
  
  // Add Modal Component
  const AddViewingModal = () => {
    const [formData, setFormData] = useState<CreateViewingFormData>({
      property_id: 0,
      lead_id: 0,
      agent_id: user?.role === 'agent' || user?.role === 'team_leader' ? user.id : undefined,
      viewing_date: '',
      viewing_time: '',
      status: 'Scheduled',
      notes: ''
    })
    
    const [errors, setErrors] = useState<Record<string, string>>({})
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Validation
      const newErrors: Record<string, string> = {}
      if (!formData.property_id) newErrors.property_id = 'Property is required'
      if (!formData.lead_id) newErrors.lead_id = 'Lead is required'
      if (!formData.viewing_date) newErrors.viewing_date = 'Date is required'
      if (!formData.viewing_time) newErrors.viewing_time = 'Time is required'
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      
      try {
        await props.onSaveAdd(formData)
        props.setShowAddModal(false)
        // Reset form
        setFormData({
          property_id: 0,
          lead_id: 0,
          agent_id: user?.role === 'agent' || user?.role === 'team_leader' ? user.id : undefined,
          viewing_date: '',
          viewing_time: '',
          status: 'Scheduled',
          notes: ''
        })
        setErrors({})
      } catch (error) {
        console.error('Error creating viewing:', error)
      }
    }
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">Add New Viewing</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property Selector */}
            <PropertySelectorForViewings
              selectedPropertyId={formData.property_id || undefined}
              onSelect={(id) => setFormData({ ...formData, property_id: id })}
              error={errors.property_id}
            />
            
            {/* Lead Selector */}
            <LeadSelectorForViewings
              selectedLeadId={formData.lead_id || undefined}
              onSelect={(id) => setFormData({ ...formData, lead_id: id })}
              error={errors.lead_id}
            />
            
            {/* Agent Selector (only for management roles) */}
            {canManageViewings && user?.role !== 'agent' && user?.role !== 'team_leader' && (
              <AgentSelector
                selectedAgentId={formData.agent_id}
                onSelect={(id) => setFormData({ ...formData, agent_id: id || undefined })}
              />
            )}
            
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.viewing_date}
                  onChange={(e) => setFormData({ ...formData, viewing_date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.viewing_date ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.viewing_date && <p className="text-sm text-red-600 mt-1">{errors.viewing_date}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.viewing_time}
                  onChange={(e) => setFormData({ ...formData, viewing_time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.viewing_time ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.viewing_time && <p className="text-sm text-red-600 mt-1">{errors.viewing_time}</p>}
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {VIEWING_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Add any additional notes..."
              />
            </div>
            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => props.setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Viewing
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
  
  return (
    <>
      {props.showAddModal && <AddViewingModal />}
      {/* Add Edit, View, and Delete modals following similar patterns */}
    </>
  )
}
```

## 5. Main Viewings Page

**File**: `frontend/src/app/dashboard/viewings/page.tsx`

**Purpose**: Main viewings page with grid/table views, filters, and statistics

**Key Features**:
- Statistics cards (total, scheduled, completed, etc.)
- Grid/Table view toggle
- Filters
- Add/Edit/View/Delete functionality
- Pagination
- Export functionality

**Page Structure**:
1. Header with "Add Viewing" button
2. Statistics cards (4 cards showing viewing metrics)
3. Filters component
4. View toggle (Grid/Table)
5. Content area (grid or table)
6. Pagination
7. Modals component

**Code Pattern** (follow `LeadsPage` structure):
- Use `viewingsApi` for all API calls
- Implement `loadViewings` function with role-based filtering
- Use `ViewingsCard` for grid view
- Use `DataTable` with `getViewingsColumns` for table view
- Implement CRUD operations with proper permission checks
- Add statistics display
- Include export functionality

## Implementation Checklist

### Step 1: Create Table Columns
- [ ] Create `ViewingsTableColumns.tsx`
- [ ] Define columns for date, time, property, lead, agent, status
- [ ] Add action buttons with permission checks
- [ ] Test with sample data

### Step 2: Create Filters Component
- [ ] Create `ViewingsFilters.tsx`
- [ ] Add status filter dropdown
- [ ] Add date range inputs
- [ ] Add agent selector
- [ ] Add search input
- [ ] Implement clear filters

### Step 3: Create Card Component
- [ ] Create `ViewingsCard.tsx`
- [ ] Display viewing information
- [ ] Add status badge with colors
- [ ] Add action buttons
- [ ] Test responsive design

### Step 4: Create Modals
- [ ] Create `ViewingsModals.tsx`
- [ ] Implement Add Modal with validation
- [ ] Implement Edit Modal
- [ ] Implement View Modal with updates section
- [ ] Implement Delete Modal
- [ ] Test all modal interactions

### Step 5: Create Main Page
- [ ] Create `/app/dashboard/viewings/page.tsx`
- [ ] Add statistics cards
- [ ] Implement view toggle
- [ ] Add filters integration
- [ ] Implement grid view
- [ ] Implement table view
- [ ] Add pagination
- [ ] Test all CRUD operations

### Step 6: Testing
- [ ] Test as agent (can only manage own viewings)
- [ ] Test as team leader (can manage team's viewings)
- [ ] Test as admin (can manage all viewings)
- [ ] Test property/lead selection
- [ ] Test date/time validation
- [ ] Test updates functionality
- [ ] Test filters and search
- [ ] Test pagination

## Tips for Implementation

1. **Follow Existing Patterns**: Use Leads and Properties pages as reference
2. **Permission Checks**: Always check `canManageViewings` before showing edit/delete
3. **Validation**: Validate property_id, lead_id, date, and time as required fields
4. **Date Formatting**: Use consistent date formatting across components
5. **Error Handling**: Display user-friendly error messages
6. **Loading States**: Show loading indicators during API calls
7. **Responsive Design**: Ensure mobile-friendly layouts

## Database Setup

Before testing, run the database setup:
```bash
cd backend
node setup-viewings-db.js
```

## API Testing

Test the backend API first:
```bash
# Get all viewings
curl http://localhost:10000/api/viewings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a viewing
curl -X POST http://localhost:10000/api/viewings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "lead_id": 1,
    "viewing_date": "2025-02-15",
    "viewing_time": "14:30",
    "status": "Scheduled"
  }'
```

## References

- **Leads Page**: `frontend/src/app/dashboard/leads/page.tsx`
- **Properties Page**: `frontend/src/app/dashboard/properties/page.tsx`
- **Modals Pattern**: `frontend/src/components/LeadsModals.tsx`
- **Card Pattern**: `frontend/src/components/LeadsCard.tsx`
- **Filters Pattern**: `frontend/src/components/LeadsFilters.tsx`

All backend is complete and ready. Follow these patterns to create consistent, working frontend components!


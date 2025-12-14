// types/viewing.ts

export interface ViewingUpdate {
  id: number
  viewing_id: number
  update_text: string
  update_date: string
  status: string // Status of the viewing process at this update
  created_by: number
  created_by_name?: string
  created_by_role?: string
  created_at: string
}

export interface Viewing {
  id: number
  property_id: number
  lead_id: number
  agent_id: number
  viewing_date: string
  viewing_time: string
  status: string
  is_serious: boolean // Flag for serious/high-priority viewings
  description?: string // Detailed description of viewing context
  notes?: string
  parent_viewing_id?: number // Reference to parent viewing if this is a sub-viewing
  created_at: string
  updated_at: string
  
  // Joined data from related tables
  property_reference?: string
  property_location?: string
  property_type?: string
  lead_name?: string
  lead_phone?: string
  agent_name?: string
  agent_role?: string
  agent_team_leader_id?: number
  
  // Updates array
  updates?: ViewingUpdate[]
  updates_count?: number
  latest_update_status?: string
  latest_update_date?: string
  
  // Sub-viewings array (for parent viewings)
  sub_viewings?: Viewing[]
  
  // Action handlers for table/card components
  onView?: (viewing: Viewing) => void
  onEdit?: (viewing: Viewing) => void
  onDelete?: (viewing: Viewing) => void
}

export interface ViewingFilters {
  status?: string
  agent_id?: number
  property_id?: number
  lead_id?: number
  date_from?: string
  date_to?: string
  search?: string
}

// Input for creating/updating follow-up viewings (replaces old ViewingUpdateInput)
// Supports both new format (viewing_date, viewing_time, notes) and old format (update_text, update_date) for backward compatibility
export interface ViewingUpdateInput {
  // New format for follow-up viewings
  viewing_date?: string
  viewing_time?: string
  notes?: string
  status?: string
  
  // Old format (deprecated, kept for backward compatibility)
  update_text?: string
  update_date?: string
}

export interface EditViewingFormData {
  property_id: number
  lead_id: number
  agent_id: number
  viewing_date: string
  viewing_time: string
  status: string
  is_serious?: boolean
  description?: string
  notes?: string
  update_title?: string
  update_description?: string
  update_date?: string
  update_status?: string
}

export interface CreateViewingFormData {
  property_id: number
  lead_id: number
  agent_id?: number  // Optional because agents/team leaders auto-assign to themselves
  viewing_date: string
  viewing_time: string
  status: string
  is_serious?: boolean
  description?: string
  notes?: string
  parent_viewing_id?: number // Reference to parent viewing if creating a sub-viewing
  initial_update_title?: string
  initial_update_description?: string
  initial_update_status?: string
}

export interface ViewingStats {
  total_viewings: number
  scheduled: number
  completed: number
  follow_up: number
  cancelled: number
  no_show: number
  rescheduled: number
}

// Viewing status options
export const VIEWING_STATUSES = [
  { value: 'Scheduled', label: 'Scheduled', color: '#3B82F6' },
  { value: 'Completed', label: 'Completed', color: '#10B981' },
  { value: 'Follow-up', label: 'Follow-up', color: '#F59E0B' },
  { value: 'Cancelled', label: 'Cancelled', color: '#EF4444' },
  { value: 'No Show', label: 'No Show', color: '#F59E0B' },
  { value: 'Rescheduled', label: 'Rescheduled', color: '#8B5CF6' }
] as const

export type ViewingStatus = typeof VIEWING_STATUSES[number]['value']

// Viewing update status options (stages in the viewing process)
export const VIEWING_UPDATE_STATUSES = [
  { value: 'Initial Contact', label: 'Initial Contact', color: '#3B82F6' },
  { value: 'Follow-up Scheduled', label: 'Follow-up Scheduled', color: '#8B5CF6' },
  { value: 'Negotiation', label: 'Negotiation', color: '#F59E0B' },
  { value: 'Documentation', label: 'Documentation', color: '#06B6D4' },
  { value: 'Near Closure', label: 'Near Closure', color: '#10B981' },
  { value: 'Closed Won', label: 'Closed Won', color: '#059669' },
  { value: 'Closed Lost', label: 'Closed Lost', color: '#EF4444' },
  { value: 'On Hold', label: 'On Hold', color: '#6B7280' }
] as const

export type ViewingUpdateStatus = typeof VIEWING_UPDATE_STATUSES[number]['value']

// API response types
export interface ViewingsResponse {
  success: boolean
  data: Viewing[]
  message?: string
  userRole?: string
  errors?: Array<{
    field: string
    message: string
    value?: any
    location?: string
  }>
}

export interface ViewingResponse {
  success: boolean
  data: Viewing
  message?: string
}

export interface ViewingStatsData {
  total: number
  byStatus: { status: string; count: number }[]
  recentActivity: {
    newViewings7Days: number
    upcomingViewings7Days: number
  }
  topAgents: { name: string; count: number }[]
  completionRate: number
}

export interface ViewingStatsApiResponse {
  success: boolean
  data: ViewingStatsData
  message?: string
}

export interface ViewingUpdatesResponse {
  success: boolean
  data: ViewingUpdate[]
  message?: string
}


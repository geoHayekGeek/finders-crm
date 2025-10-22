// types/viewing.ts

export interface ViewingUpdate {
  id: number
  viewing_id: number
  update_text: string
  update_date: string
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
  notes?: string
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
  
  // Updates array
  updates?: ViewingUpdate[]
  
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

export interface ViewingUpdateInput {
  update_text: string
  update_date?: string
}

export interface EditViewingFormData {
  property_id: number
  lead_id: number
  agent_id: number
  viewing_date: string
  viewing_time: string
  status: string
  notes?: string
  update_title?: string
  update_description?: string
  update_date?: string
}

export interface CreateViewingFormData {
  property_id: number
  lead_id: number
  agent_id?: number  // Optional because agents/team leaders auto-assign to themselves
  viewing_date: string
  viewing_time: string
  status: string
  notes?: string
  initial_update_title?: string
  initial_update_description?: string
}

export interface ViewingStats {
  total_viewings: number
  scheduled: number
  completed: number
  cancelled: number
  no_show: number
  rescheduled: number
}

// Viewing status options
export const VIEWING_STATUSES = [
  { value: 'Scheduled', label: 'Scheduled', color: '#3B82F6' },
  { value: 'Completed', label: 'Completed', color: '#10B981' },
  { value: 'Cancelled', label: 'Cancelled', color: '#EF4444' },
  { value: 'No Show', label: 'No Show', color: '#F59E0B' },
  { value: 'Rescheduled', label: 'Rescheduled', color: '#8B5CF6' }
] as const

export type ViewingStatus = typeof VIEWING_STATUSES[number]['value']

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


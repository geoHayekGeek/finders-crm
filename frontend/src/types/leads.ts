// types/leads.ts

export interface Lead {
  id: number
  date: string
  customer_name: string
  phone_number?: string
  agent_id?: number
  agent_name?: string
  assigned_agent_name?: string
  agent_role?: string
  reference_source_id?: number
  reference_source_name?: string
  operations_id?: number
  operations_name?: string
  operations_role?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
  
  // Action handlers for table/card components
  onView?: (lead: Lead) => void
  onEdit?: (lead: Lead) => void
  onDelete?: (lead: Lead) => void
}



export interface ReferenceSource {
  id: number
  source_name: string
  created_at: string
  modified_at: string
}

export interface OperationsUser {
  id: number
  name: string
  email: string
  role: string
}

export interface LeadStatusOption {
  id: number
  status_name: string
  created_at: string
  modified_at: string
}

export interface LeadFilters {
  status?: string
  agent_id?: number
  reference_source_id?: number
  date_from?: string
  date_to?: string
  search?: string
}

export interface EditLeadFormData {
  date: string
  customer_name: string
  phone_number?: string
  agent_id?: number
  agent_name?: string
  reference_source_id?: number
  operations_id?: number
  notes?: string
  status: string
}

export interface CreateLeadFormData {
  date: string
  customer_name: string
  phone_number?: string
  agent_id?: number
  agent_name?: string
  reference_source_id?: number
  operations_id?: number
  notes?: string
  status?: string
}

export interface LeadStats {
  total_leads: number
  active: number
  contacted: number
  qualified: number
  converted: number
  closed: number
}

export interface LeadStatsResponse {
  overview: LeadStats
  byDate: Array<{
    lead_date: string
    count: number
  }>
  byStatus: Array<{
    status: string
    count: number
  }>
  byAgent: Array<{
    agent_name: string
    count: number
  }>
}

// Lead status options
export const LEAD_STATUSES = [
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { value: 'qualified', label: 'Qualified', color: '#8B5CF6' },
  { value: 'converted', label: 'Converted', color: '#059669' },
  { value: 'closed', label: 'Closed', color: '#6B7280' }
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]['value']

// API response types
export interface LeadsResponse {
  success: boolean
  data: Lead[]
  message?: string
}

export interface LeadResponse {
  success: boolean
  data: Lead
  message?: string
}

export interface LeadStatsApiResponse {
  success: boolean
  data: LeadStatsResponse
  message?: string
}

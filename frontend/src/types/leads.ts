// types/leads.ts

export interface LeadReferral {
  id: number
  lead_id: number
  agent_id: number | null
  name: string
  type: 'employee' | 'custom'
  agent_name?: string
  referral_date: string
  external: boolean
  status?: 'pending' | 'confirmed' | 'rejected' // Status for lead referrals
  referred_to_agent_id?: number // Agent/team leader the lead is referred to
  referred_by_user_id?: number // User who made the referral
  created_at?: string
  updated_at?: string
}

export interface Lead {
  id: number
  date: string
  customer_name: string
  phone_number: string  // Now required
  agent_id?: number
  agent_name?: string
  assigned_agent_name?: string
  agent_role?: string
  price?: number  // New optional field
  reference_source_id: number  // Now required
  reference_source_name?: string
  operations_id: number  // Now required
  operations_name?: string
  operations_role?: string
  referrals?: LeadReferral[] // Lead referral tracking
  status: string
  status_can_be_referred?: boolean // Whether the lead's status allows referrals
  created_at: string
  updated_at: string

  // Optional notes summary if loaded with lead
  notes?: LeadNote[]
  
  // Action handlers for table/card components
  onView?: (lead: Lead) => void
  onEdit?: (lead: Lead) => void
  onDelete?: (lead: Lead) => void
  onRefer?: (lead: Lead) => void // New action handler for referrals
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

export interface LeadReferralInput {
  id?: number
  name: string
  type: 'employee' | 'custom'
  employee_id?: number
  date: string
}

export interface EditLeadFormData {
  date: string
  customer_name: string
  phone_number: string  // Now required
  agent_id?: number
  agent_name?: string
  price?: number  // New optional field
  reference_source_id?: number  // Required before submit
  operations_id?: number  // Required before submit
  status: string
  referrals?: LeadReferralInput[]  // Optional referrals field
}

export interface CreateLeadFormData {
  date: string
  customer_name: string
  phone_number: string  // Now required
  agent_id?: number
  agent_name?: string
  price?: number  // New optional field
  reference_source_id?: number  // Required before submit
  operations_id?: number  // Required before submit
  status: string
  referrals?: LeadReferralInput[]  // Optional referrals field
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

// Lead status options (matching database values)
export const LEAD_STATUSES = [
  { value: 'Active', label: 'Active', color: '#10B981' },
  { value: 'Contacted', label: 'Contacted', color: '#3B82F6' },
  { value: 'Qualified', label: 'Qualified', color: '#8B5CF6' },
  { value: 'Converted', label: 'Converted', color: '#059669' },
  { value: 'Closed', label: 'Closed', color: '#6B7280' }
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]['value']

// API response types
export interface LeadsResponse {
  success: boolean
  data: Lead[]
  message?: string
  errors?: Array<{
    field: string
    message: string
    value?: any
    location?: string
  }>
}

export interface LeadResponse {
  success: boolean
  data: Lead
  message?: string
}

export interface LeadStatsData {
  total: number
  byStatus: { status: string; count: number }[]
  pricing: {
    withPrice: number
    averagePrice: number
    totalValue: number
    minPrice: number
    maxPrice: number
  }
  topSources: { name: string; count: number }[]
  recentActivity: {
    newLeads7Days: number
  }
  topAgents: { name: string; count: number }[]
  monthlyTrends: { month: string; count: number }[]
  seriousViewingsPercentage: number
}

export interface LeadNote {
  id: number
  lead_id: number
  note_text: string
  created_by: number
  created_by_name?: string
  created_by_role: string
  created_at: string
  updated_at?: string
}

export interface LeadNotesResponse {
  success: boolean
  data: LeadNote[]
  message?: string
}

export interface LeadStatsApiResponse {
  success: boolean
  data: LeadStatsData
  message?: string
}

export interface LeadReferralsResponse {
  success: boolean
  data: LeadReferral[]
  message?: string
}

export interface AgentReferralStats {
  total_referrals: number
  internal_referrals: number
  external_referrals: number
  first_referral_date: string | null
  last_referral_date: string | null
}

export interface AgentReferralStatsResponse {
  success: boolean
  data: {
    stats: AgentReferralStats
    referrals: Array<{
      id: number
      lead_id: number
      customer_name: string
      phone_number: string
      lead_status: string
      agent_id: number
      referral_date: string
      external: boolean
      created_at: string
      updated_at: string
    }>
  }
  message?: string
}

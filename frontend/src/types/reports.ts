// frontend/src/types/reports.ts

export interface MonthlyAgentReport {
  id: number
  agent_id: number
  agent_name: string
  agent_code?: string
  agent_role?: string
  month: number
  year: number
  
  // Calculated fields
  listings_count: number
  lead_sources: { [key: string]: number } // Dynamic: {"Dubizzle": 5, "Facebook": 3, etc.}
  viewings_count: number
  
  // Manual field
  boosts: number
  
  // Sales data
  sales_count: number
  sales_amount: number
  
  // Commissions (calculated)
  agent_commission: number
  finders_commission: number
  referral_commission: number
  team_leader_commission: number
  administration_commission: number
  total_commission: number
  
  // Referrals received (properties this agent referred)
  referral_received_count: number
  referral_received_commission: number
  
  // Referrals on properties (referrals TO this agent)
  referrals_on_properties_count: number
  referrals_on_properties_commission: number
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: number
}

export interface ReportFilters {
  agent_id?: number
  month?: number
  year?: number
}

export interface CreateReportData {
  agent_id: number
  month: number
  year: number
  boosts?: number
}

export interface UpdateReportData {
  boosts?: number
}

export interface ReportFormData {
  agent_id: number | undefined
  month: number
  year: number
  boosts: number
}


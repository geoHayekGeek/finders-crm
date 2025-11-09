// frontend/src/types/reports.ts

export interface MonthlyAgentReport {
  id: number
  agent_id: number
  agent_name: string
  agent_code?: string
  agent_role?: string
  month?: number
  year?: number
  start_date: string
  end_date: string
  
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
  start_date?: string
  end_date?: string
}

export interface CreateReportData {
  agent_id: number
  start_date: string
  end_date: string
  boosts?: number
}

export interface UpdateReportData {
  boosts?: number
}

export interface ReportFormData {
  agent_id: number | undefined
  start_date: string
  end_date: string
  boosts: number
}

// DCSR (Daily Client/Sales Report) Types - Company-wide totals
export interface DCSRMonthlyReport {
  id: number
  month?: number
  year?: number
  start_date: string
  end_date: string
  
  // Description (company-wide totals)
  listings_count: number
  leads_count: number
  
  // Closures (company-wide totals)
  sales_count: number
  rent_count: number
  
  // Viewings (company-wide total)
  viewings_count: number
  
  // Metadata
  created_at: string
  updated_at: string
  created_by?: number
}

export interface DCSRReportFilters {
  start_date?: string
  end_date?: string
  date_from?: string
  date_to?: string
  month?: number
  year?: number
}

export interface CreateDCSRData {
  start_date: string
  end_date: string
}

export interface UpdateDCSRData {
  listings_count?: number
  leads_count?: number
  sales_count?: number
  rent_count?: number
  viewings_count?: number
}

export interface DCSRFormData {
  start_date: string
  end_date: string
  listings_count?: number
  leads_count?: number
  sales_count?: number
  rent_count?: number
  viewings_count?: number
}

// Operations Commission Reports Types
export interface OperationsCommissionProperty {
  id: number
  reference_number: string
  property_type: 'sale' | 'rent'
  price: number
  commission: number
  closed_date: string
}

export interface OperationsCommissionReport {
  id: number
  month?: number
  year?: number
  start_date: string
  end_date: string
  commission_percentage: number
  total_properties_count: number
  total_sales_count: number
  total_rent_count: number
  total_sales_value: number
  total_rent_value: number
  total_commission_amount: number
  properties?: OperationsCommissionProperty[]
  created_at: string
  updated_at: string
}

export interface OperationsCommissionFilters {
  start_date?: string
  end_date?: string
  date_from?: string
  date_to?: string
  month?: number
  year?: number
}

export interface CreateOperationsCommissionData {
  start_date: string
  end_date: string
}

export interface UpdateOperationsCommissionData {
  commission_percentage: number
  total_properties_count: number
  total_sales_count: number
  total_rent_count: number
  total_sales_value: number
  total_rent_value: number
  total_commission_amount: number
}


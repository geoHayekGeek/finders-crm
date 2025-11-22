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

// Sale & Rent Source Report Types
export interface SaleRentSourceRow {
  closed_date: string
  agent_name: string
  reference_number: string
  sold_rented: string
  source_name: string
  price: number
  finders_commission: number
  client_name: string
}

export interface SaleRentSourceFilters extends ReportFilters {}

// Operations Daily Report Types
export interface OperationsDailyReport {
  id: number
  operations_id: number
  operations_name: string
  report_date: string
  
  // Calculated fields (from database)
  properties_added: number
  leads_responded_to: number
  amending_previous_properties: number
  
  // Manual input fields
  preparing_contract: number
  tasks_efficiency_duty_time: number
  tasks_efficiency_uniform: number
  tasks_efficiency_after_duty: number
  leads_responded_out_of_duty_time: number
  
  created_at: string
  updated_at: string
}

export interface OperationsDailyFilters {
  operations_id?: number
  report_date?: string
  start_date?: string
  end_date?: string
}

export interface CreateOperationsDailyData {
  operations_id: number
  report_date: string
  preparing_contract?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number
  leads_responded_out_of_duty_time?: number
}

export interface UpdateOperationsDailyData {
  preparing_contract?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number
  leads_responded_out_of_duty_time?: number
  recalculate?: boolean
}


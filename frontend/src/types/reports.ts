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
  
  // Commissions (manual entry)
  agent_commission: number
  finders_commission: number
  /** @deprecated Use referrals_on_properties_commission instead */
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
  team_leader_id?: number
  start_date?: string
  end_date?: string
}

export interface AgentViewQuarterTarget {
  listings_target: number
  sales_amount_target: number
}

export interface AgentViewSummaryTargets {
  dev_target: number
  new_join_target: number
  reviews_target: number
}

export interface AgentViewMonthlyRow {
  day: number
  date: string | null
  listings: number
  olx_leads: number
  fb_leads: number
  insta_leads: number
  unknown_leads: number
  website_leads: number
  viewing: number
  dev: number
  new_join: number
  reviews: number
  sales: number
  sales_amount: number
  age_com: number
  fin_com: number
  ref_com: number
  tl_com: number
  adm_com: number
  ref_received: number
  total_commission: number
}

export interface AgentViewMonthTotals {
  listings_count: number
  leads_count: number
  viewings_count: number
  sales_count: number
  sales_amount: number
  dev_count: number
  new_join_count: number
  reviews_count: number
  agent_commission: number
  finders_commission: number
  referrals_on_properties_commission: number
  team_leader_commission: number
  administration_commission: number
  referral_received_commission: number
  total_commission: number
}

export interface AgentViewMonthSnapshot {
  sheet_name: string
  month_key: string
  month_label: string
  display_label: string
  start_date: string
  end_date: string
  rows: AgentViewMonthlyRow[]
  totals: AgentViewMonthTotals
  manual_totals: {
    dev_total: number
    new_join_total: number
    reviews_total: number
  }
}

export interface AgentViewReportSummary {
  listings_count: number
  leads_count: number
  viewings_count: number
  sales_count: number
  sales_amount: number
  dev_count: number
  new_join_count: number
  reviews_count: number
  agent_commission: number
  referral_received_commission: number
  total_commission: number
}

export interface AgentViewReportPayload {
  agent: {
    id: number
    name: string
    user_code?: string | null
    role?: string | null
  }
  start_date: string
  end_date: string
  period_months: number
  quarter_targets: AgentViewQuarterTarget[]
  summary_targets: AgentViewSummaryTargets
  months: AgentViewMonthSnapshot[]
  summary: AgentViewReportSummary
}

export interface AgentViewReport {
  id: number
  agent_id: number
  agent_name: string
  agent_code?: string | null
  agent_role?: string | null
  start_date: string
  end_date: string
  period_months: number
  listings_count: number
  leads_count: number
  viewings_count: number
  sales_count: number
  sales_amount: number
  dev_count: number
  new_join_count: number
  reviews_count: number
  agent_commission: number
  referral_received_commission: number
  total_commission: number
  report_payload: AgentViewReportPayload
  created_at: string
  updated_at: string
  created_by?: number
}

export interface AgentViewReportFilters {
  agent_id?: number
  start_date?: string
  end_date?: string
  date_from?: string
  date_to?: string
}

export interface CreateAgentViewReportData {
  agent_id: number
  start_date: string
  period_months: 3 | 6 | 9 | 12
  quarter_targets?: AgentViewQuarterTarget[]
  summary_targets?: AgentViewSummaryTargets
  month_overrides?: Array<{
    month_start?: string
    sheet_name?: string
    dev_total?: number
    new_join_total?: number
    reviews_total?: number
  }>
}

export interface CreateReportData {
  agent_id: number
  start_date: string
  end_date: string
  boosts?: number
  listings_count?: number
  lead_sources?: { [key: string]: number }
  viewings_count?: number
  sales_count?: number
  sales_amount?: number
  agent_commission?: number
  finders_commission?: number
  /** @deprecated Use referrals_on_properties_commission instead */
  referral_commission?: number
  team_leader_commission?: number
  administration_commission?: number
  total_commission?: number
  referral_received_count?: number
  referral_received_commission?: number
  referrals_on_properties_count?: number
  referrals_on_properties_commission?: number
}

export interface UpdateReportData {
  listings_count?: number
  lead_sources?: { [key: string]: number }
  viewings_count?: number
  boosts?: number
  sales_count?: number
  sales_amount?: number
  agent_commission?: number
  finders_commission?: number
  /** @deprecated Use referrals_on_properties_commission instead */
  referral_commission?: number
  team_leader_commission?: number
  administration_commission?: number
  total_commission?: number
  referral_received_count?: number
  referral_received_commission?: number
  referrals_on_properties_count?: number
  referrals_on_properties_commission?: number
}

export interface ReportFormData {
  agent_id?: number
  team_leader_id?: number
  start_date: string
  end_date: string
  boosts: number
}

export interface TeamMonthlyReport {
  id: number
  team_leader_id: number
  team_leader_name: string
  team_leader_code?: string
  team_leader_role?: string
  month?: number
  year?: number
  start_date: string
  end_date: string
  agent_count: number
  listings_count: number
  lead_sources: { [key: string]: number }
  viewings_count: number
  boosts: number
  sales_count: number
  sales_amount: number
  agent_commission: number
  finders_commission: number
  /** @deprecated Use referrals_on_properties_commission instead */
  referral_commission: number
  team_leader_commission: number
  administration_commission: number
  total_commission: number
  referral_received_count: number
  referral_received_commission: number
  referrals_on_properties_count: number
  referrals_on_properties_commission: number
  agent_reports: MonthlyAgentReport[]
  created_at: string
  updated_at: string
  created_by?: number
}

export interface TeamReportFilters {
  team_leader_id?: number
  start_date?: string
  end_date?: string
}

export interface CreateTeamReportData {
  team_leader_id: number
  start_date: string
  end_date: string
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

export interface DCSROperationsBreakdownRow {
  id: number
  name: string
  user_code: string | null
  role: string
  leads_count: number
}

export interface DCSRPreviewData {
  start_date: string
  end_date: string
  month: number
  year: number
  listings_count: number
  leads_count: number
  sales_count: number
  rent_count: number
  viewings_count: number
  operations_breakdown: DCSROperationsBreakdownRow[]
  operations_total_leads: number
  operations_total_users: number
}

export interface DCSRAgentBreakdownRow {
  id: number
  name: string
  user_code: string | null
  role: string
  listings_count: number
  leads_count: number
  sales_count: number
  rent_count: number
  viewings_count: number
}

export interface DCSRTeamMember {
  id: number
  name: string
  user_code: string | null
  role: string
}

export interface DCSRTeamBreakdown {
  team_leader_id: number
  team_leader_name: string
  team_leader_code: string | null
  team_members: DCSRTeamMember[]
  agent_breakdown: DCSRAgentBreakdownRow[]
  listings_count: number
  leads_count: number
  sales_count: number
  rent_count: number
  viewings_count: number
}

export interface DCSRAllTeamsBreakdown {
  teams: DCSRTeamBreakdown[]
  unassigned_listings: number
  total_teams: number
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
  agent_name?: string | null
  agent_code?: string | null
  property_type: 'sale' | 'rent'
  price: number
  commission: number
  closed_date: string
  notes?: string | null
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
  commission_percentage: number
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
  property_id?: number
  closed_date: string
  team_leader_id?: number | null
  team_leader_name?: string
  team_leader_code?: string | null
  team_leader_role?: string | null
  agent_id?: number | null
  agent_name: string
  agent_code?: string | null
  agent_role?: string | null
  reference_number: string
  sold_rented: string
  source_name: string
  owner_name?: string
  phone_number?: string
  price: number
  finders_commission: number
  notes?: string
  client_name?: string
}

export interface SaleRentSourceFilters extends ReportFilters {
  source?: string
  sold_rented?: string
}

export interface SaleRentSourceExportPayload {
  start_date: string
  end_date: string
  agent_id?: number
  rows: SaleRentSourceRow[]
}

// Operations Daily Report Types
export interface OperationsDailyWorkbookFields {
  properties_added?: number
  preparing_daily_report?: number
  phone_calls_duty_time?: number
  replying_to_msg_on_sm_duty_time?: number
  cvs?: number
  amending_previous_properties?: number
  filling?: number
  preparing_contract?: number
  tasks_efficiency?: number
  phone_calls_out_of_duty_time?: number
  replying_to_msg_on_sm_out_of_duty_time?: number
  replying_to_whats_up_msg_out_of_duty_time?: number
}

export interface OperationsDailyLegacyFields {
  leads_responded_to?: number
  leads_responded_out_of_duty_time?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number
}

export interface OperationsDailyReportRowPayload extends OperationsDailyWorkbookFields, OperationsDailyLegacyFields {
  operations_id: number
  operations_name: string
  report_date: string
}

export interface OperationsDailyReport {
  id: number
  operations_id: number
  operations_name: string
  report_date: string
  
  // Workbook-style daily fields
  properties_added: number
  preparing_daily_report: number
  phone_calls_duty_time: number
  replying_to_msg_on_sm_duty_time: number
  cvs: number
  amending_previous_properties: number
  filling: number
  preparing_contract: number
  tasks_efficiency: number
  phone_calls_out_of_duty_time: number
  replying_to_msg_on_sm_out_of_duty_time: number
  replying_to_whats_up_msg_out_of_duty_time: number

  // Legacy/internal fields retained for compatibility
  leads_responded_to?: number
  leads_responded_out_of_duty_time?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number

  operations_rows?: OperationsDailyReportRowPayload[]
  
  created_at: string
  updated_at: string
}

export interface OperationsDailyPreviewData {
  operations_id: number
  operations_name: string
  report_date: string
  properties_added: number
  amending_previous_properties: number
  preparing_daily_report: number
  phone_calls_duty_time: number
  replying_to_msg_on_sm_duty_time: number
  cvs: number
  filling: number
  preparing_contract: number
  tasks_efficiency: number
  phone_calls_out_of_duty_time: number
  replying_to_msg_on_sm_out_of_duty_time: number
  replying_to_whats_up_msg_out_of_duty_time: number
  leads_responded_to?: number
  leads_responded_out_of_duty_time?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number
}

export interface OperationsDailyBulkPreviewRow extends OperationsDailyPreviewData {
  report_exists?: boolean
  existing_report_id?: number | null
}

export interface OperationsDailyBulkPreviewData {
  report_date: string
  reports: OperationsDailyBulkPreviewRow[]
}

export interface OperationsDailyBulkCreateRow extends OperationsDailyWorkbookFields, OperationsDailyLegacyFields {
  operations_id: number
  operations_name?: string
  report_date?: string
}

export interface OperationsDailyBulkCreateData {
  report_date: string
  operations_ids?: number[]
  all_operations?: boolean
  rows?: OperationsDailyBulkCreateRow[]
}

export interface OperationsDailyBulkCreateSkippedRow {
  operations_id: number
  reason: string
  operations_name?: string
  existing_report_id?: number | null
}

export interface OperationsDailyBulkCreateResult {
  report_date: string
  created: OperationsDailyReport[]
  skipped: OperationsDailyBulkCreateSkippedRow[]
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
  properties_added?: number
  amending_previous_properties?: number
  preparing_daily_report?: number
  phone_calls_duty_time?: number
  replying_to_msg_on_sm_duty_time?: number
  cvs?: number
  filling?: number
  preparing_contract?: number
  tasks_efficiency?: number
  phone_calls_out_of_duty_time?: number
  replying_to_msg_on_sm_out_of_duty_time?: number
  replying_to_whats_up_msg_out_of_duty_time?: number
  leads_responded_to?: number
  leads_responded_out_of_duty_time?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number
}

export interface UpdateOperationsDailyData {
  properties_added?: number
  amending_previous_properties?: number
  preparing_daily_report?: number
  phone_calls_duty_time?: number
  replying_to_msg_on_sm_duty_time?: number
  cvs?: number
  filling?: number
  preparing_contract?: number
  tasks_efficiency?: number
  phone_calls_out_of_duty_time?: number
  replying_to_msg_on_sm_out_of_duty_time?: number
  replying_to_whats_up_msg_out_of_duty_time?: number
  leads_responded_to?: number
  leads_responded_out_of_duty_time?: number
  tasks_efficiency_duty_time?: number
  tasks_efficiency_uniform?: number
  tasks_efficiency_after_duty?: number
  operations_rows?: OperationsDailyReportRowPayload[]
  recalculate?: boolean
}


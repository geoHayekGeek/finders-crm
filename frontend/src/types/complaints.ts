export type ComplaintTargetRoleFilter = 'agent' | 'consultant' | 'team leader'

export interface Complaint {
  id: number
  lead_id: number
  lead_name?: string | null
  lead_phone?: string | null
  target_user_id: number
  target_user_name?: string | null
  target_user_role?: string | null
  target_assigned_to?: number | null
  created_by: number
  created_by_name?: string | null
  created_by_role?: string | null
  title: string
  description: string
  created_at: string
  updated_at: string
}

export interface CreateComplaintFormData {
  lead_id: number
  target_user_id: number
  title: string
  description: string
}

export interface ComplaintFilters {
  search?: string
  targetRole?: ComplaintTargetRoleFilter
  leadId?: number
  targetUserId?: number
  limit?: number
  offset?: number
}

export interface ComplaintsResponse {
  success: boolean
  data: Complaint[]
  count: number
  message?: string
}

export interface ComplaintResponse {
  success: boolean
  data: Complaint
  message?: string
}

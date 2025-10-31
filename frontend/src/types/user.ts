// User and HR related TypeScript types

export interface UserDocument {
  id: number
  user_id: number
  document_name: string
  document_label: string
  file_path: string
  file_type: string
  file_size: number
  upload_date: string
  uploaded_by: number
  uploaded_by_name?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'operations manager' | 'operations' | 'agent manager' | 'team_leader' | 'agent' | 'accountant'
  location?: string
  phone?: string
  dob?: string
  work_location?: string
  user_code: string
  is_assigned?: boolean
  assigned_to?: number
  agent_count?: number | null
  properties_count?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Runtime fields
  documents?: UserDocument[]
  document_count?: number
  agents?: User[]
  // Action handlers (optional, added at runtime)
  onView?: (user: User) => void
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
}

export interface CreateUserFormData {
  name: string
  email: string
  password: string
  role: 'admin' | 'operations manager' | 'operations' | 'agent manager' | 'team_leader' | 'agent' | 'accountant'
  location?: string
  phone?: string
  dob?: string
  work_location?: string
}

export interface EditUserFormData {
  name: string
  email: string
  role: 'admin' | 'operations manager' | 'operations' | 'agent manager' | 'team_leader' | 'agent' | 'accountant'
  location?: string
  phone?: string
  dob?: string
  work_location?: string
  user_code?: string
  is_active: boolean
  password?: string // Optional: only if changing password
}

export interface UserFilters {
  role?: string
  work_location?: string
  search?: string
  is_assigned?: boolean
}

export interface UserStats {
  totalUsers: number
  usersByRole: {
    role: string
    count: number
  }[]
  usersByLocation: {
    work_location: string
    count: number
  }[]
  assignedAgents: number
  unassignedAgents: number
}

export interface UploadDocumentData {
  document: File
  document_label: string
  notes?: string
}

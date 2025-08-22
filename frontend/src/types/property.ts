export interface Property {
  id: number
  reference_number: string
  status_id: number
  status_name: string
  status_color: string
  location: string
  category_id: number
  category_name: string
  category_code: string
  building_name?: string
  owner_name: string
  phone_number?: string
  surface?: number
  details?: string // Changed from object to string as per backend changes
  interior_details?: string
  built_year?: number
  view_type?: 'open view' | 'sea view' | 'mountain view' | 'no view'
  concierge: boolean
  agent_id?: number
  agent_name?: string
  agent_role?: string
  price?: number
  notes?: string
  referral_source?: string
  referral_dates?: string[]
  main_image?: string // Base64 encoded main image
  image_gallery?: string[] // Array of base64 encoded gallery images
  created_at: string
  updated_at: string
  // Action handlers (optional, added at runtime)
  onView?: (property: Property) => void
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
}

export interface EditFormData {
  reference_number?: string
  status_id: number
  location: string
  category_id: number
  building_name?: string
  owner_name: string
  phone_number?: string
  surface?: number
  details?: string // Changed from object to string
  interior_details?: string
  built_year?: number
  view_type?: 'open view' | 'sea view' | 'mountain view' | 'no view'
  concierge: boolean
  agent_id?: number
  price?: number
  notes?: string
  referral_source?: string
  referral_dates?: string[]
  main_image?: string // Base64 encoded main image
  image_gallery?: string[] // Array of base64 encoded gallery images
}

export interface Category {
  id: number
  name: string
  code: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Status {
  id: number
  name: string
  code: string
  description?: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PropertyFilters {
  status_id?: number
  category_id?: number
  agent_id?: number
  price_min?: number
  price_max?: number
  view_type?: string
  search?: string
  surface_min?: number
  surface_max?: number
  built_year_min?: number
  built_year_max?: number
}

export interface Referral {
  id?: number
  name: string
  type: 'employee' | 'custom'
  employee_id?: number
  date: string
}

export interface Property {
  id: number
  reference_number: string
  status_id: number
  status_name: string
  status_color: string
  property_type: 'sale' | 'rent'
  location: string
  category_id: number
  category_name: string
  category_code: string
  building_name?: string
  owner_id?: number // Foreign key to leads table - the customer (buyer/seller)
  owner_name: string // Fetched from leads or stored directly for backward compatibility
  phone_number: string // Fetched from leads or stored directly for backward compatibility
  surface: number
  details: string | object // Can be either string or object (legacy support)
  interior_details: string
  built_year?: number
  view_type: 'open view' | 'sea view' | 'mountain view' | 'no view'
  concierge: boolean
  agent_id?: number
  agent_name?: string
  agent_role?: string
  price: number
  notes?: string
  property_url?: string // Optional property URL (e.g., listing URL from external sites)
  main_image?: string // Base64 encoded main image
  image_gallery?: string[] // Array of image URLs
  created_at: string
  updated_at: string
  referrals?: Referral[]
  // Action handlers (optional, added at runtime)
  onView?: (property: Property) => void
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
}

export interface EditFormData {
  reference_number: string
  status_id: number
  owner_id?: number
  property_type: 'sale' | 'rent'
  location: string
  category_id: number
  building_name?: string
  owner_name: string
  phone_number: string
  surface: number
  details: string | object // Can be either string or object (legacy support)
  interior_details: string
  built_year?: number
  view_type: 'open view' | 'sea view' | 'mountain view' | 'no view'
  concierge: boolean
  agent_id?: number
  price: number
  notes?: string
  property_url?: string // Optional property URL (e.g., listing URL from external sites)
  main_image?: string // Base64 encoded main image (legacy)
  main_image_file?: File // File object for upload
  main_image_preview?: string // Preview URL for display
  image_gallery?: string[] // Array of image URLs
  referrals?: Referral[]
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

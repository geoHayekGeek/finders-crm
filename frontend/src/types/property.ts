export interface Referral {
  id?: number
  name: string
  type: 'employee' | 'custom'
  employee_id?: number
  date: string
  created_at?: string // Timestamp when the referral was created
  external?: boolean // Whether the referral is external (no longer earns commission)
  status?: 'pending' | 'confirmed' | 'rejected' // Status for property referrals
  referred_to_agent_id?: number // Agent/team leader the property is referred to
  referred_by_user_id?: number // User who made the referral
}

// Structured property details
export interface PropertyDetails {
  floor_number?: string
  balcony?: string
  covered_parking?: string
  outdoor_parking?: string
  cave?: string
}

// Structured interior details
export interface InteriorDetails {
  living_rooms?: string
  bedrooms?: string
  bathrooms?: string
  maid_room?: string
}

export interface Property {
  id: number
  reference_number: string
  status_id: number
  status_name: string
  status_color: string
  status_can_be_referred?: boolean
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
  details: PropertyDetails | string | object // Structured details or legacy string/object
  interior_details: InteriorDetails | string // Structured interior details or legacy string
  payment_facilities?: boolean // Whether the property has payment facilities
  payment_facilities_specification?: string // Specification text for payment facilities
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
  closed_date?: string // Date when property was sold or rented
  sold_amount?: number // Amount the property was sold for (can differ from price)
  buyer_id?: number // Foreign key to leads table - the client (buyer) the property was sold to
  buyer_name?: string // Name of the buyer (from leads table)
  buyer_phone_number?: string // Phone number of the buyer (from leads table)
  commission?: number // Commission amount in dollars
  platform_id?: number // Foreign key to reference_sources table - platform where property was sold
  platform_name?: string // Name of the platform/reference source
  created_by?: number // User who added/created this property
  created_by_name?: string // Name of the user who created this property
  created_by_role?: string // Role of the user who created this property
  created_at: string
  updated_at: string
  referrals?: Referral[]
  // Action handlers (optional, added at runtime)
  onView?: (property: Property) => void
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
  onRefer?: (property: Property) => void
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
  details: PropertyDetails | string | object // Structured details or legacy
  interior_details: InteriorDetails | string // Structured interior details or legacy
  payment_facilities?: boolean
  payment_facilities_specification?: string
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
  closed_date?: string // Date when property was sold or rented
  sold_amount?: number // Amount the property was sold for (can differ from price)
  buyer_id?: number // Foreign key to leads table - the client (buyer) the property was sold to
  commission?: number // Commission amount in dollars
  platform_id?: number // Foreign key to reference_sources table - platform where property was sold
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
  can_be_referred?: boolean
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
  location?: string
  surface_min?: number
  surface_max?: number
  built_year_min?: number
  built_year_max?: number
  // Property Details filters
  floor_number?: string
  balcony?: string
  covered_parking?: string
  outdoor_parking?: string
  cave?: string
  // Interior Details filters
  living_rooms?: string
  bedrooms?: string
  bathrooms?: string
  maid_room?: string
  // Serious viewings filter
  has_serious_viewings?: boolean
}

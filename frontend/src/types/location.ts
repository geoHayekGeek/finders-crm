export interface CalendarLocation {
  id: number
  name: string
  description?: string | null
  is_active: boolean
  event_count?: number
  created_at: string
  updated_at: string
}

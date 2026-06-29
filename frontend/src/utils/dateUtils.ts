// Date utility functions to handle timezone issues consistently

/**
 * Format a date string to YYYY-MM-DD format for HTML date inputs
 * Handles timezone issues by using local date components
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return ''
  
  try {
    const dateObj = new Date(dateString)
    if (isNaN(dateObj.getTime())) return ''
    
    // Use local date components to avoid timezone issues
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    // Return empty string for invalid dates
    return ''
  }
}

/**
 * Format a date string for display (handles timezone issues)
 * Returns the date as it should appear to the user
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '-'
  
  try {
    const dateObj = new Date(dateString)
    if (isNaN(dateObj.getTime())) return '-'
    
    // Use local date components to avoid timezone issues
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    
    // Return in MM/DD/YYYY format (or adjust based on locale preferences)
    return `${month}/${day}/${year}`
  } catch (error) {
    // Return '-' for invalid dates
    return '-'
  }
}

/**
 * Format a datetime string for display (includes time)
 */
export function formatDateTimeForDisplay(dateString: string): string {
  if (!dateString) return '-'
  
  try {
    const dateObj = new Date(dateString)
    if (isNaN(dateObj.getTime())) return '-'
    
    // Use toLocaleString but specify options to ensure consistency
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    // Return '-' for invalid dates
    return '-'
  }
}

/**
 * Build an ISO timestamp from local date and time input values.
 * This preserves the browser's local timezone when sending data to the API.
 */
export function buildDateTimeForApi(dateString: string, timeString: string): string {
  if (!dateString || !timeString) return ''

  try {
    const normalizedTime = timeString.length === 5 ? `${timeString}:00` : timeString
    const dateTime = new Date(`${dateString}T${normalizedTime}`)
    return Number.isNaN(dateTime.getTime()) ? '' : dateTime.toISOString()
  } catch (error) {
    return ''
  }
}

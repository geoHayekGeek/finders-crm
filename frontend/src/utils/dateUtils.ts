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
    console.warn('Error formatting date for input:', dateString, error)
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
    console.warn('Error formatting date for display:', dateString, error)
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
    console.warn('Error formatting datetime for display:', dateString, error)
    return '-'
  }
}

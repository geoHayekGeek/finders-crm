// frontend/src/utils/formatters.ts

/**
 * Format a number as currency (USD)
 * @param value - The number to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format a percentage
 * @param value - The percentage value (e.g., 0.5 for 50%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format bytes to human-readable size
 * @param bytes - The number of bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Truncate a string to a specified length
 * @param str - The string to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}


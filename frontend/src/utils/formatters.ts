// frontend/src/utils/formatters.ts

const normalizeCurrencyInput = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const parsed = Number(String(value).replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Format a number as currency (USD)
 * @param value - The number to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | null | undefined, currency: string = 'USD'): string {
  const numericValue = normalizeCurrencyInput(value)
  if (numericValue === null) {
    return '$0'
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numericValue)
  } catch {
    // Fallback to simple formatting if Intl.NumberFormat fails
    return `$${numericValue.toFixed(2)}`
  }
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateLikeValue(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const raw = String(value).trim()
  if (!raw) {
    return null
  }

  const match = raw.match(DATE_ONLY_PATTERN)
  if (match) {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const day = parseInt(match[3], 10)
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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
 * Format a date for a date input while preserving the local calendar date.
 * @param value - The date to format
 * @returns YYYY-MM-DD string
 */
export function formatDateInput(value: Date = new Date()): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date string or Date object for display without timezone drift.
 * @param value - The date to format
 * @param options - Intl formatting options (defaults to short month/day/year)
 * @returns Formatted date string
 */
export function formatDateDisplay(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const parsed = parseDateLikeValue(value)
  if (!parsed) {
    return typeof value === 'string' ? value : ''
  }

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC',
  }).format(parsed)
}

/**
 * Format a percentage
 * @param value - The percentage value (e.g., 0.5 for 50%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return '0%'
  }
  try {
    return `${(value * 100).toFixed(decimals)}%`
  } catch {
    return '0%'
  }
}

/**
 * Format bytes to human-readable size
 * @param bytes - The number of bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || !isFinite(bytes) || bytes < 0) {
    return '0 Bytes'
  }
  
  if (bytes === 0) return '0 Bytes'

  try {
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  } catch {
    return '0 Bytes'
  }
}

/**
 * Truncate a string to a specified length
 * @param str - The string to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (typeof str !== 'string') return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}


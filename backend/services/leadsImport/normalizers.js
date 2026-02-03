/**
 * Lead import normalizers: safe handling of missing values and field-specific rules.
 * Treat "", "N/A", "NULL", "null", "-" as missing.
 */

const EMPTY_VALUES = new Set(['', 'n/a', 'null', '-'].map(s => s.toLowerCase()));

/** Remove BOM, zero-width chars, and other invisible Unicode that can appear in Excel exports. */
function stripInvisible(str) {
  if (str == null || typeof str !== 'string') return '';
  return str
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  const s = stripInvisible(String(value));
  if (!s) return true;
  if (EMPTY_VALUES.has(s.toLowerCase())) return true;
  return false;
}

/**
 * Normalize date to YYYY-MM-DD. Accept Excel serial, ISO string, or DD/MM/YYYY.
 * Returns { value: string, warning?: string }.
 */
function normalizeDate(value) {
  if (isEmpty(value)) {
    const today = new Date().toISOString().split('T')[0];
    return { value: today, warning: 'Date missing; defaulted to today' };
  }
  const raw = String(value).trim();
  // Excel serial number
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 0) {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + num * 86400000);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      return { value: `${y}-${m}-${day}` };
    }
  }
  // ISO or YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (!Number.isNaN(date.getTime())) return { value: `${y}-${m}-${d}` };
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = raw.split(/[/\-.]/).map(p => parseInt(p, 10)).filter(n => !Number.isNaN(n));
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y < 100 ? 2000 + y : y;
    const month = String(m).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return { value: `${year}-${month}-${day}` };
  }
  const today = new Date().toISOString().split('T')[0];
  return { value: today, warning: `Invalid date "${raw}"; defaulted to today` };
}

/**
 * Customer name: trim, collapse internal whitespace. Required.
 * Returns { value: string | null, error?: string }.
 */
function normalizeCustomerName(value) {
  if (isEmpty(value)) return { value: null, error: 'Customer name is required' };
  const normalized = stripInvisible(String(value));
  if (!normalized) return { value: null, error: 'Customer name is required' };
  return { value: normalized };
}

/**
 * Lebanon phone: 03/729646 => +9613729646, 76/321434 => +96176321434.
 * Remove all non-digits; if starts with 0 and length 7-8 => +961 + digits without leading 0.
 * If already starts with 961 => prefix + if missing. Otherwise 7-20 digits => +<digits> with optional warn.
 * Returns { value: string | null, warning?: string, error?: string }.
 */
function normalizePhone(value) {
  if (isEmpty(value)) return { value: null, error: 'Phone number is required' };
  let digits = String(value).replace(/\D/g, '');
  if (digits.length < 7) return { value: null, error: 'Phone number too short' };
  if (digits.length > 20) return { value: null, error: 'Phone number too long' };
  let out;
  if (digits.startsWith('0') && (digits.length === 8 || digits.length === 9)) {
    out = '+961' + digits.slice(1);
  } else if (digits.startsWith('961') && digits.length >= 10 && digits.length <= 12) {
    out = '+' + digits;
  } else if ((digits.length === 7 || digits.length === 8) && !digits.startsWith('961')) {
    out = '+961' + digits;
  } else if (digits.length >= 7 && digits.length <= 20) {
    out = '+' + digits;
    if (!digits.startsWith('961') && digits.length <= 9) {
      return { value: out, warning: 'Phone may not be Lebanon format' };
    }
  } else {
    return { value: null, error: 'Invalid phone number' };
  }
  return { value: out };
}

/**
 * Price: parse to decimal. Accept numbers or strings with commas.
 * Returns { value: number | null, warning?: string }.
 */
function normalizePrice(value) {
  if (isEmpty(value)) return { value: null, warning: 'Price missing' };
  const cleaned = String(value).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || num < 0) return { value: null, warning: `Invalid price "${value}"` };
  if (num > 999999999.99) return { value: null, warning: 'Price exceeds max' };
  return { value: Math.round(num * 100) / 100 };
}

/**
 * Name normalization for matching: lowercase, trim, collapse spaces, remove punctuation.
 */
function normalizeNameForMatching(value) {
  if (isEmpty(value)) return '';
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Get initials from full name (e.g. "Melissa Atallah" => "MA").
 */
function getInitialsFromName(name) {
  if (!name || !String(name).trim()) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

module.exports = {
  isEmpty,
  EMPTY_VALUES,
  normalizeDate,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
  normalizeNameForMatching,
  getInitialsFromName,
};

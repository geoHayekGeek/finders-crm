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
  // Slash / dash formats: support both DD/MM/YYYY and MM/DD/YYYY (e.g. 3/20/2024).
  // Disambiguation rules:
  // - if first > 12 and second <= 12 => DD/MM
  // - if second > 12 and first <= 12 => MM/DD
  // - if both <= 12 => assume DD/MM (legacy behavior)
  const parts = raw.split(/[/\-.]/).map(p => parseInt(p, 10)).filter(n => !Number.isNaN(n));
  if (parts.length === 3) {
    let a = parts[0], b = parts[1], y = parts[2];
    const year = y < 100 ? 2000 + y : y;
    let dayNum;
    let monthNum;
    if (a > 12 && b <= 12) {
      // DD/MM
      dayNum = a;
      monthNum = b;
    } else if (b > 12 && a <= 12) {
      // MM/DD
      monthNum = a;
      dayNum = b;
    } else {
      // ambiguous => DD/MM (legacy)
      dayNum = a;
      monthNum = b;
    }
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const date = new Date(year, monthNum - 1, dayNum);
      // Validate that JS didn't roll the date (e.g. 31/02)
      if (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === year &&
        date.getMonth() === monthNum - 1 &&
        date.getDate() === dayNum
      ) {
        const mm = String(monthNum).padStart(2, '0');
        const dd = String(dayNum).padStart(2, '0');
        return { value: `${year}-${mm}-${dd}` };
      }
    }
  }
  const today = new Date().toISOString().split('T')[0];
  return { value: today, warning: `Invalid date "${raw}"; defaulted to today` };
}

/**
 * Like normalizeDate, but when the value is empty or invalid use fallbackDate (previous row's date) if provided.
 * fallbackDate should be YYYY-MM-DD. Returns { value: string, warning?: string }.
 */
function normalizeDateWithFallback(value, fallbackDate) {
  const result = normalizeDate(value);
  if (result.warning && fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(String(fallbackDate).trim())) {
    return { value: String(fallbackDate).trim(), warning: 'Date missing or invalid; used previous row date' };
  }
  return result;
}

function inferYearFromReference(reference) {
  if (isEmpty(reference)) return null;
  const ref = String(reference).trim();
  // Common patterns: FSA23152, LEAD23001, etc. Grab the first 2-digit year after a letter prefix.
  const m = ref.match(/[A-Za-z]{1,10}(\d{2})/);
  if (!m) return null;
  const yy = parseInt(m[1], 10);
  if (Number.isNaN(yy)) return null;
  const year = 2000 + yy;
  if (year < 2000 || year > 2099) return null;
  return year;
}

/**
 * Like normalizeDateWithFallback, but also corrects clearly-wrong years using the reference/code year (e.g. ...23... => 2023).
 * Handles Excel "mmm-yy" mis-entry (Dec-02 vs Dec-23) and weird 1899/1900 dates.
 */
function normalizeDateWithFallbackAndReference(value, fallbackDate, reference) {
  const base = normalizeDateWithFallback(value, fallbackDate);
  const inferredYear = inferYearFromReference(reference);
  if (!inferredYear) return base;

  const s = String(base.value || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return base;

  const year = parseInt(m[1], 10);
  const month = m[2];
  const day = m[3];
  const currentMaxYear = new Date().getFullYear() + 1;

  const farFromReference = Math.abs(year - inferredYear) >= 2;
  const obviouslyWrongRange = year < 2000 || year > currentMaxYear;

  if (farFromReference || (obviouslyWrongRange && year !== inferredYear)) {
    return {
      value: `${inferredYear}-${month}-${day}`,
      warning: base.warning
        ? `${base.warning}; corrected year from ${year} to ${inferredYear} based on reference`
        : `Corrected year from ${year} to ${inferredYear} based on reference`,
    };
  }

  return base;
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
  normalizeDateWithFallback,
  normalizeDateWithFallbackAndReference,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
  normalizeNameForMatching,
  getInitialsFromName,
};

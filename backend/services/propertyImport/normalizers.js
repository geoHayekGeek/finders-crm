/**
 * Property import normalizers. Reuse leads normalizers where possible; add property-specific.
 */

const {
  isEmpty,
  stripInvisible: leadStripInvisible,
  normalizeDate,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
  normalizeNameForMatching,
  getInitialsFromName,
} = require('../leadsImport/normalizers');

function stripInvisible(str) {
  if (str == null || typeof str !== 'string') return '';
  return leadStripInvisible(str);
}

/** Surface: parse to number (sqm). Required for property. Returns { value: number | null, error?: string, warning?: string }. */
function normalizeSurface(value) {
  if (isEmpty(value)) return { value: null, error: 'Surface is required' };
  const cleaned = String(value).replace(/,/g, '').replace(/\s/g, '').trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || num < 0) return { value: null, error: `Invalid surface "${value}"` };
  if (num > 10000) return { value: 10000, warning: 'Surface exceeds 10,000; capped' };
  return { value: Math.round(num * 100) / 100 };
}

/** Yes/No -> boolean. Returns { value: boolean | null, warning?: string }. */
function normalizeYesNo(value) {
  if (isEmpty(value)) return { value: null };
  const raw = String(value).trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'oui'].includes(raw)) return { value: true };
  if (['no', 'n', 'false', '0', 'non'].includes(raw)) return { value: false };
  return { value: null, warning: `Could not parse Yes/No "${value}"` };
}

/** Built year: 1800..currentYear+1. Returns { value: number | null, warning?: string }. */
function normalizeBuiltYear(value) {
  if (isEmpty(value)) return { value: null };
  const num = parseInt(String(value).replace(/\D/g, ''), 10);
  if (Number.isNaN(num)) return { value: null, warning: `Invalid built year "${value}"` };
  const maxYear = new Date().getFullYear() + 1;
  if (num < 1800 || num > maxYear) return { value: null, warning: `Built year ${num} out of range` };
  return { value: num };
}

/** View column Yes/No -> view_type. DB: 'open view' | 'sea view' | 'mountain view' | 'no view'. */
function normalizeViewType(value) {
  if (isEmpty(value)) return { value: 'no view' };
  const raw = String(value).trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(raw)) return { value: 'open view' };
  if (['no', 'n', 'false', '0'].includes(raw)) return { value: 'no view' };
  const v = raw.replace(/\s+/g, ' ');
  if (['open view', 'sea view', 'mountain view', 'no view'].includes(v)) return { value: v };
  return { value: 'no view', warning: `Unknown view "${value}"; defaulted to no view` };
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
  // Most references are like FSA23002 (letters + 2-digit year + sequence).
  const m = ref.match(/[A-Za-z]{2,6}(\d{2})/);
  if (!m) return null;
  const yy = parseInt(m[1], 10);
  if (Number.isNaN(yy)) return null;
  const year = 2000 + yy;
  if (year < 2000 || year > 2099) return null;
  return year;
}

/**
 * Property import dates are often entered as "d-mmm" (no year shown in Excel),
 * which can accidentally preserve a wrong underlying year (e.g. 2028-10-01).
 * When the reference embeds the intended year (e.g. FSA23xxxx), correct the year
 * if the parsed date is suspiciously in the future.
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

  // Auto-correct when the normalized year is clearly wrong and far from the reference year.
  // This happens often when Excel displays "mmm-yy" and a 2-digit year was mis-entered (e.g. Dec-02 instead of Dec-23),
  // or when Excel serial/date formatting glitches produce years like 1899/1900.
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

/** Build details JSONB from raw text. */
function detailsToJsonb(raw) {
  if (!raw || !String(raw).trim()) {
    return JSON.stringify({ floor_number: '', balcony: '', covered_parking: '', outdoor_parking: '', cave: '' });
  }
  const s = String(raw).trim();
  return JSON.stringify({
    floor_number: '',
    balcony: '',
    covered_parking: '',
    outdoor_parking: '',
    cave: s,
  });
}

/** Build interior_details JSONB from raw text. */
function interiorDetailsToJsonb(raw) {
  if (!raw || !String(raw).trim()) {
    return JSON.stringify({ living_rooms: '', bedrooms: '', bathrooms: '', maid_room: '' });
  }
  const s = String(raw).trim();
  return JSON.stringify({
    living_rooms: '',
    bedrooms: '',
    bathrooms: '',
    maid_room: s,
  });
}

module.exports = {
  isEmpty,
  stripInvisible,
  normalizeDate,
  normalizeDateWithFallback,
  normalizeDateWithFallbackAndReference,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
  normalizeNameForMatching,
  getInitialsFromName,
  normalizeSurface,
  normalizeYesNo,
  normalizeBuiltYear,
  normalizeViewType,
  detailsToJsonb,
  interiorDetailsToJsonb,
};

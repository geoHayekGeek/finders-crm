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

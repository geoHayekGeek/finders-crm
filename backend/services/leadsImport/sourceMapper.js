/**
 * Map Excel "Source" values to reference_sources.source_name (with synonym mapping).
 */

const SOURCE_SYNONYMS = {
  fb: 'Facebook',
  facebook: 'Facebook',
  insta: 'Instagram',
  ig: 'Instagram',
  instagram: 'Instagram',
  dubbizle: 'Dubizzle',
  dubizzle: 'Dubizzle',
  website: 'Website',
  web: 'Website',
  olx: 'OLX',
  tiktok: 'Tiktok',
  external: 'External',
};

function mapSourceToCanonical(raw) {
  if (raw === null || raw === undefined) return null;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, '');
  return SOURCE_SYNONYMS[key] || SOURCE_SYNONYMS[key.replace(/[^a-z]/g, '')] || null;
}

/**
 * Resolve Excel source string to canonical name (for display/DB).
 * Returns canonical name or null if no mapping.
 */
function resolveSourceName(raw) {
  const canonical = mapSourceToCanonical(raw);
  if (canonical) return canonical;
  const trimmed = String(raw).trim();
  return trimmed || null;
}

module.exports = {
  SOURCE_SYNONYMS,
  mapSourceToCanonical,
  resolveSourceName,
};

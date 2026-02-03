/**
 * Map Excel "Category" to category_id. Synonym mapping + strict fuzzy match (>= 0.88).
 */

const { distance } = require('fastest-levenshtein');

const CATEGORY_SYNONYMS = {
  'apartment': 'Apartment',
  'shop': 'Shop',
  'project': 'Project',
  'office': 'Office',
  'duplex': 'Duplex',
  'studio': 'Studio',
  'commercial building': 'Office',
  'land': 'Land',
  'pharmacy': 'Pharmacy',
  'showroom': 'Showroom',
  'industrial warehouse': 'Industrial Warehouse',
  'industrial factory': 'Factory',
  'warehouse': 'Warehouse',
  'villa': 'Villa',
  'chalet': 'Chalet',
  'factory': 'Factory',
  'restaurant': 'Restaurant',
  'rooftop': 'Rooftop',
  'industrial building': 'Industrial Building',
  'bank': 'Bank',
  'hangar': 'Hangar',
  'pub': 'Pub',
  'cloud kitchen': 'Cloud Kitchen',
  'polyclinic': 'Polyclinic',
};

const THRESHOLD = 0.88;

function similarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - distance(s1, s2) / maxLen;
}

function normalizeCategoryInput(value) {
  if (!value || typeof value !== 'string') return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * @param {Array<{id: number, name: string, code: string}>} categories - from categories table
 * @param {string} value - Excel "Category"
 * @returns {{ categoryId: number | null, categoryName: string | null, error?: string, warning?: string }}
 */
function resolveCategory(categories, value) {
  if (!value || !String(value).trim()) {
    return { categoryId: null, categoryName: null, error: 'Category is required' };
  }
  const raw = normalizeCategoryInput(value);
  const canonical = CATEGORY_SYNONYMS[raw];
  if (canonical) {
    const c = categories.find(x => (x.name || '').toLowerCase() === canonical.toLowerCase());
    if (c) return { categoryId: c.id, categoryName: c.name };
  }
  for (const c of categories) {
    const name = (c.name || '').toLowerCase();
    if (name === raw) return { categoryId: c.id, categoryName: c.name };
    if (similarity(raw, name) >= THRESHOLD) return { categoryId: c.id, categoryName: c.name, warning: `Fuzzy matched "${value}" to ${c.name}` };
  }
  const other = categories.find(x => (x.name || '').toLowerCase() === 'other');
  if (other) return { categoryId: other.id, categoryName: other.name, warning: `No match for "${value}"; used Other` };
  return { categoryId: null, categoryName: null, error: `Unknown category "${value}" and no Other category` };
}

module.exports = { resolveCategory, CATEGORY_SYNONYMS, similarity };

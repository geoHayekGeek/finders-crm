/**
 * Unit tests for property import category mapper (synonyms + fuzzy match).
 */

const { resolveCategory, CATEGORY_SYNONYMS, similarity } = require('../../../services/propertyImport/categoryMapper');

describe('propertyImport categoryMapper', () => {
  const categories = [
    { id: 1, name: 'Apartment' },
    { id: 2, name: 'Office' },
    { id: 3, name: 'Shop' },
    { id: 4, name: 'Land' },
    { id: 5, name: 'Other' },
  ];

  it('uses Other when category value is empty (nothing required)', () => {
    const r = resolveCategory(categories, '');
    expect(r.categoryId).toBe(5);
    expect(r.categoryName).toBe('Other');
    expect(r.warning).toContain('missing');
  });

  it('resolves exact name match (case-insensitive)', () => {
    const r = resolveCategory(categories, 'Apartment');
    expect(r.categoryId).toBe(1);
    expect(r.categoryName).toBe('Apartment');
  });

  it('resolves synonym "commercial building" to Office', () => {
    const r = resolveCategory(categories, 'commercial building');
    expect(r.categoryId).toBe(2);
    expect(r.categoryName).toBe('Office');
  });

  it('resolves synonym "shop" to Shop', () => {
    const r = resolveCategory(categories, 'shop');
    expect(r.categoryId).toBe(3);
  });

  it('fuzzy matches with warning when above threshold', () => {
    const r = resolveCategory(categories, 'Apartement'); // typo
    expect(r.categoryId).toBe(1);
    expect(r.warning).toContain('Fuzzy matched');
  });

  it('falls back to Other when no match and Other exists', () => {
    const r = resolveCategory(categories, 'Unknown Type XYZ');
    expect(r.categoryId).toBe(5);
    expect(r.categoryName).toBe('Other');
    expect(r.warning).toContain('Other');
  });

  it('uses first category when no match and no Other category', () => {
    const noOther = categories.filter(c => c.name !== 'Other');
    const r = resolveCategory(noOther, 'Unknown Type');
    expect(r.categoryId).toBe(1);
    expect(r.categoryName).toBe('Apartment');
    expect(r.warning).toContain('first available');
  });

  describe('similarity', () => {
    it('returns 1 for identical strings', () => {
      expect(similarity('Apartment', 'Apartment')).toBe(1);
    });
    it('returns 0 for empty string', () => {
      expect(similarity('', 'x')).toBe(0);
      expect(similarity('x', '')).toBe(0);
    });
    it('returns value between 0 and 1 for typo', () => {
      const s = similarity('Apartement', 'Apartment');
      expect(s).toBeGreaterThanOrEqual(0.88);
      expect(s).toBeLessThanOrEqual(1);
    });
  });

  it('CATEGORY_SYNONYMS includes expected keys', () => {
    expect(CATEGORY_SYNONYMS['apartment']).toBe('Apartment');
    expect(CATEGORY_SYNONYMS['industrial warehouse']).toBe('Industrial Warehouse');
  });
});

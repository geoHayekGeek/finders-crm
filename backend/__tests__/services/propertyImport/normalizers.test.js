/**
 * Unit tests for property import normalizers.
 */

const {
  normalizeSurface,
  normalizeYesNo,
  normalizeBuiltYear,
  normalizeViewType,
  detailsToJsonb,
  interiorDetailsToJsonb,
  isEmpty,
} = require('../../../services/propertyImport/normalizers');

describe('propertyImport normalizers', () => {
  describe('normalizeSurface', () => {
    it('returns error when empty', () => {
      const r = normalizeSurface('');
      expect(r.value).toBeNull();
      expect(r.error).toContain('Surface');
    });
    it('parses numeric string to number', () => {
      const r = normalizeSurface('150');
      expect(r.value).toBe(150);
      expect(r.error).toBeUndefined();
    });
    it('parses string with commas', () => {
      const r = normalizeSurface('1,250.5');
      expect(r.value).toBe(1250.5);
    });
    it('returns error for invalid value', () => {
      const r = normalizeSurface('abc');
      expect(r.value).toBeNull();
      expect(r.error).toBeDefined();
    });
    it('returns error for negative', () => {
      const r = normalizeSurface('-10');
      expect(r.value).toBeNull();
      expect(r.error).toBeDefined();
    });
    it('caps surface over 10000 with warning', () => {
      const r = normalizeSurface('15000');
      expect(r.value).toBe(10000);
      expect(r.warning).toContain('capped');
    });
  });

  describe('normalizeYesNo', () => {
    it('returns null when empty', () => {
      const r = normalizeYesNo('');
      expect(r.value).toBeNull();
    });
    it('parses Yes/y/true/1/oui to true', () => {
      expect(normalizeYesNo('Yes').value).toBe(true);
      expect(normalizeYesNo('y').value).toBe(true);
      expect(normalizeYesNo('true').value).toBe(true);
      expect(normalizeYesNo('1').value).toBe(true);
      expect(normalizeYesNo('oui').value).toBe(true);
    });
    it('parses No/n/false/0/non to false', () => {
      expect(normalizeYesNo('No').value).toBe(false);
      expect(normalizeYesNo('n').value).toBe(false);
      expect(normalizeYesNo('false').value).toBe(false);
      expect(normalizeYesNo('0').value).toBe(false);
      expect(normalizeYesNo('non').value).toBe(false);
    });
    it('returns null and warning for unknown value', () => {
      const r = normalizeYesNo('maybe');
      expect(r.value).toBeNull();
      expect(r.warning).toContain('Could not parse');
    });
  });

  describe('normalizeBuiltYear', () => {
    it('returns null when empty', () => {
      const r = normalizeBuiltYear('');
      expect(r.value).toBeNull();
    });
    it('parses valid year', () => {
      const r = normalizeBuiltYear('2020');
      expect(r.value).toBe(2020);
    });
    it('parses year with non-digits stripped', () => {
      const r = normalizeBuiltYear('2,020');
      expect(r.value).toBe(2020);
    });
    it('returns null and warning for out-of-range year', () => {
      const r = normalizeBuiltYear('1700');
      expect(r.value).toBeNull();
      expect(r.warning).toContain('out of range');
    });
    it('accepts currentYear+1', () => {
      const next = new Date().getFullYear() + 1;
      const r = normalizeBuiltYear(String(next));
      expect(r.value).toBe(next);
    });
  });

  describe('normalizeViewType', () => {
    it('defaults to "no view" when empty', () => {
      const r = normalizeViewType('');
      expect(r.value).toBe('no view');
    });
    it('maps Yes to "open view"', () => {
      expect(normalizeViewType('Yes').value).toBe('open view');
      expect(normalizeViewType('y').value).toBe('open view');
    });
    it('maps No to "no view"', () => {
      expect(normalizeViewType('No').value).toBe('no view');
      expect(normalizeViewType('n').value).toBe('no view');
    });
    it('passes through literal view types', () => {
      expect(normalizeViewType('sea view').value).toBe('sea view');
      expect(normalizeViewType('mountain view').value).toBe('mountain view');
    });
    it('defaults unknown to "no view" with warning', () => {
      const r = normalizeViewType('garden');
      expect(r.value).toBe('no view');
      expect(r.warning).toContain('Unknown view');
    });
  });

  describe('detailsToJsonb', () => {
    it('returns default structure when empty', () => {
      const j = detailsToJsonb('');
      const o = JSON.parse(j);
      expect(o).toHaveProperty('floor_number', '');
      expect(o).toHaveProperty('balcony', '');
      expect(o).toHaveProperty('cave', '');
    });
    it('stores raw text in cave when provided', () => {
      const j = detailsToJsonb('Floor 2, Balcony');
      const o = JSON.parse(j);
      expect(o.cave).toBe('Floor 2, Balcony');
    });
  });

  describe('interiorDetailsToJsonb', () => {
    it('returns default structure when empty', () => {
      const j = interiorDetailsToJsonb('');
      const o = JSON.parse(j);
      expect(o).toHaveProperty('living_rooms', '');
      expect(o).toHaveProperty('bedrooms', '');
      expect(o).toHaveProperty('bathrooms', '');
      expect(o).toHaveProperty('maid_room', '');
    });
    it('stores raw text in maid_room when provided', () => {
      const j = interiorDetailsToJsonb('2BR, 2 Bath');
      const o = JSON.parse(j);
      expect(o.maid_room).toBe('2BR, 2 Bath');
    });
  });

  describe('isEmpty (re-export)', () => {
    it('treats empty string as empty', () => {
      expect(isEmpty('')).toBe(true);
    });
    it('treats non-empty as not empty', () => {
      expect(isEmpty('x')).toBe(false);
    });
  });
});

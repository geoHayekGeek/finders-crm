const {
  normalizeDate,
  normalizeCustomerName,
  normalizePhone,
  normalizePrice,
  normalizeNameForMatching,
  getInitialsFromName,
  isEmpty,
} = require('../../../services/leadsImport/normalizers');

describe('leadsImport normalizers', () => {
  describe('normalizeDate', () => {
    it('returns today for empty value with warning', () => {
      const r = normalizeDate('');
      expect(r.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.warning).toBeDefined();
    });
    it('parses YYYY-MM-DD', () => {
      const r = normalizeDate('2024-03-15');
      expect(r.value).toBe('2024-03-15');
      expect(r.warning).toBeUndefined();
    });
    it('parses Excel serial and returns YYYY-MM-DD', () => {
      const r = normalizeDate(45390); // Excel date for 2024-03-15
      expect(r.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it('parses DD/MM/YYYY', () => {
      const r = normalizeDate('15/03/2024');
      expect(r.value).toBe('2024-03-15');
    });
  });

  describe('normalizeCustomerName', () => {
    it('returns error when empty', () => {
      const r = normalizeCustomerName('');
      expect(r.value).toBeNull();
      expect(r.error).toContain('required');
    });
    it('trims and collapses whitespace', () => {
      const r = normalizeCustomerName('  John   Doe  ');
      expect(r.value).toBe('John Doe');
      expect(r.error).toBeUndefined();
    });
    it('treats N/A as missing', () => {
      const r = normalizeCustomerName('N/A');
      expect(r.value).toBeNull();
      expect(r.error).toBeDefined();
    });
  });

  describe('normalizePhone', () => {
    it('returns error when empty', () => {
      const r = normalizePhone('');
      expect(r.value).toBeNull();
      expect(r.error).toContain('required');
    });
    it('converts 03/729646 to Lebanon E.164', () => {
      const r = normalizePhone('03/729646');
      expect(r.value).toBe('+9613729646');
    });
    it('converts 76/321434 to +96176321434', () => {
      const r = normalizePhone('76/321434');
      expect(r.value).toBe('+96176321434');
    });
    it('strips non-digits and handles 961 prefix', () => {
      const r = normalizePhone('9611234567');
      expect(r.value).toBe('+9611234567');
    });
    it('rejects too short', () => {
      const r = normalizePhone('123');
      expect(r.value).toBeNull();
      expect(r.error).toBeDefined();
    });
  });

  describe('normalizePrice', () => {
    it('returns null and warning when empty', () => {
      const r = normalizePrice('');
      expect(r.value).toBeNull();
      expect(r.warning).toBeDefined();
    });
    it('parses number string', () => {
      const r = normalizePrice('1500.50');
      expect(r.value).toBe(1500.5);
    });
    it('parses string with commas', () => {
      const r = normalizePrice('1,500.25');
      expect(r.value).toBe(1500.25);
    });
  });

  describe('normalizeNameForMatching', () => {
    it('lowercases and collapses spaces', () => {
      expect(normalizeNameForMatching('  John   Doe  ')).toBe('john doe');
    });
    it('removes punctuation', () => {
      expect(normalizeNameForMatching("O'Brien")).not.toContain("'");
    });
  });

  describe('getInitialsFromName', () => {
    it('returns first two letters for single name', () => {
      expect(getInitialsFromName('MA')).toBe('MA');
    });
    it('returns first + last initial for full name', () => {
      expect(getInitialsFromName('Melissa Atallah')).toBe('MA');
    });
    it('handles multiple words', () => {
      expect(getInitialsFromName('Elsy Wehbe')).toBe('EW');
    });
  });

  describe('isEmpty', () => {
    it('treats "", "N/A", "null", "-" as empty', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('N/A')).toBe(true);
      expect(isEmpty('null')).toBe(true);
      expect(isEmpty('-')).toBe(true);
    });
    it('treats non-empty as not empty', () => {
      expect(isEmpty('John')).toBe(false);
    });
  });
});

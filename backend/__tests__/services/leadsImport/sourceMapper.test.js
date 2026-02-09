const { mapSourceToCanonical, resolveSourceName, SOURCE_SYNONYMS } = require('../../../services/leadsImport/sourceMapper');

describe('leadsImport sourceMapper', () => {
  describe('mapSourceToCanonical', () => {
    it('maps FB to Facebook', () => {
      expect(mapSourceToCanonical('FB')).toBe('Facebook');
      expect(mapSourceToCanonical('fb')).toBe('Facebook');
    });
    it('maps INSTA, IG, INSTAGRAM to Instagram', () => {
      expect(mapSourceToCanonical('INSTA')).toBe('Instagram');
      expect(mapSourceToCanonical('IG')).toBe('Instagram');
      expect(mapSourceToCanonical('Instagram')).toBe('Instagram');
    });
    it('maps Dubbizle variants to Dubizzle', () => {
      expect(mapSourceToCanonical('Dubbizle')).toBe('Dubizzle');
      expect(mapSourceToCanonical('DUBBIZLE')).toBe('Dubizzle');
    });
    it('maps WEBSITE, WEB to Website', () => {
      expect(mapSourceToCanonical('WEBSITE')).toBe('Website');
      expect(mapSourceToCanonical('WEB')).toBe('Website');
    });
    it('maps OLX to OLX', () => {
      expect(mapSourceToCanonical('OLX')).toBe('OLX');
    });
    it('returns null for unknown', () => {
      expect(mapSourceToCanonical('Unknown')).toBeNull();
    });
  });

  describe('resolveSourceName', () => {
    it('returns canonical name when mapping exists', () => {
      expect(resolveSourceName('FB')).toBe('Facebook');
    });
    it('returns trimmed raw when no mapping', () => {
      expect(resolveSourceName('  Custom Source  ')).toBe('Custom Source');
    });
    it('returns null for empty', () => {
      expect(resolveSourceName('')).toBeNull();
    });
  });
});

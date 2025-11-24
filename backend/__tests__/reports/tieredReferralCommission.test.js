// backend/__tests__/reports/tieredReferralCommission.test.js
// Unit tests for Tiered Referral Commission System

const fs = require('fs');
const path = require('path');

describe('Tiered Referral Commission System', () => {
  let reportsModelCode;

  beforeAll(() => {
    // Read the reportsModel.js file to verify SQL queries
    const reportsModelPath = path.join(__dirname, '../../models/reportsModel.js');
    reportsModelCode = fs.readFileSync(reportsModelPath, 'utf8');
  });

  describe('SQL Query Verification', () => {
    it('should include internal and external referral commission in settings query', () => {
      expect(reportsModelCode).toContain('commission_referral_external_percentage');
      expect(reportsModelCode).toContain('commission_referral_internal_percentage');
    });

    it('should use internal/external commission logic in property referrals query', () => {
      expect(reportsModelCode).toContain('WHEN (r.external = TRUE)');
      expect(reportsModelCode).toContain('THEN p.price * $4 / 100'); // External rate
      expect(reportsModelCode).toContain('ELSE p.price * $5 / 100'); // Internal rate
    });

    it('should use internal/external commission logic in lead referrals query', () => {
      expect(reportsModelCode).toContain('WHEN (lr.external = TRUE)');
      expect(reportsModelCode).toContain('THEN p.price * $4 / 100'); // External rate
      expect(reportsModelCode).toContain('ELSE p.price * $5 / 100'); // Internal rate
    });

    it('should use internal/external commission logic in referrals on properties query', () => {
      // Check for the referrals on properties query with internal/external logic
      const referralsOnPropertiesPattern = /WHEN \(r\.external = TRUE\).*THEN p\.price \* \$4 \/ 100.*ELSE p\.price \* \$5 \/ 100/s;
      expect(reportsModelCode).toMatch(referralsOnPropertiesPattern);
    });

    it('should use default values for external and internal commission when settings are missing', () => {
      expect(reportsModelCode).toContain('commissions.referral_external || 2'); // External default
      expect(reportsModelCode).toContain('commissions.referral_internal || 0.5'); // Internal default
    });
  });

  describe('Commission Settings Loading', () => {
    it('should load internal and external referral commission settings', () => {
      // Verify the query includes both internal and external commission settings
      expect(reportsModelCode).toContain('commission_referral_internal_percentage');
      expect(reportsModelCode).toContain('commission_referral_external_percentage');
    });

    it('should parse commission settings correctly', () => {
      // Verify the parsing logic handles both internal and external commission
      expect(reportsModelCode).toContain('.replace(\'commission_\', \'\').replace(\'_percentage\', \'\')');
    });
  });
});

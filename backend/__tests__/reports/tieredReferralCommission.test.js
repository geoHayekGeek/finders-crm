// backend/__tests__/reports/tieredReferralCommission.test.js
// Verifies referral commission logic no longer depends on settings-based percentages

const fs = require('fs');
const path = require('path');

describe('Referral Commission Reporting', () => {
  let reportsModelCode;

  beforeAll(() => {
    const reportsModelPath = path.join(__dirname, '../../models/reportsModel.js');
    reportsModelCode = fs.readFileSync(reportsModelPath, 'utf8');
  });

  it('should not read commission percentages from system settings anymore', () => {
    expect(reportsModelCode).not.toContain('commission_referral_internal_percentage');
    expect(reportsModelCode).not.toContain('commission_referral_external_percentage');
    expect(reportsModelCode).not.toContain('commission_agent_percentage');
    expect(reportsModelCode).not.toContain('commission_finders_percentage');
  });

  it('should keep the manual commission fields in the monthly report model', () => {
    expect(reportsModelCode).toContain('agent_commission');
    expect(reportsModelCode).toContain('finders_commission');
    expect(reportsModelCode).toContain('referrals_on_properties_commission');
    expect(reportsModelCode).toContain('total_commission');
  });

  it('should still calculate referral counts for reporting', () => {
    expect(reportsModelCode).toContain('referral_received_count');
    expect(reportsModelCode).toContain('referrals_on_properties_count');
  });
});

-- Add property closing referral commission fields
-- Mirrors the runtime closing flow so Railway can apply the same schema change through Prisma.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latest_property_referral_commission DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS latest_lead_referral_commission DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS external_referral_commissions JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS external_referral_commission DECIMAL(15,2);

COMMENT ON COLUMN properties.latest_property_referral_commission IS 'Latest property referral commission amount for the property closing';
COMMENT ON COLUMN properties.latest_lead_referral_commission IS 'Latest lead/property-owner referral commission amount for the property closing';
COMMENT ON COLUMN properties.external_referral_commissions IS 'Optional list of external referral commission amounts for the property closing';
COMMENT ON COLUMN properties.external_referral_commission IS 'Total external referral commission amount for the property closing';

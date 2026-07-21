-- Add closing fields to properties table
-- Keeps Prisma migration history aligned with the runtime property closing flow.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS sold_amount DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS buyer_id INTEGER REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS agent_commission DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS finders_commission DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS team_leader_commission DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS administration_commission DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS platform_id INTEGER REFERENCES reference_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_buyer_id ON properties(buyer_id);
CREATE INDEX IF NOT EXISTS idx_properties_platform_id ON properties(platform_id);
CREATE INDEX IF NOT EXISTS idx_properties_sold_amount ON properties(sold_amount);

COMMENT ON COLUMN properties.sold_amount IS 'Amount the property was sold for (can differ from the listed price)';
COMMENT ON COLUMN properties.buyer_id IS 'Foreign key to leads table - the client (buyer) the property was sold to';
COMMENT ON COLUMN properties.agent_commission IS 'Agent commission amount for the property closing';
COMMENT ON COLUMN properties.finders_commission IS 'Finders commission amount for the property closing';
COMMENT ON COLUMN properties.team_leader_commission IS 'Team leader commission amount for the property closing';
COMMENT ON COLUMN properties.administration_commission IS 'Administration commission amount for the property closing';
COMMENT ON COLUMN properties.commission IS 'Commission amount in dollars';
COMMENT ON COLUMN properties.platform_id IS 'Platform/reference source where the property was sold (defaults to lead reference_source_id)';

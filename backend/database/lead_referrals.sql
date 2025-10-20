-- Create lead_referrals table
-- This table tracks which agents referred leads and their commission eligibility
-- Supports both employee (agent) referrals and custom (external) referrals
CREATE TABLE IF NOT EXISTS lead_referrals (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  agent_id INTEGER,  -- Nullable for custom referrals
  name VARCHAR(255) NOT NULL,  -- Agent name or custom referrer name
  type VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (type IN ('employee', 'custom')),
  referral_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_referrals_lead_id ON lead_referrals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_agent_id ON lead_referrals(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_date ON lead_referrals(referral_date);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_external ON lead_referrals(external);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_type ON lead_referrals(type);

-- Add comments to document the columns
COMMENT ON COLUMN lead_referrals.external IS 'Indicates whether the referral is external (no longer earns commission). Set to true when the lead is re-referred to another agent after 1 month from the original referral date.';
COMMENT ON COLUMN lead_referrals.referral_date IS 'Date when the agent was assigned/referred to this lead';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lead_referrals_updated_at
    BEFORE UPDATE ON lead_referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_referrals_updated_at();

-- Create a view for leads with referral information
CREATE OR REPLACE VIEW leads_with_referrals AS
SELECT 
  l.id,
  l.date,
  l.customer_name,
  l.phone_number,
  l.agent_id,
  l.agent_name,
  l.price,
  l.reference_source_id,
  l.operations_id,
  l.notes,
  l.status,
  l.created_at,
  l.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', lr.id,
        'agent_id', lr.agent_id,
        'name', lr.name,
        'type', lr.type,
        'agent_name', u.name,
        'referral_date', lr.referral_date,
        'external', lr.external
      ) ORDER BY lr.referral_date DESC
    ) FILTER (WHERE lr.id IS NOT NULL),
    '[]'::json
  ) as referrals_json
FROM leads l
LEFT JOIN lead_referrals lr ON l.id = lr.lead_id
LEFT JOIN users u ON lr.agent_id = u.id
GROUP BY l.id, l.date, l.customer_name, l.phone_number, l.agent_id, l.agent_name, 
         l.price, l.reference_source_id, l.operations_id, l.notes, l.status, l.created_at, l.updated_at;


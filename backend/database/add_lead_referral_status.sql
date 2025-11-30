-- Migration: Add lead referral status and tracking fields
-- This allows agents/team leaders to refer leads to other agents with pending/confirmed/rejected status

-- Add status column to lead_referrals table
ALTER TABLE lead_referrals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected'));

-- Add referred_to_agent_id to track which agent the lead is being referred to
ALTER TABLE lead_referrals ADD COLUMN IF NOT EXISTS referred_to_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add referred_by_user_id to track who made the referral
ALTER TABLE lead_referrals ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_referrals_status ON lead_referrals(status);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_referred_to_agent_id ON lead_referrals(referred_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_referred_by_user_id ON lead_referrals(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_pending ON lead_referrals(status) WHERE status = 'pending';

-- Add comments to columns
COMMENT ON COLUMN lead_referrals.status IS 'Referral status: pending (awaiting confirmation), confirmed (accepted), rejected (declined)';
COMMENT ON COLUMN lead_referrals.referred_to_agent_id IS 'ID of the agent/team leader this lead is being referred to';
COMMENT ON COLUMN lead_referrals.referred_by_user_id IS 'ID of the user who made this referral';




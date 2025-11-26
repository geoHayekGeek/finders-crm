-- Migration: Add property referral status and tracking fields
-- This allows agents/team leaders to refer properties to other agents with pending/confirmed/rejected status

-- Add status column to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected'));

-- Add referred_to_agent_id to track which agent the property is being referred to
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_to_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add referred_by_user_id to track who made the referral
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_to_agent_id ON referrals(referred_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by_user_id ON referrals(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending ON referrals(status) WHERE status = 'pending';

-- Add comment to columns
COMMENT ON COLUMN referrals.status IS 'Referral status: pending (awaiting confirmation), confirmed (accepted), rejected (declined)';
COMMENT ON COLUMN referrals.referred_to_agent_id IS 'ID of the agent/team leader this property is being referred to';
COMMENT ON COLUMN referrals.referred_by_user_id IS 'ID of the user who made this referral';


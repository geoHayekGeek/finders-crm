-- Migration: Add property referral status and tracking fields
-- This allows agents/team leaders to refer properties to other agents with pending/confirmed/rejected status

-- Add status column to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected'));

-- Add referred_to_agent_id to track which agent the property is being referred to
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_to_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add referred_by_user_id to track who made the referral
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add admin approval tracking
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS admin_status VARCHAR(20);
ALTER TABLE referrals ALTER COLUMN admin_status SET DEFAULT 'approved';
UPDATE referrals SET admin_status = 'approved' WHERE admin_status IS NULL;
ALTER TABLE referrals ALTER COLUMN admin_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_admin_status_check'
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_admin_status_check
      CHECK (admin_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS admin_reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_to_agent_id ON referrals(referred_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by_user_id ON referrals(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending ON referrals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_referrals_admin_status ON referrals(admin_status);
CREATE INDEX IF NOT EXISTS idx_referrals_admin_reviewed_by_user_id ON referrals(admin_reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending_admin_review ON referrals(admin_status, created_at) WHERE admin_status = 'pending';

-- Add comment to columns
COMMENT ON COLUMN referrals.status IS 'Referral status: pending (awaiting confirmation), confirmed (accepted), rejected (declined)';
COMMENT ON COLUMN referrals.referred_to_agent_id IS 'ID of the agent/team leader this property is being referred to';
COMMENT ON COLUMN referrals.referred_by_user_id IS 'ID of the user who made this referral';
COMMENT ON COLUMN referrals.admin_status IS 'Admin approval state for property referrals: pending (awaiting approval), approved (recipient can act), rejected (declined by admin)';


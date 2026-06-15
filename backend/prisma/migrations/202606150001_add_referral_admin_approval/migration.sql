-- Add admin approval workflow for property and lead referrals

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

ALTER TABLE lead_referrals ADD COLUMN IF NOT EXISTS admin_status VARCHAR(20);
ALTER TABLE lead_referrals ALTER COLUMN admin_status SET DEFAULT 'approved';
UPDATE lead_referrals SET admin_status = 'approved' WHERE admin_status IS NULL;
ALTER TABLE lead_referrals ALTER COLUMN admin_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_referrals_admin_status_check'
  ) THEN
    ALTER TABLE lead_referrals
      ADD CONSTRAINT lead_referrals_admin_status_check
      CHECK (admin_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

ALTER TABLE lead_referrals ADD COLUMN IF NOT EXISTS admin_reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lead_referrals ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_referrals_admin_status ON referrals(admin_status);
CREATE INDEX IF NOT EXISTS idx_referrals_admin_reviewed_by_user_id ON referrals(admin_reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending_admin_review ON referrals(admin_status, created_at) WHERE admin_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_lead_referrals_admin_status ON lead_referrals(admin_status);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_admin_reviewed_by_user_id ON lead_referrals(admin_reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_pending_admin_review ON lead_referrals(admin_status, referral_date) WHERE admin_status = 'pending';

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category)
VALUES (
  'referral_requires_admin_approval',
  'true',
  'boolean',
  'Require admin approval before referral details are visible to the recipient',
  'features'
)
ON CONFLICT (setting_key) DO NOTHING;

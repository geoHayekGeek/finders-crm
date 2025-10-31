-- Add 'Closed' status to property statuses
-- This status will be used for both sold and rented properties

-- First check if the status doesn't already exist and insert it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM statuses WHERE code = 'closed') THEN
    INSERT INTO statuses (name, code, description, color) VALUES
      ('Closed', 'closed', 'Property has been closed (sold or rented)', '#6B7280');
  END IF;
END $$;

-- Comment on the status
COMMENT ON COLUMN statuses.code IS 'Status codes include: active, inactive, sold, rented, under_contract, pending, reserved, closed';


-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'custom' CHECK (type IN ('employee', 'custom')),
  employee_id INTEGER NULL,
  date DATE NOT NULL,
  external BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add external column if it doesn't exist (for existing tables)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for external column
CREATE INDEX IF NOT EXISTS idx_referrals_external ON referrals(external);

-- Add referrals column to properties table if it doesn't exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_property_id ON referrals(property_id);
CREATE INDEX IF NOT EXISTS idx_referrals_employee_id ON referrals(employee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_date ON referrals(date);
CREATE INDEX IF NOT EXISTS idx_referrals_type ON referrals(type);

-- Create a view for properties with referral information
CREATE OR REPLACE VIEW properties_with_referrals AS
SELECT 
  p.id,
  p.reference_number,
  p.status_id,
  p.location,
  p.category_id,
  p.building_name,
  p.owner_name,
  p.phone_number,
  p.surface,
  p.interior_details,
  p.built_year,
  p.view_type,
  p.concierge,
  p.agent_id,
  p.price,
  p.notes,
  p.created_at,
  p.main_image,
  p.image_gallery,
  p.details,
  p.property_type,
  p.referrals_count,
  COALESCE(
    json_agg(
      json_build_object(
        'id', r.id,
        'name', r.name,
        'type', r.type,
        'employee_id', r.employee_id,
        'date', r.date
      )
    ) FILTER (WHERE r.id IS NOT NULL),
    '[]'::json
  ) as referrals_json
FROM properties p
LEFT JOIN referrals r ON p.id = r.property_id
GROUP BY p.id, p.reference_number, p.status_id, p.location, p.category_id, p.building_name, p.owner_name, p.phone_number, p.surface, p.interior_details, p.built_year, p.view_type, p.concierge, p.agent_id, p.price, p.notes, p.created_at, p.main_image, p.image_gallery, p.details, p.property_type, p.referrals_count;

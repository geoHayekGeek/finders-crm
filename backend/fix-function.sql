-- Fix the get_properties_with_details function to match new column types
-- Drop the existing function first
DROP FUNCTION IF EXISTS get_properties_with_details() CASCADE;

-- Recreate the function with correct column types
CREATE OR REPLACE FUNCTION get_properties_with_details()
RETURNS TABLE (
  id INTEGER,
  reference_number VARCHAR(20),
  status_name VARCHAR(50),
  status_color VARCHAR(20),
  location TEXT,
  category_name VARCHAR(100),
  category_code VARCHAR(10),
  building_name VARCHAR(255),
  owner_name VARCHAR(255),
  phone_number VARCHAR(50),
  surface DECIMAL(10,2),
  details JSONB,
  interior_details TEXT,
  built_year INTEGER,
  view_type VARCHAR(50),
  concierge BOOLEAN,
  agent_name VARCHAR(255),
  agent_role VARCHAR(50),
  price DECIMAL(15,2),
  notes TEXT,
  referral_source VARCHAR(100),
  referral_dates DATE[],
  main_image VARCHAR(10000),
  image_gallery VARCHAR(10000)[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.reference_number,
    s.name as status_name,
    s.color as status_color,
    p.location,
    c.name as category_name,
    c.code as category_code,
    p.building_name,
    p.owner_name,
    p.phone_number,
    p.surface,
    p.details,
    p.interior_details,
    p.built_year,
    p.view_type,
    p.concierge,
    u.name as agent_name,
    u.role as agent_role,
    p.price,
    p.notes,
    p.referral_source,
    p.referral_dates,
    p.main_image,
    p.image_gallery,
    p.created_at,
    p.updated_at
  FROM properties p
  LEFT JOIN statuses s ON p.status_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN users u ON p.agent_id = u.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created
SELECT 
  proname,
  proargtypes,
  prorettype,
  prosrc
FROM pg_proc 
WHERE proname = 'get_properties_with_details';

-- Migration: Add main_image and image_gallery columns to properties table

-- Add main_image column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'main_image') THEN
        ALTER TABLE properties ADD COLUMN main_image TEXT;
        RAISE NOTICE 'Added main_image column to properties table';
    ELSE
        RAISE NOTICE 'main_image column already exists in properties table';
    END IF;
END $$;

-- Add image_gallery column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'image_gallery') THEN
        ALTER TABLE properties ADD COLUMN image_gallery TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added image_gallery column to properties table';
    ELSE
        RAISE NOTICE 'image_gallery column already exists in properties table';
    END IF;
END $$;

-- Create index on main_image for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_main_image ON properties(main_image) WHERE main_image IS NOT NULL;

-- Create GIN index on image_gallery for array operations
CREATE INDEX IF NOT EXISTS idx_properties_image_gallery ON properties USING GIN(image_gallery);

-- Update the get_properties_with_details function to include new columns
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
  main_image TEXT,
  image_gallery TEXT[],
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

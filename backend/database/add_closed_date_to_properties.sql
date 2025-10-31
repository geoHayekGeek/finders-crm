-- Migration: Add closed_date column to properties table
-- This adds a date field to track when a property was sold or rented
-- The date is automatically set when status is changed to 'sold' or 'rented'

-- Add closed_date column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS closed_date DATE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_closed_date ON properties(closed_date);

-- Create index for status and closed_date for filtering sold/rented properties
CREATE INDEX IF NOT EXISTS idx_properties_status_closed_date ON properties(status_id, closed_date);

-- Drop the existing function first (PostgreSQL requires this when changing return type)
DROP FUNCTION IF EXISTS get_properties_with_details();

-- Update the get_properties_with_details function to include closed_date
CREATE FUNCTION get_properties_with_details()
RETURNS TABLE (
  id INTEGER,
  reference_number VARCHAR(20),
  status_name VARCHAR(50),
  status_color VARCHAR(20),
  property_type VARCHAR(20),
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
  closed_date DATE,
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
    p.property_type,
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
    p.closed_date,
    p.created_at,
    p.updated_at
  FROM properties p
  LEFT JOIN statuses s ON p.status_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN users u ON p.agent_id = u.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Comment on the new column
COMMENT ON COLUMN properties.closed_date IS 'Date when property was sold or rented. Automatically set when status changes to sold or rented.';


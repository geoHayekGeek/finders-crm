-- Add additional constraints and length limits to properties table
-- This migration enhances security and data integrity

-- Add length constraints to existing columns
ALTER TABLE properties 
  ALTER COLUMN location TYPE VARCHAR(500),
  ALTER COLUMN owner_name TYPE VARCHAR(255),
  ALTER COLUMN phone_number TYPE VARCHAR(20),
  ALTER COLUMN details TYPE VARCHAR(2000),
  ALTER COLUMN interior_details TYPE VARCHAR(2000),
  ALTER COLUMN notes TYPE VARCHAR(5000),
  ALTER COLUMN building_name TYPE VARCHAR(255);

-- Add check constraints for numeric fields
ALTER TABLE properties 
  ADD CONSTRAINT chk_surface_positive CHECK (surface > 0),
  ADD CONSTRAINT chk_surface_max CHECK (surface <= 10000),
  ADD CONSTRAINT chk_price_positive CHECK (price > 0),
  ADD CONSTRAINT chk_price_max CHECK (price <= 1000000000),
  ADD CONSTRAINT chk_built_year_range CHECK (built_year IS NULL OR (built_year >= 1800 AND built_year <= EXTRACT(YEAR FROM CURRENT_DATE)));

-- Add check constraint for phone number format
ALTER TABLE properties 
  ADD CONSTRAINT chk_phone_number_format CHECK (phone_number ~ '^[\+]?[1-9][\d\s\-\(\)]{6,19}$');

-- Add check constraint for view type (already exists but ensuring it's correct)
-- This constraint already exists: CHECK (view_type IN ('open view', 'sea view', 'mountain view', 'no view'))

-- Add check constraint for property type (already exists but ensuring it's correct)
-- This constraint already exists: CHECK (property_type IN ('sale', 'rent'))

-- Add not null constraints for required fields (some already exist)
ALTER TABLE properties 
  ALTER COLUMN status_id SET NOT NULL,
  ALTER COLUMN location SET NOT NULL,
  ALTER COLUMN category_id SET NOT NULL,
  ALTER COLUMN owner_name SET NOT NULL,
  ALTER COLUMN phone_number SET NOT NULL,
  ALTER COLUMN surface SET NOT NULL,
  ALTER COLUMN view_type SET NOT NULL,
  ALTER COLUMN concierge SET NOT NULL,
  ALTER COLUMN details SET NOT NULL,
  ALTER COLUMN interior_details SET NOT NULL,
  ALTER COLUMN price SET NOT NULL;

-- Add comment to document the constraints
COMMENT ON TABLE properties IS 'Properties table with enhanced security constraints and validation rules';

-- Create a function to validate property data before insertion/update
CREATE OR REPLACE FUNCTION validate_property_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate surface area
  IF NEW.surface <= 0 OR NEW.surface > 10000 THEN
    RAISE EXCEPTION 'Surface area must be between 0.01 and 10,000 m²';
  END IF;
  
  -- Validate price
  IF NEW.price <= 0 OR NEW.price > 1000000000 THEN
    RAISE EXCEPTION 'Price must be between $0.01 and $1,000,000,000';
  END IF;
  
  -- Validate built year
  IF NEW.built_year IS NOT NULL AND (NEW.built_year < 1800 OR NEW.built_year > EXTRACT(YEAR FROM CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Built year must be between 1800 and current year';
  END IF;
  
  -- Validate phone number format
  IF NEW.phone_number !~ '^[\+]?[1-9][\d\s\-\(\)]{6,19}$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- Validate view type
  IF NEW.view_type NOT IN ('open view', 'sea view', 'mountain view', 'no view') THEN
    RAISE EXCEPTION 'Invalid view type';
  END IF;
  
  -- Validate property type
  IF NEW.property_type NOT IN ('sale', 'rent') THEN
    RAISE EXCEPTION 'Invalid property type';
  END IF;
  
  -- Validate string lengths
  IF LENGTH(NEW.location) < 3 OR LENGTH(NEW.location) > 500 THEN
    RAISE EXCEPTION 'Location must be between 3 and 500 characters';
  END IF;
  
  IF LENGTH(NEW.owner_name) < 2 OR LENGTH(NEW.owner_name) > 255 THEN
    RAISE EXCEPTION 'Owner name must be between 2 and 255 characters';
  END IF;
  
  IF LENGTH(NEW.details) < 10 OR LENGTH(NEW.details) > 2000 THEN
    RAISE EXCEPTION 'Details must be between 10 and 2,000 characters';
  END IF;
  
  IF LENGTH(NEW.interior_details) < 10 OR LENGTH(NEW.interior_details) > 2000 THEN
    RAISE EXCEPTION 'Interior details must be between 10 and 2,000 characters';
  END IF;
  
  IF NEW.notes IS NOT NULL AND (LENGTH(NEW.notes) < 1 OR LENGTH(NEW.notes) > 5000) THEN
    RAISE EXCEPTION 'Notes must be between 1 and 5,000 characters';
  END IF;
  
  IF NEW.building_name IS NOT NULL AND LENGTH(NEW.building_name) > 255 THEN
    RAISE EXCEPTION 'Building name cannot exceed 255 characters';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate data before insert/update
DROP TRIGGER IF EXISTS trigger_validate_property_data ON properties;
CREATE TRIGGER trigger_validate_property_data
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_data();

-- Add indexes for better performance on constrained fields
CREATE INDEX IF NOT EXISTS idx_properties_surface_range ON properties(surface) WHERE surface > 0;
CREATE INDEX IF NOT EXISTS idx_properties_price_range ON properties(price) WHERE price > 0;
CREATE INDEX IF NOT EXISTS idx_properties_built_year ON properties(built_year) WHERE built_year IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON properties TO authenticated_users;
GRANT USAGE ON SEQUENCE properties_id_seq TO authenticated_users;



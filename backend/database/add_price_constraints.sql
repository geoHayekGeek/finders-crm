-- Add price constraints to prevent negative values
-- Migration: add_price_constraints.sql

-- Add constraint to properties table to ensure price is not negative
ALTER TABLE properties 
ADD CONSTRAINT check_properties_price_non_negative 
CHECK (price >= 0);

-- Add constraint to leads table to ensure price is not negative  
ALTER TABLE leads 
ADD CONSTRAINT check_leads_price_non_negative 
CHECK (price >= 0);

-- Add constraint to properties table to ensure surface area is positive
ALTER TABLE properties 
ADD CONSTRAINT check_properties_surface_positive 
CHECK (surface > 0);

-- Add comments for documentation
COMMENT ON CONSTRAINT check_properties_price_non_negative ON properties 
IS 'Ensures property prices cannot be negative';

COMMENT ON CONSTRAINT check_leads_price_non_negative ON leads 
IS 'Ensures lead prices cannot be negative';

COMMENT ON CONSTRAINT check_properties_surface_positive ON properties 
IS 'Ensures property surface area must be positive (greater than 0)';

-- Display success message
SELECT 'Price constraints added successfully' as status;

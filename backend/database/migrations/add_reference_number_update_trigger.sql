-- Migration: Add trigger to update reference number when category or property_type changes
-- This ensures that when a property's category or type is updated, the reference number is automatically regenerated

-- Function to update reference number when category_id or property_type changes
CREATE OR REPLACE FUNCTION update_property_reference_number()
RETURNS TRIGGER AS $$
DECLARE
  category_code VARCHAR(10);
  new_ref_number VARCHAR(20);
BEGIN
  -- Only update if category_id or property_type changed
  IF (OLD.category_id IS DISTINCT FROM NEW.category_id) OR 
     (OLD.property_type IS DISTINCT FROM NEW.property_type) THEN
    
    -- Get the category code for the new category
    SELECT code INTO category_code
    FROM categories
    WHERE id = NEW.category_id;
    
    -- If category not found, keep old reference number (shouldn't happen due to FK constraint)
    IF category_code IS NULL THEN
      RAISE WARNING 'Category with id % not found, keeping old reference number', NEW.category_id;
      RETURN NEW;
    END IF;
    
    -- Generate new reference number
    SELECT generate_reference_number(category_code, NEW.property_type) INTO new_ref_number;
    
    -- Update the reference number
    NEW.reference_number := new_ref_number;
    
    RAISE NOTICE 'Updated reference number for property %: % -> %', NEW.id, OLD.reference_number, new_ref_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_property_reference_number ON properties;

-- Create trigger that fires BEFORE UPDATE
CREATE TRIGGER trigger_update_property_reference_number
  BEFORE UPDATE ON properties
  FOR EACH ROW
  WHEN (
    OLD.category_id IS DISTINCT FROM NEW.category_id OR
    OLD.property_type IS DISTINCT FROM NEW.property_type
  )
  EXECUTE FUNCTION update_property_reference_number();

-- Add comment
COMMENT ON TRIGGER trigger_update_property_reference_number ON properties IS 
  'Automatically updates reference_number when category_id or property_type changes';


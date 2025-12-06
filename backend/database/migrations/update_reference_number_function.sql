-- Migration: Update reference number generation function
-- Date: 2025-01-XX
-- Description: Updates generate_reference_number function to use new format:
--              F + PropertyType + Category + Year + SequentialID
--              Example: FRS25001 (Finders Rent Shop 2025 001)

-- Drop the old function
DROP FUNCTION IF EXISTS generate_reference_number(VARCHAR, VARCHAR);

-- Create the new function with updated format
CREATE OR REPLACE FUNCTION generate_reference_number(
  p_category_code VARCHAR(10),
  p_property_type VARCHAR(20) -- 'sale' or 'rent'
)
RETURNS VARCHAR(20) AS $$
DECLARE
  year_part VARCHAR(2);
  id_part VARCHAR(3);
  ref_number VARCHAR(20);
  type_part VARCHAR(1);
  prefix_pattern VARCHAR(20);
  max_id INTEGER;
  next_id INTEGER;
  expected_length INTEGER;
BEGIN
  -- Extract last 2 digits of current year
  year_part := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR(4), 2);
  
  -- Determine type based on property_type
  -- S = Sale, R = Rent
  IF p_property_type = 'sale' THEN
    type_part := 'S';
  ELSIF p_property_type = 'rent' THEN
    type_part := 'R';
  ELSE
    type_part := 'R'; -- Default to Rent
  END IF;
  
  -- Construct prefix pattern: F + Type + Category + Year
  -- Example: FRS25 (Finders Rent Shop 2025)
  prefix_pattern := 'F' || type_part || p_category_code || year_part;
  
  -- Calculate expected length: F(1) + Type(1) + Category(variable) + Year(2) + ID(3)
  expected_length := LENGTH(prefix_pattern) + 3;
  
  -- Find the maximum ID for this prefix pattern in the current year
  -- Extract the last 3 digits from existing reference numbers matching the pattern
  SELECT COALESCE(MAX(
    CASE 
      WHEN LENGTH(reference_number) = expected_length 
        AND reference_number LIKE prefix_pattern || '%' THEN
        CAST(RIGHT(reference_number, 3) AS INTEGER)
      ELSE 0
    END
  ), 0)
  INTO max_id
  FROM properties
  WHERE reference_number LIKE prefix_pattern || '%'
    AND LENGTH(reference_number) = expected_length
    AND SUBSTRING(reference_number FROM 1 FOR LENGTH(prefix_pattern)) = prefix_pattern;
  
  -- Increment to get next ID (starts at 1, so first property will be 001)
  next_id := max_id + 1;
  
  -- Format ID as 3 digits with leading zeros
  id_part := LPAD(next_id::TEXT, 3, '0');
  
  -- Construct reference number: F + Type + Category + Year + ID
  -- Example: FRS25001 (Finders Rent Shop 2025 001)
  ref_number := prefix_pattern || id_part;
  
  -- Double-check that this reference number doesn't already exist (safety check)
  IF EXISTS (SELECT 1 FROM properties WHERE reference_number = ref_number) THEN
    RAISE EXCEPTION 'Generated reference number already exists: %', ref_number;
  END IF;
  
  RETURN ref_number;
END;
$$ LANGUAGE plpgsql;


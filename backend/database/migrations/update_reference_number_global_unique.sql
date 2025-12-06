-- Migration: Update reference number to use globally unique IDs without leading zeros
-- Date: 2025-01-XX
-- Description: Updates generate_reference_number function to use globally unique IDs
--              Format: F + PropertyType + Category + Year + GlobalUniqueID (no leading zeros)
--              Example: FRIW251 (ID=1 is globally unique)

-- Drop the old function
DROP FUNCTION IF EXISTS generate_reference_number(VARCHAR, VARCHAR);

-- Create the new function with globally unique IDs
CREATE OR REPLACE FUNCTION generate_reference_number(
  p_category_code VARCHAR(10),
  p_property_type VARCHAR(20) -- 'sale' or 'rent'
)
RETURNS VARCHAR(20) AS $$
DECLARE
  year_part VARCHAR(2);
  id_part VARCHAR(20);
  ref_number VARCHAR(20);
  type_part VARCHAR(1);
  prefix_pattern VARCHAR(20);
  max_id INTEGER;
  next_id INTEGER;
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
  -- Example: FRIW25 (Finders Rent Industrial Warehouse 2025)
  prefix_pattern := 'F' || type_part || p_category_code || year_part;
  
  -- Find the maximum globally unique ID from ALL properties
  -- The ID must be globally unique across ALL properties
  -- Pattern: F + Type + Category + Year(2 digits) + ID
  -- After reset, all properties follow: F + Type + Category + Year(2) + ID
  -- The trailing digits are the year (2 digits) followed by the ID
  -- To extract ID: get trailing digits, then extract from position 3 (skipping year "25")
  SELECT COALESCE(MAX(
    CASE 
      WHEN reference_number ~ '^F[RS][A-Z]+[0-9]{2}[0-9]+$' THEN
        -- Extract trailing digits
        -- Then get ID by skipping the 2-digit year (from position 3)
        -- Only extract if trailing digits are at least 3 characters (year + ID)
        CASE 
          WHEN LENGTH(SUBSTRING(reference_number FROM '([0-9]+)$')) >= 3 THEN
            CAST(
              SUBSTRING(
                SUBSTRING(reference_number FROM '([0-9]+)$') 
                FROM 3
              ) AS INTEGER
            )
          ELSE 0
        END
      ELSE 0
    END
  ), 0)
  INTO max_id
  FROM properties;
  
  -- Increment to get next globally unique ID (starts at 1)
  next_id := max_id + 1;
  
  -- Format ID without leading zeros (just the number as string)
  id_part := next_id::TEXT;
  
  -- Construct reference number: F + Type + Category + Year + GlobalUniqueID
  -- Example: FRIW251 (Finders Rent Industrial Warehouse 2025, ID=1)
  ref_number := prefix_pattern || id_part;
  
  -- Double-check that this reference number doesn't already exist (safety check)
  IF EXISTS (SELECT 1 FROM properties WHERE reference_number = ref_number) THEN
    RAISE EXCEPTION 'Generated reference number already exists: %', ref_number;
  END IF;
  
  RETURN ref_number;
END;
$$ LANGUAGE plpgsql;


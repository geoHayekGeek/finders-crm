-- Update image columns to store file URLs instead of base64 data
-- This prevents database index size issues and improves performance

-- Update the properties table to change image columns
ALTER TABLE properties 
ALTER COLUMN main_image TYPE VARCHAR(500),
ALTER COLUMN image_gallery TYPE VARCHAR(500)[];

-- Add comments to clarify the new purpose
COMMENT ON COLUMN properties.main_image IS 'URL path to the main property image file (e.g., /assets/properties/image1.jpg)';
COMMENT ON COLUMN properties.image_gallery IS 'Array of URL paths to additional property images (e.g., {/assets/properties/gallery1.jpg, /assets/properties/gallery2.jpg})';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    col_description(table_name::regclass, ordinal_position) as comment
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name IN ('main_image', 'image_gallery')
ORDER BY ordinal_position;

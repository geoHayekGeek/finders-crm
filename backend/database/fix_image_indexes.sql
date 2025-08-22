-- Fix for image column index issues
-- This script removes any problematic indexes that might be causing the "index row requires X bytes, maximum size is 8191" error

-- Drop any existing indexes that might be problematic
DROP INDEX IF EXISTS idx_properties_main_image;
DROP INDEX IF EXISTS idx_properties_image_gallery;

-- Ensure the main_image and image_gallery columns are not indexed
-- These columns can contain very large base64 data and should not be indexed

-- Verify current indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'properties'
ORDER BY indexname;

-- If you need to search by image presence (not content), you can create a functional index
-- that only checks if the column is NULL or not, rather than indexing the content
-- CREATE INDEX IF NOT EXISTS idx_properties_has_main_image ON properties((main_image IS NOT NULL));
-- CREATE INDEX IF NOT EXISTS idx_properties_has_gallery ON properties((array_length(image_gallery, 1) > 0));

-- Note: The above functional indexes are commented out because they might still cause issues
-- with very large base64 strings. It's better to handle image searches at the application level.

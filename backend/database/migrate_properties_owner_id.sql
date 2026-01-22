-- Migration: Link existing properties to leads by matching owner_name and phone_number
-- This migration attempts to populate owner_id for properties that have owner_name but no owner_id
-- It matches by both name and phone number for accuracy, falling back to name-only if needed

-- Step 1: Update properties with exact match (name + phone)
UPDATE properties p
SET owner_id = l.id
FROM leads l
WHERE p.owner_id IS NULL
  AND p.owner_name IS NOT NULL
  AND p.owner_name != ''
  AND LOWER(TRIM(p.owner_name)) = LOWER(TRIM(l.customer_name))
  AND (
    (p.phone_number IS NOT NULL AND l.phone_number IS NOT NULL 
     AND LOWER(TRIM(p.phone_number)) = LOWER(TRIM(l.phone_number)))
    OR (p.phone_number IS NULL AND l.phone_number IS NULL)
  );

-- Step 2: Update remaining properties with name-only match (if no phone match found)
-- Prefer leads with the same agent_id as the property
UPDATE properties p
SET owner_id = (
  SELECT l.id
  FROM leads l
  WHERE LOWER(TRIM(p.owner_name)) = LOWER(TRIM(l.customer_name))
  ORDER BY 
    CASE WHEN l.agent_id = p.agent_id THEN 0 ELSE 1 END,  -- Prefer same agent
    l.id  -- Deterministic ordering
  LIMIT 1
)
WHERE p.owner_id IS NULL
  AND p.owner_name IS NOT NULL
  AND p.owner_name != ''
  AND EXISTS (
    SELECT 1
    FROM leads l
    WHERE LOWER(TRIM(p.owner_name)) = LOWER(TRIM(l.customer_name))
  );

-- Step 3: After linking, sync owner_name and phone_number from leads for consistency
UPDATE properties p
SET 
  owner_name = l.customer_name,
  phone_number = l.phone_number
FROM leads l
WHERE p.owner_id = l.id
  AND (
    p.owner_name != l.customer_name
    OR (p.phone_number IS DISTINCT FROM l.phone_number)
  );

-- Note: Properties that cannot be matched will remain with owner_id = NULL
-- These should be manually reviewed and linked, or leads should be created for them

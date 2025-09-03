-- Migration: Make phone_number field optional in properties table
-- This removes the NOT NULL constraint from the phone_number field

-- First, we need to handle any existing NULL values (if any exist)
-- Since phone_number was NOT NULL, this shouldn't be necessary, but it's safe to include

-- Remove the NOT NULL constraint
ALTER TABLE properties ALTER COLUMN phone_number DROP NOT NULL;

-- Verify the change
-- The phone_number column should now allow NULL values
-- You can check with: \d properties

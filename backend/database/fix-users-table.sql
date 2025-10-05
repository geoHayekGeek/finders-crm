-- Fix users table structure
-- 1. Remove duplicate assigned_to_team_leader_id column (redundant with assigned_to)
-- 2. Add UNIQUE constraint to user_code
-- 3. Make user_code NOT NULL (after populating existing records)

BEGIN;

-- Step 1: Remove redundant column
ALTER TABLE users DROP COLUMN IF EXISTS assigned_to_team_leader_id;

-- Step 2: Generate user codes for existing users who don't have one
-- This will create codes based on their names
DO $$
DECLARE
    user_record RECORD;
    name_parts TEXT[];
    initials TEXT;
    generated_code TEXT;
    counter INTEGER;
    code_exists BOOLEAN;
BEGIN
    FOR user_record IN SELECT id, name FROM users WHERE user_code IS NULL LOOP
        -- Split name into parts
        name_parts := string_to_array(trim(user_record.name), ' ');
        
        -- Generate initials
        IF array_length(name_parts, 1) = 1 THEN
            -- Single name: use first 2 letters
            initials := upper(substring(name_parts[1] from 1 for 2));
        ELSE
            -- Multiple names: first letter of first name + first letter of last name
            initials := upper(substring(name_parts[1] from 1 for 1) || substring(name_parts[array_length(name_parts, 1)] from 1 for 1));
        END IF;
        
        -- Check if initials already exist
        SELECT EXISTS(SELECT 1 FROM users u WHERE u.user_code = initials) INTO code_exists;
        
        IF NOT code_exists THEN
            generated_code := initials;
        ELSE
            -- Add numbers until we find unique code
            counter := 1;
            LOOP
                generated_code := initials || counter::TEXT;
                SELECT EXISTS(SELECT 1 FROM users u WHERE u.user_code = generated_code) INTO code_exists;
                EXIT WHEN NOT code_exists;
                counter := counter + 1;
            END LOOP;
        END IF;
        
        -- Update user with generated code
        UPDATE users SET user_code = generated_code WHERE id = user_record.id;
        RAISE NOTICE 'Generated code % for user %', generated_code, user_record.name;
    END LOOP;
END $$;

-- Step 3: Make user_code NOT NULL and UNIQUE (now that all records have codes)
ALTER TABLE users ALTER COLUMN user_code SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_user_code_unique UNIQUE (user_code);

-- Step 4: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code);

-- Step 5: Make email unique if not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;
END $$;

COMMIT;

-- Display summary
SELECT 
    COUNT(*) as total_users,
    COUNT(DISTINCT user_code) as unique_codes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_active = false THEN 1 END) as disabled_users,
    COUNT(CASE WHEN user_code IS NOT NULL THEN 1 END) as users_with_codes
FROM users;

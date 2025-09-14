-- Add string validation constraints to prevent empty strings in required fields
-- Migration: add_string_constraints.sql

-- LEADS table constraints
ALTER TABLE leads 
ADD CONSTRAINT check_leads_customer_name_not_empty 
CHECK (customer_name IS NOT NULL AND trim(customer_name) != '');

-- PROPERTIES table constraints
ALTER TABLE properties 
ADD CONSTRAINT check_properties_owner_name_not_empty 
CHECK (owner_name IS NOT NULL AND trim(owner_name) != '');

ALTER TABLE properties 
ADD CONSTRAINT check_properties_location_not_empty 
CHECK (location IS NOT NULL AND trim(location) != '');

ALTER TABLE properties 
ADD CONSTRAINT check_properties_reference_number_not_empty 
CHECK (reference_number IS NOT NULL AND trim(reference_number) != '');

-- USERS table constraints  
ALTER TABLE users 
ADD CONSTRAINT check_users_name_not_empty 
CHECK (name IS NOT NULL AND trim(name) != '');

ALTER TABLE users 
ADD CONSTRAINT check_users_email_not_empty 
CHECK (email IS NOT NULL AND trim(email) != '');

-- CALENDAR_EVENTS table constraints
ALTER TABLE calendar_events 
ADD CONSTRAINT check_calendar_events_title_not_empty 
CHECK (title IS NOT NULL AND trim(title) != '');

-- CATEGORIES table constraints
ALTER TABLE categories 
ADD CONSTRAINT check_categories_name_not_empty 
CHECK (name IS NOT NULL AND trim(name) != '');

-- STATUSES table constraints
ALTER TABLE statuses 
ADD CONSTRAINT check_statuses_name_not_empty 
CHECK (name IS NOT NULL AND trim(name) != '');

-- Add comments for documentation
COMMENT ON CONSTRAINT check_leads_customer_name_not_empty ON leads 
IS 'Ensures customer name is not null or empty';

COMMENT ON CONSTRAINT check_properties_owner_name_not_empty ON properties 
IS 'Ensures property owner name is not null or empty';

COMMENT ON CONSTRAINT check_properties_location_not_empty ON properties 
IS 'Ensures property location is not null or empty';

COMMENT ON CONSTRAINT check_properties_reference_number_not_empty ON properties 
IS 'Ensures property reference number is not null or empty';

COMMENT ON CONSTRAINT check_users_name_not_empty ON users 
IS 'Ensures user name is not null or empty';

COMMENT ON CONSTRAINT check_users_email_not_empty ON users 
IS 'Ensures user email is not null or empty';

COMMENT ON CONSTRAINT check_calendar_events_title_not_empty ON calendar_events 
IS 'Ensures calendar event title is not null or empty';

COMMENT ON CONSTRAINT check_categories_name_not_empty ON categories 
IS 'Ensures category name is not null or empty';

COMMENT ON CONSTRAINT check_statuses_name_not_empty ON statuses 
IS 'Ensures status name is not null or empty';

-- Display success message
SELECT 'String validation constraints added successfully' as status;

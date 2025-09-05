-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(20) UNIQUE NOT NULL,
  status_id INTEGER REFERENCES statuses(id) ON DELETE RESTRICT NOT NULL,
  property_type VARCHAR(20) CHECK (property_type IN ('sale', 'rent')) NOT NULL,
  location TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
  building_name VARCHAR(255), -- Optional
  owner_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  surface DECIMAL(10,2) NOT NULL,
         details TEXT NOT NULL, -- Floor, Balcony, Parking, Cave details as text
  interior_details TEXT NOT NULL,
  built_year INTEGER, -- Optional
  view_type VARCHAR(50) CHECK (view_type IN ('open view', 'sea view', 'mountain view', 'no view')) NOT NULL,
  concierge BOOLEAN DEFAULT FALSE NOT NULL,
  agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  price DECIMAL(15,2) NOT NULL,
  notes TEXT, -- Optional
  property_url TEXT, -- Optional property URL (e.g., listing URL from external sites)
  referral_sources JSONB, -- array of referral objects with source and date: [{"source": "John Doe", "date": "2024-01-15"}, {"source": "External Agency", "date": "2024-01-20"}]
  referral_source VARCHAR(100), -- deprecated: keeping for backward compatibility
  referral_dates DATE[], -- deprecated: keeping for backward compatibility
  main_image TEXT, -- Base64 encoded main property image (optional)
  image_gallery TEXT[], -- Array of base64 encoded additional property images (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_reference_number ON properties(reference_number);
CREATE INDEX IF NOT EXISTS idx_properties_status_id ON properties(status_id);
CREATE INDEX IF NOT EXISTS idx_properties_category_id ON properties(category_id);
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIN(to_tsvector('english', location));
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_status_category ON properties(status_id, category_id);
CREATE INDEX IF NOT EXISTS idx_properties_agent_status ON properties(agent_id, status_id);

-- Function to generate reference number
CREATE OR REPLACE FUNCTION generate_reference_number(
  p_category_code VARCHAR(10),
  p_property_type VARCHAR(20) -- 'sale' or 'rent'
)
RETURNS VARCHAR(20) AS $$
DECLARE
  year_part VARCHAR(2);
  random_part VARCHAR(3);
  ref_number VARCHAR(20);
  counter INTEGER := 0;
  type_part VARCHAR(1);
BEGIN
  -- Extract last 2 digits of current year
  year_part := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR(4), 2);
  
  -- Determine type based on property_type
  -- F = Finders (always), S = Sale, R = Rent
  IF p_property_type = 'sale' THEN
    type_part := 'S';
  ELSIF p_property_type = 'rent' THEN
    type_part := 'R';
  ELSE
    type_part := 'F'; -- Default to Finders
  END IF;
  
  LOOP
    -- Generate 3 random digits
    random_part := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    
    -- Construct reference number: F + Category + S/R + Year + Random
    -- Example: FRA25111 (Finders Apartment Rent 2025 111)
    ref_number := 'F' || p_category_code || type_part || year_part || random_part;
    
    -- Check if this reference number already exists
    IF NOT EXISTS (SELECT 1 FROM properties WHERE reference_number = ref_number) THEN
      RETURN ref_number;
    END IF;
    
    counter := counter + 1;
    -- Prevent infinite loop
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique reference number after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at 
  BEFORE UPDATE ON properties 
  FOR EACH ROW 
  EXECUTE FUNCTION update_properties_updated_at();

-- Function to get properties with full details
CREATE OR REPLACE FUNCTION get_properties_with_details()
RETURNS TABLE (
  id INTEGER,
  reference_number VARCHAR(20),
  status_name VARCHAR(50),
  status_color VARCHAR(20),
  property_type VARCHAR(20),
  location TEXT,
  category_name VARCHAR(100),
  category_code VARCHAR(10),
  building_name VARCHAR(255),
  owner_name VARCHAR(255),
  phone_number VARCHAR(50),
  surface DECIMAL(10,2),
  details JSONB,
  interior_details TEXT,
  built_year INTEGER,
  view_type VARCHAR(50),
  concierge BOOLEAN,
  agent_name VARCHAR(255),
  agent_role VARCHAR(50),
  price DECIMAL(15,2),
  notes TEXT,
  referral_source VARCHAR(100),
  referral_dates DATE[],
  main_image TEXT,
  image_gallery TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.reference_number,
    s.name as status_name,
    s.color as status_color,
    p.property_type,
    p.location,
    c.name as category_name,
    c.code as category_code,
    p.building_name,
    p.owner_name,
    p.phone_number,
    p.surface,
    p.details,
    p.interior_details,
    p.built_year,
    p.view_type,
    p.concierge,
    u.name as agent_name,
    u.role as agent_role,
    p.price,
    p.notes,
    p.referral_source,
    p.referral_dates,
    p.main_image,
    p.image_gallery,
    p.created_at,
    p.updated_at
  FROM properties p
  LEFT JOIN statuses s ON p.status_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN users u ON p.agent_id = u.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

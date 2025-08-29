-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    agent_name VARCHAR(255), -- Fallback for when agent is not in system
    referral_source TEXT,
    referral_dates TEXT,
    referral_sources JSONB, -- For multiple referrals with dates like properties
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_date ON leads(date);
CREATE INDEX IF NOT EXISTS idx_leads_customer_name ON leads(customer_name);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();

-- Insert some sample data for testing (optional)
-- INSERT INTO leads (customer_name, phone_number, agent_name, referral_source, notes) VALUES
-- ('John Doe', '+1-555-0123', 'Sarah Johnson', 'Website Inquiry', 'Interested in downtown apartments'),
-- ('Jane Smith', '+1-555-0124', 'Mike Chen', 'Social Media', 'Looking for family home with garden'),
-- ('Bob Wilson', '+1-555-0125', 'Lisa Rodriguez', 'Referral from client', 'Wants commercial property'),
-- ('Alice Brown', '+1-555-0126', 'David Wilson', 'Cold Call', 'First-time buyer, needs guidance'),
-- ('Charlie Davis', '+1-555-0127', 'Jennifer Lee', 'Walk-in', 'Interested in luxury condos');

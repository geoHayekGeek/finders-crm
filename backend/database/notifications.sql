-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'urgent')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('property', 'lead', 'user', 'system')),
    entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Function to create notification for multiple users
CREATE OR REPLACE FUNCTION create_notification_for_users(
    p_user_ids INTEGER[],
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    user_id INTEGER;
    notification_count INTEGER := 0;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
        VALUES (user_id, p_title, p_message, p_type, p_entity_type, p_entity_id);
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get users who should be notified for property changes
CREATE OR REPLACE FUNCTION get_property_notification_users(
    p_property_id INTEGER,
    p_exclude_user_id INTEGER DEFAULT NULL
)
RETURNS TABLE(user_id INTEGER, role VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    WITH property_info AS (
        SELECT p.agent_id, p.referrals
        FROM properties p
        WHERE p.id = p_property_id
    ),
    referral_users AS (
        SELECT DISTINCT r.employee_id as user_id, 'agent'::VARCHAR(50) as role
        FROM referrals r
        WHERE r.property_id = p_property_id
        AND r.employee_id IS NOT NULL
    ),
    management_users AS (
        SELECT u.id as user_id, u.role
        FROM users u
        WHERE u.role IN ('admin', 'operations_manager', 'operations', 'agent_manager')
        AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id)
    )
    SELECT DISTINCT u.user_id, u.role
    FROM (
        -- Assigned agent
        SELECT pi.agent_id as user_id, 'agent'::VARCHAR(50) as role
        FROM property_info pi
        WHERE pi.agent_id IS NOT NULL
        AND (p_exclude_user_id IS NULL OR pi.agent_id != p_exclude_user_id)
        
        UNION
        
        -- Referral users
        SELECT ru.user_id, ru.role
        FROM referral_users ru
        WHERE (p_exclude_user_id IS NULL OR ru.user_id != p_exclude_user_id)
        
        UNION
        
        -- Management users
        SELECT mu.user_id, mu.role
        FROM management_users mu
    ) u;
END;
$$ LANGUAGE plpgsql;

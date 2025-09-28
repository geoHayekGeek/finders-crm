-- Migration: Add team leader role support and agent relationships

-- Create team_agents table to establish relationships between team leaders and agents
CREATE TABLE IF NOT EXISTS team_agents (
    id SERIAL PRIMARY KEY,
    team_leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_leader_id, agent_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_agents_team_leader_id ON team_agents(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_team_agents_agent_id ON team_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_agents_is_active ON team_agents(is_active);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_team_agents_updated_at 
    BEFORE UPDATE ON team_agents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE team_agents IS 'Manages relationships between team leaders and their assigned agents';

-- Update valid roles to include team_leader
-- Note: This is handled in the application code, but we can add a comment here for reference
COMMENT ON COLUMN users.role IS 'User role: agent, agent manager, operations, operations manager, admin, accountant, team_leader';


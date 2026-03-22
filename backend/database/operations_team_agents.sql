-- Operations manager ↔ agent assignments (parallel to team_agents for team leaders).
-- Does not change users.assigned_to (that remains the sales team leader).

CREATE TABLE IF NOT EXISTS operations_team_agents (
    id SERIAL PRIMARY KEY,
    operations_manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(operations_manager_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_operations_team_agents_manager ON operations_team_agents(operations_manager_id);
CREATE INDEX IF NOT EXISTS idx_operations_team_agents_agent ON operations_team_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_operations_team_agents_active ON operations_team_agents(is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_team_agents_single_active_per_agent
ON operations_team_agents (agent_id)
WHERE is_active = TRUE;

COMMENT ON TABLE operations_team_agents IS 'Agents overseen by an operations manager (HR / reporting; separate from team_agents / sales team)';

-- Allow the application DB role to read/write (fixes "permission denied" if migration ran as a different user than the API)
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_team_agents TO PUBLIC;

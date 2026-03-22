-- Run once if the table already exists but the API role gets "permission denied for relation operations_team_agents"
-- Example: psql "$DATABASE_URL" -f database/operations_team_agents_grants.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON operations_team_agents TO PUBLIC;

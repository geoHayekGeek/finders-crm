-- Migration: Enforce single active team assignment per agent
-- This ensures that each agent can only be assigned to one team leader at a time

-- Step 1: Fix existing data FIRST - for agents with multiple active assignments,
-- keep only the one that matches users.assigned_to, deactivate the rest
DO $$
DECLARE
  agent_record RECORD;
  correct_team_leader_id INTEGER;
BEGIN
  -- Find agents with multiple active team assignments
  FOR agent_record IN
    SELECT agent_id, COUNT(*) as active_count
    FROM team_agents
    WHERE is_active = TRUE
    GROUP BY agent_id
    HAVING COUNT(*) > 1
  LOOP
    -- Get the correct team leader from users.assigned_to
    SELECT assigned_to INTO correct_team_leader_id
    FROM users
    WHERE id = agent_record.agent_id AND role = 'agent';
    
    -- If agent has an assigned_to value, deactivate all other active assignments
    IF correct_team_leader_id IS NOT NULL THEN
      UPDATE team_agents
      SET is_active = FALSE, updated_at = NOW()
      WHERE agent_id = agent_record.agent_id
        AND is_active = TRUE
        AND team_leader_id != correct_team_leader_id;
      
      RAISE NOTICE 'Fixed agent %: Deactivated assignments not matching assigned_to (%)', 
        agent_record.agent_id, correct_team_leader_id;
    ELSE
      -- If no assigned_to, keep the most recent assignment and deactivate others
      UPDATE team_agents
      SET is_active = FALSE, updated_at = NOW()
      WHERE agent_id = agent_record.agent_id
        AND is_active = TRUE
        AND id NOT IN (
          SELECT id
          FROM team_agents
          WHERE agent_id = agent_record.agent_id
            AND is_active = TRUE
          ORDER BY assigned_at DESC
          LIMIT 1
        );
      
      -- Update users.assigned_to to match the kept assignment
      UPDATE users
      SET assigned_to = (
        SELECT team_leader_id
        FROM team_agents
        WHERE agent_id = agent_record.agent_id
          AND is_active = TRUE
        ORDER BY assigned_at DESC
        LIMIT 1
      ), is_assigned = TRUE
      WHERE id = agent_record.agent_id;
      
      RAISE NOTICE 'Fixed agent %: Kept most recent assignment and updated users.assigned_to', 
        agent_record.agent_id;
    END IF;
  END LOOP;
END $$;

-- Step 3: Ensure consistency - update team_agents to match users.assigned_to
-- Deactivate any active assignments that don't match users.assigned_to
UPDATE team_agents ta
SET is_active = FALSE, updated_at = NOW()
FROM users u
WHERE ta.agent_id = u.id
  AND u.role = 'agent'
  AND ta.is_active = TRUE
  AND (u.assigned_to IS NULL OR ta.team_leader_id != u.assigned_to);

-- Step 4: Ensure users.assigned_to matches active team_agents
-- Update users.assigned_to for agents that have active assignments but wrong assigned_to
UPDATE users u
SET assigned_to = (
  SELECT team_leader_id
  FROM team_agents
  WHERE agent_id = u.id
    AND is_active = TRUE
  LIMIT 1
), is_assigned = TRUE
WHERE u.role = 'agent'
  AND EXISTS (
    SELECT 1
    FROM team_agents
    WHERE agent_id = u.id
      AND is_active = TRUE
  )
  AND (
    u.assigned_to IS NULL
    OR u.assigned_to != (
      SELECT team_leader_id
      FROM team_agents
      WHERE agent_id = u.id
        AND is_active = TRUE
      LIMIT 1
    )
  );

-- Step 5: Now create the unique partial index to prevent future duplicates
-- This will prevent new duplicate active assignments from being created
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_agents_single_active_assignment 
ON team_agents (agent_id) 
WHERE is_active = TRUE;

-- Add comment
COMMENT ON INDEX idx_team_agents_single_active_assignment IS 
  'Ensures each agent can only have one active team assignment at a time';


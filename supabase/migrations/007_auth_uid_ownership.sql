-- Replace passphrase-based workspace ownership with Supabase Auth (auth.uid())
-- Magic link (passwordless email) authentication only
-- Local-only mode remains available; auth required only for cloud sync

-- =============================================================================
-- SCHEMA CHANGES
-- =============================================================================

-- Add user_id column to workspaces (nullable for migration period)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

-- Drop passphrase_hash column (clean break)
ALTER TABLE workspaces DROP COLUMN IF EXISTS passphrase_hash;

-- =============================================================================
-- UPDATED RPC FUNCTIONS
-- =============================================================================

-- Drop passphrase verification function (no longer needed)
DROP FUNCTION IF EXISTS verify_passphrase(UUID, TEXT);

-- Create a new workspace owned by the authenticated user
DROP FUNCTION IF EXISTS create_workspace(TEXT);
CREATE OR REPLACE FUNCTION create_workspace()
RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_short_name TEXT;
  v_share_token TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO workspaces (user_id)
  VALUES (v_user_id)
  RETURNING id, short_name INTO v_workspace_id, v_short_name;

  INSERT INTO settings (workspace_id) VALUES (v_workspace_id);

  v_share_token := create_workspace_share_token(v_workspace_id);

  RETURN jsonb_build_object(
    'id', v_workspace_id,
    'short_name', v_short_name,
    'share_token', v_share_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Sync all workspace data (requires authenticated owner)
DROP FUNCTION IF EXISTS sync_workspace_data(UUID, TEXT, JSONB);
CREATE OR REPLACE FUNCTION sync_workspace_data(
  p_workspace_id UUID,
  p_state JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id AND user_id = v_user_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update settings
  UPDATE settings
  SET
    currency_symbol = COALESCE(p_state->'settings'->>'currencySymbol', currency_symbol),
    labor_rate = COALESCE((p_state->'settings'->>'laborRate')::DECIMAL, labor_rate),
    labor_rate_unit = COALESCE(p_state->'settings'->>'laborRateUnit', labor_rate_unit),
    labor_rate_prompt_dismissed = COALESCE((p_state->'settings'->>'laborRatePromptDismissed')::BOOLEAN, labor_rate_prompt_dismissed)
  WHERE workspace_id = p_workspace_id;

  -- Delete materials not in incoming
  WITH incoming_materials AS (
    SELECT
      id,
      name,
      "unitCost" AS unit_cost,
      unit,
      notes,
      cost
    FROM jsonb_to_recordset(COALESCE(p_state->'materials', '[]'::jsonb))
      AS x(id UUID, name TEXT, "unitCost" DECIMAL, unit TEXT, notes TEXT, cost DECIMAL)
  )
  DELETE FROM materials m
  WHERE m.workspace_id = p_workspace_id
    AND NOT EXISTS (SELECT 1 FROM incoming_materials im WHERE im.id = m.id);

  -- Upsert materials
  WITH incoming_materials AS (
    SELECT
      id,
      name,
      "unitCost" AS unit_cost,
      unit,
      notes,
      cost
    FROM jsonb_to_recordset(COALESCE(p_state->'materials', '[]'::jsonb))
      AS x(id UUID, name TEXT, "unitCost" DECIMAL, unit TEXT, notes TEXT, cost DECIMAL)
  )
  INSERT INTO materials (id, workspace_id, name, unit_cost, unit, notes, cost)
  SELECT id, p_workspace_id, name, unit_cost, unit, notes, cost
  FROM incoming_materials
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    unit_cost = EXCLUDED.unit_cost,
    unit = EXCLUDED.unit,
    notes = EXCLUDED.notes,
    cost = EXCLUDED.cost
  WHERE materials.workspace_id = p_workspace_id;

  -- Delete projects not in incoming
  WITH incoming_projects AS (
    SELECT
      id,
      name,
      description,
      "laborMinutes" AS labor_minutes
    FROM jsonb_to_recordset(COALESCE(p_state->'projects', '[]'::jsonb))
      AS x(id UUID, name TEXT, description TEXT, "laborMinutes" INTEGER)
  )
  DELETE FROM projects p
  WHERE p.workspace_id = p_workspace_id
    AND NOT EXISTS (SELECT 1 FROM incoming_projects ip WHERE ip.id = p.id);

  -- Upsert projects
  WITH incoming_projects AS (
    SELECT
      id,
      name,
      description,
      "laborMinutes" AS labor_minutes
    FROM jsonb_to_recordset(COALESCE(p_state->'projects', '[]'::jsonb))
      AS x(id UUID, name TEXT, description TEXT, "laborMinutes" INTEGER)
  )
  INSERT INTO projects (id, workspace_id, name, description, labor_minutes)
  SELECT id, p_workspace_id, name, description, labor_minutes
  FROM incoming_projects
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    labor_minutes = EXCLUDED.labor_minutes
  WHERE projects.workspace_id = p_workspace_id;

  -- Replace all project materials for this workspace's projects
  DELETE FROM project_materials pm
  WHERE pm.project_id IN (SELECT id FROM projects WHERE workspace_id = p_workspace_id);

  WITH incoming_projects AS (
    SELECT
      id,
      materials
    FROM jsonb_to_recordset(COALESCE(p_state->'projects', '[]'::jsonb))
      AS x(id UUID, materials JSONB)
  ), incoming_project_materials AS (
    SELECT
      p.id AS project_id,
      (pm->>'materialId')::UUID AS material_id,
      (pm->>'quantity')::DECIMAL AS quantity
    FROM incoming_projects p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.materials, '[]'::jsonb)) pm
  )
  INSERT INTO project_materials (
    project_id,
    material_id,
    quantity,
    material_name,
    material_unit_cost,
    material_unit
  )
  SELECT
    ipm.project_id,
    ipm.material_id,
    ipm.quantity,
    COALESCE(m.name, 'Unknown'),
    COALESCE(m.unit_cost, 0),
    COALESCE(m.unit, 'unit')
  FROM incoming_project_materials ipm
  LEFT JOIN materials m ON m.id = ipm.material_id AND m.workspace_id = p_workspace_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Rotate workspace share token (requires authenticated owner)
DROP FUNCTION IF EXISTS rotate_workspace_share_token(UUID, TEXT);
CREATE OR REPLACE FUNCTION rotate_workspace_share_token(
  p_workspace_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id AND user_id = v_user_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Revoke existing tokens
  UPDATE workspace_share_tokens
  SET revoked_at = NOW()
  WHERE workspace_id = p_workspace_id AND revoked_at IS NULL;

  -- Create new token
  v_token := create_workspace_share_token(p_workspace_id);

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- List all workspaces owned by the authenticated user
CREATE OR REPLACE FUNCTION list_user_workspaces()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', w.id,
      'short_name', w.short_name,
      'created_at', w.created_at,
      'updated_at', w.updated_at
    ) ORDER BY w.updated_at DESC)
    FROM workspaces w
    WHERE w.user_id = v_user_id),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- =============================================================================
-- GRANT CHANGES
-- =============================================================================

-- Revoke anon access from owner-only functions
REVOKE EXECUTE ON FUNCTION create_workspace() FROM anon;
REVOKE EXECUTE ON FUNCTION sync_workspace_data(UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION rotate_workspace_share_token(UUID) FROM anon;

-- Grant authenticated access to owner-only functions
GRANT EXECUTE ON FUNCTION create_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_workspace_data(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_workspace_share_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_user_workspaces() TO authenticated;

-- Keep anon access for read-only functions (viewers don't need accounts)
-- Also grant to authenticated (authenticated users can also view via share token)
GRANT EXECUTE ON FUNCTION resolve_workspace_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION resolve_workspace_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_workspace_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION fetch_workspace_data(TEXT) TO authenticated;

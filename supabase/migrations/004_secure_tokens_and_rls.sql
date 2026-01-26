-- Secure workspace access with high-entropy share tokens and RPC-only access

-- Share tokens table (hashed tokens only)
CREATE TABLE IF NOT EXISTS workspace_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

ALTER TABLE workspace_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_share_tokens_hash_unique
  ON workspace_share_tokens(token_hash);
CREATE INDEX IF NOT EXISTS workspace_share_tokens_workspace_idx
  ON workspace_share_tokens(workspace_id);

-- Lock down public policies (RPC-only access)
DROP POLICY IF EXISTS public_read_workspaces ON workspaces;
DROP POLICY IF EXISTS public_read_settings ON settings;
DROP POLICY IF EXISTS public_read_materials ON materials;
DROP POLICY IF EXISTS public_read_projects ON projects;
DROP POLICY IF EXISTS public_read_project_materials ON project_materials;

DROP POLICY IF EXISTS public_insert_workspaces ON workspaces;
DROP POLICY IF EXISTS public_update_workspaces ON workspaces;
DROP POLICY IF EXISTS public_insert_settings ON settings;
DROP POLICY IF EXISTS public_update_settings ON settings;
DROP POLICY IF EXISTS public_insert_materials ON materials;
DROP POLICY IF EXISTS public_update_materials ON materials;
DROP POLICY IF EXISTS public_delete_materials ON materials;
DROP POLICY IF EXISTS public_insert_projects ON projects;
DROP POLICY IF EXISTS public_update_projects ON projects;
DROP POLICY IF EXISTS public_delete_projects ON projects;
DROP POLICY IF EXISTS public_insert_project_materials ON project_materials;
DROP POLICY IF EXISTS public_update_project_materials ON project_materials;
DROP POLICY IF EXISTS public_delete_project_materials ON project_materials;

-- Generate and store a new share token (hashed at rest)
CREATE OR REPLACE FUNCTION create_workspace_share_token(
  p_workspace_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_hash TEXT;
BEGIN
  LOOP
    v_token := 'pmc_' || encode(gen_random_bytes(32), 'hex');
    v_hash := encode(digest(v_token, 'sha256'), 'hex');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM workspace_share_tokens WHERE token_hash = v_hash
    );
  END LOOP;

  INSERT INTO workspace_share_tokens (workspace_id, token_hash)
  VALUES (p_workspace_id, v_hash);

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill share tokens for existing workspaces
DO $$
DECLARE
  workspace_row RECORD;
BEGIN
  FOR workspace_row IN
    SELECT id FROM workspaces
    WHERE NOT EXISTS (
      SELECT 1 FROM workspace_share_tokens WHERE workspace_id = workspaces.id
    )
  LOOP
    PERFORM create_workspace_share_token(workspace_row.id);
  END LOOP;
END;
$$;

-- Create a new workspace and return its id, short name, and share token
DROP FUNCTION IF EXISTS create_workspace(TEXT);
CREATE OR REPLACE FUNCTION create_workspace(
  p_passphrase TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_short_name TEXT;
  v_share_token TEXT;
BEGIN
  INSERT INTO workspaces (passphrase_hash)
  VALUES (
    CASE WHEN p_passphrase IS NOT NULL AND p_passphrase != ''
         THEN crypt(p_passphrase, gen_salt('bf'))
         ELSE NULL
    END
  )
  RETURNING id, short_name INTO v_workspace_id, v_short_name;

  INSERT INTO settings (workspace_id) VALUES (v_workspace_id);

  v_share_token := create_workspace_share_token(v_workspace_id);

  RETURN jsonb_build_object(
    'id', v_workspace_id,
    'short_name', v_short_name,
    'share_token', v_share_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify passphrase for a workspace
CREATE OR REPLACE FUNCTION verify_passphrase(
  p_workspace_id UUID,
  p_passphrase TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT passphrase_hash INTO v_hash FROM workspaces WHERE id = p_workspace_id;
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_hash = crypt(p_passphrase, v_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Resolve a share token to workspace metadata
CREATE OR REPLACE FUNCTION resolve_workspace_token(
  p_token TEXT
) RETURNS TABLE (workspace_id UUID, short_name TEXT) AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RETURN;
  END IF;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  IF EXISTS (
    SELECT 1 FROM workspace_share_tokens
    WHERE token_hash = v_hash AND revoked_at IS NULL
  ) THEN
    UPDATE workspace_share_tokens
    SET last_used_at = NOW()
    WHERE token_hash = v_hash AND revoked_at IS NULL;

    RETURN QUERY
      SELECT w.id, w.short_name
      FROM workspace_share_tokens t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.token_hash = v_hash AND t.revoked_at IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fetch workspace data using a share token (view-only)
CREATE OR REPLACE FUNCTION fetch_workspace_data(
  p_token TEXT
) RETURNS JSONB AS $$
DECLARE
  v_workspace_id UUID;
  v_short_name TEXT;
  v_settings JSONB;
  v_materials JSONB;
  v_projects JSONB;
  v_project_materials JSONB;
BEGIN
  SELECT workspace_id, short_name INTO v_workspace_id, v_short_name
  FROM resolve_workspace_token(p_token);

  IF v_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(s.*) - 'workspace_id' INTO v_settings
  FROM settings s WHERE s.workspace_id = v_workspace_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) - 'workspace_id'), '[]'::jsonb)
  INTO v_materials
  FROM materials m WHERE m.workspace_id = v_workspace_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'workspace_id'), '[]'::jsonb)
  INTO v_projects
  FROM projects p WHERE p.workspace_id = v_workspace_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(pm)), '[]'::jsonb)
  INTO v_project_materials
  FROM project_materials pm
  WHERE pm.project_id IN (
    SELECT id FROM projects WHERE workspace_id = v_workspace_id
  );

  RETURN jsonb_build_object(
    'workspace_id', v_workspace_id,
    'short_name', v_short_name,
    'settings', v_settings,
    'materials', v_materials,
    'projects', v_projects,
    'project_materials', v_project_materials
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sync all workspace data (requires passphrase)
CREATE OR REPLACE FUNCTION sync_workspace_data(
  p_workspace_id UUID,
  p_passphrase TEXT,
  p_state JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_workspace_id IS NULL OR p_passphrase IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT passphrase_hash INTO v_hash FROM workspaces WHERE id = p_workspace_id;
  IF v_hash IS NULL OR v_hash != crypt(p_passphrase, v_hash) THEN
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
      notes
    FROM jsonb_to_recordset(COALESCE(p_state->'materials', '[]'::jsonb))
      AS x(id UUID, name TEXT, "unitCost" DECIMAL, unit TEXT, notes TEXT)
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
      notes
    FROM jsonb_to_recordset(COALESCE(p_state->'materials', '[]'::jsonb))
      AS x(id UUID, name TEXT, "unitCost" DECIMAL, unit TEXT, notes TEXT)
  )
  INSERT INTO materials (id, workspace_id, name, unit_cost, unit, notes)
  SELECT id, p_workspace_id, name, unit_cost, unit, notes
  FROM incoming_materials
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    unit_cost = EXCLUDED.unit_cost,
    unit = EXCLUDED.unit,
    notes = EXCLUDED.notes
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant RPC access to anon role
GRANT EXECUTE ON FUNCTION create_workspace(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_passphrase(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION resolve_workspace_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION fetch_workspace_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sync_workspace_data(UUID, TEXT, JSONB) TO anon;

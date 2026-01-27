-- Add cost field to materials for tracking crafter's material costs
-- This is separate from unit_cost (price charged to customers)

-- Add cost column to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);

-- Update fetch_workspace_data to return cost field
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Update sync_workspace_data to handle cost field
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
      notes,
      cost
    FROM jsonb_to_recordset(COALESCE(p_state->'materials', '[]'::jsonb))
      AS x(id UUID, name TEXT, "unitCost" DECIMAL, unit TEXT, notes TEXT, cost DECIMAL)
  )
  DELETE FROM materials m
  WHERE m.workspace_id = p_workspace_id
    AND NOT EXISTS (SELECT 1 FROM incoming_materials im WHERE im.id = m.id);

  -- Upsert materials (now including cost)
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

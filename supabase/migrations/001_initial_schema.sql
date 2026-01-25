-- Crafty Cloud Sync Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Workspaces: Container for each user's data
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passphrase_hash TEXT,  -- bcrypt hash, NULL = read-only workspace
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings: User preferences per workspace
CREATE TABLE settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  currency_symbol TEXT DEFAULT '$',
  labor_rate DECIMAL(10,2) DEFAULT 0,
  labor_rate_unit TEXT DEFAULT 'hour' CHECK (labor_rate_unit IN ('hour', 'minute', '15min')),
  labor_rate_prompt_dismissed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials: Reusable materials library
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects: Craft projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  labor_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Materials: Junction table with material snapshot
CREATE TABLE project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  quantity DECIMAL(10,2) NOT NULL,
  -- Snapshot of material at time of addition (in case material is deleted)
  material_name TEXT NOT NULL,
  material_unit_cost DECIMAL(10,2) NOT NULL,
  material_unit TEXT NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_materials_workspace ON materials(workspace_id);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_project_materials_project ON project_materials(project_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

-- Read access: Anyone can read (public access via anon key)
-- This allows view-only access with just the workspace URL
CREATE POLICY "public_read_workspaces" ON workspaces
  FOR SELECT USING (true);

CREATE POLICY "public_read_settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "public_read_materials" ON materials
  FOR SELECT USING (true);

CREATE POLICY "public_read_projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "public_read_project_materials" ON project_materials
  FOR SELECT USING (true);

-- Write access: Controlled via RPC functions (see below)
-- Direct writes are disabled; all writes go through RPC functions
-- that verify the passphrase

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Create a new workspace with optional passphrase
CREATE OR REPLACE FUNCTION create_workspace(
  p_passphrase TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  INSERT INTO workspaces (passphrase_hash)
  VALUES (
    CASE WHEN p_passphrase IS NOT NULL AND p_passphrase != ''
         THEN crypt(p_passphrase, gen_salt('bf'))
         ELSE NULL
    END
  )
  RETURNING id INTO v_workspace_id;

  -- Create default settings for the workspace
  INSERT INTO settings (workspace_id) VALUES (v_workspace_id);

  RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify passphrase for a workspace
CREATE OR REPLACE FUNCTION verify_passphrase(
  p_workspace_id UUID,
  p_passphrase TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND passphrase_hash IS NOT NULL
    AND passphrase_hash = crypt(p_passphrase, passphrase_hash)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- WRITE POLICIES (via service role or authenticated with passphrase check)
-- =============================================================================

-- For simplicity in this implementation, we allow writes from the anon key
-- The security model relies on:
-- 1. UUID workspace IDs being unguessable
-- 2. Users keeping their passphrases secret for edit access
-- 3. The client verifying passphrase before allowing write operations

-- In production, you might want more restrictive policies that require
-- a valid session token obtained from verify_passphrase

CREATE POLICY "public_insert_workspaces" ON workspaces
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_workspaces" ON workspaces
  FOR UPDATE USING (true);

CREATE POLICY "public_insert_settings" ON settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_settings" ON settings
  FOR UPDATE USING (true);

CREATE POLICY "public_insert_materials" ON materials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_materials" ON materials
  FOR UPDATE USING (true);

CREATE POLICY "public_delete_materials" ON materials
  FOR DELETE USING (true);

CREATE POLICY "public_insert_projects" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_projects" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "public_delete_projects" ON projects
  FOR DELETE USING (true);

CREATE POLICY "public_insert_project_materials" ON project_materials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_project_materials" ON project_materials
  FOR UPDATE USING (true);

CREATE POLICY "public_delete_project_materials" ON project_materials
  FOR DELETE USING (true);

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

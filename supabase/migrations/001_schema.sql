-- PriceMyCraft schema (clean rebuild)
-- Depends on: auth.users (Supabase Auth), profiles table (created by auth agent)
-- Extensions: pgcrypto (for gen_random_uuid)

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

--------------------------------------------------------------------------------
-- Extend profiles (base table created by auth agent)
--------------------------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

--------------------------------------------------------------------------------
-- Workspaces
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON workspaces FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "public_read" ON workspaces FOR SELECT USING (is_public = true);

--------------------------------------------------------------------------------
-- Labor types
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS labor_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate DECIMAL NOT NULL,
  rate_unit TEXT NOT NULL DEFAULT 'hour',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE labor_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON labor_types FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "public_read" ON labor_types FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE is_public = true));

--------------------------------------------------------------------------------
-- Settings (per workspace)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  currency_symbol TEXT DEFAULT '$',
  currency_code TEXT DEFAULT 'USD',
  default_labor_type_id UUID REFERENCES labor_types(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON settings FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

--------------------------------------------------------------------------------
-- Materials
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_cost DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  cost DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON materials FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "public_read" ON materials FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE is_public = true));

--------------------------------------------------------------------------------
-- Projects
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  labor_minutes INTEGER DEFAULT 0,
  labor_type_id UUID REFERENCES labor_types(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT projects_owner_slug_unique UNIQUE (owner_id, slug),
  CONSTRAINT projects_slug_not_reserved CHECK (slug NOT IN ('print', 'edit', 'settings'))
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);

-- Trigger: auto-set owner_id from workspace on insert/update
CREATE OR REPLACE FUNCTION set_project_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT owner_id INTO NEW.owner_id FROM workspaces WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_project_owner_id
  BEFORE INSERT OR UPDATE OF workspace_id ON projects
  FOR EACH ROW EXECUTE FUNCTION set_project_owner_id();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON projects FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "public_read" ON projects FOR SELECT USING (
  is_public = true AND workspace_id IN (SELECT id FROM workspaces WHERE is_public = true)
);

--------------------------------------------------------------------------------
-- Project materials (junction table with snapshot)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  quantity DECIMAL NOT NULL DEFAULT 1,
  material_name TEXT NOT NULL,
  material_unit_cost DECIMAL NOT NULL,
  material_unit TEXT NOT NULL
);

ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON project_materials FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY "public_read" ON project_materials FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE is_public = true));

--------------------------------------------------------------------------------
-- Project photos
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON project_photos FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY "public_read" ON project_photos FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE is_public = true));

--------------------------------------------------------------------------------
-- Auto-update updated_at triggers
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_labor_types_updated_at
  BEFORE UPDATE ON labor_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

--------------------------------------------------------------------------------
-- Supabase Storage: project photos bucket
--------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users_upload_own_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_update_own_photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_delete_own_photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "public_read_photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-photos');

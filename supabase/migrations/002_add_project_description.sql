-- Add description column to projects table
ALTER TABLE IF EXISTS projects
ADD COLUMN IF NOT EXISTS description TEXT;

-- No default needed since it's nullable
-- Existing projects will have NULL descriptions

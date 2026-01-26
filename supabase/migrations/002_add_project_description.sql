-- Add description column to projects table
ALTER TABLE projects
ADD COLUMN description TEXT;

-- No default needed since it's nullable
-- Existing projects will have NULL descriptions

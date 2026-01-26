-- Add human-friendly short names for workspaces

ALTER TABLE IF EXISTS workspaces ADD COLUMN IF NOT EXISTS short_name TEXT;

CREATE OR REPLACE FUNCTION generate_workspace_short_name()
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY[
    'amber','airy','brave','bright','brisk','calm','clever','cozy','crisp','crafty',
    'eager','elegant','fancy','final','fresh','friendly','frosty','gentle','glossy','golden',
    'happy','ivory','jade','keen','lucky','mellow','mighty','navy','neat','noble',
    'olive','onyx','peach','pearl','plain','proud','quick','quiet','rapid','rustic',
    'sable','scarlet','shiny','simple','silver','soft','solid','spry','steady','sturdy',
    'sunny','swift','tidy','teal','umber','urban','vivid','warm','witty','zesty'
  ];
  nouns TEXT[] := ARRAY[
    'anvil','basket','birdhouse','bracket','button','cabinet','canvas','caddy','chisel','clamp',
    'cogwheel','crate','drawer','fixture','forge','frame','gadget','gear','gearbox','glue',
    'handle','hinge','jig','kiln','lantern','lathe','loom','magnet','mold','notebook',
    'palette','pattern','pegboard','pencil','pliers','rasp','ribbon','router','sander','sawhorse',
    'shelf','sketch','sprocket','stitch','studio','template','thimble','thread','toolbox','trowel',
    'vise','widget','workbench','workshop','wrench','yarn','needle','tassel'
  ];
  candidate TEXT;
  tries INT := 0;
BEGIN
  LOOP
    candidate := adjectives[1 + (random() * array_length(adjectives, 1))::int] || '-' ||
      nouns[1 + (random() * array_length(nouns, 1))::int];
    tries := tries + 1;

    IF tries >= 10 THEN
      candidate := candidate || '-' || substr(gen_random_uuid()::text, 1, 4);
      tries := 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE short_name = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  workspace_row RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'short_name'
  ) THEN
    FOR workspace_row IN SELECT id FROM workspaces WHERE short_name IS NULL LOOP
      UPDATE workspaces
      SET short_name = generate_workspace_short_name()
      WHERE id = workspace_row.id;
    END LOOP;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'short_name'
  ) THEN
    ALTER TABLE workspaces ALTER COLUMN short_name SET DEFAULT generate_workspace_short_name();
    ALTER TABLE workspaces ALTER COLUMN short_name SET NOT NULL;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_short_name_unique ON workspaces(short_name);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'short_name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'workspaces_short_name_format'
      AND n.nspname = 'public'
      AND t.relname = 'workspaces'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_short_name_format
      CHECK (short_name ~ '^[a-z0-9]+(-[a-z0-9]+)+$');
  END IF;
END;
$$;

ALTER TABLE palette.palette_plays
  ADD COLUMN IF NOT EXISTS accepts_permissions BOOLEAN NOT NULL DEFAULT TRUE;

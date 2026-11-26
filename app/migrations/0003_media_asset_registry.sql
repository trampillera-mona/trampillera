CREATE TABLE IF NOT EXISTS media_assets (
  asset_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  public_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  sha256 TEXT,
  rights_holder TEXT NOT NULL DEFAULT 'TRAMPILLERA MEDIA',
  source_credit TEXT NOT NULL DEFAULT '',
  license_label TEXT NOT NULL DEFAULT 'Permission required',
  watermark_state TEXT NOT NULL DEFAULT 'OVERLAY_ONLY'
    CHECK (watermark_state IN ('OVERLAY_ONLY','EMBEDDED','PENDING','NOT_APPLICABLE')),
  protection_state TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (protection_state IN ('ACTIVE','RESTRICTED','RETIRED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$')
);
CREATE INDEX IF NOT EXISTS media_assets_state_idx ON media_assets(protection_state, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_rights_idx ON media_assets(rights_holder);

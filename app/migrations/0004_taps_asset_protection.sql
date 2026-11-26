-- TAPS: durable asset provenance, processing state, and immutable version history.
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS pipeline_state TEXT NOT NULL DEFAULT 'LEGACY_PUBLIC'
    CHECK (pipeline_state IN ('LEGACY_PUBLIC','RECEIVED','SCANNED','PROCESSING','VERIFIED','FAILED')),
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_object_key TEXT,
  ADD COLUMN IF NOT EXISTS derivative_object_key TEXT,
  ADD COLUMN IF NOT EXISTS original_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS derivative_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS original_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS derivative_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE media_assets ALTER COLUMN public_path DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_original_object_key_idx
  ON media_assets(original_object_key) WHERE original_object_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_derivative_object_key_idx
  ON media_assets(derivative_object_key) WHERE derivative_object_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_assets_pipeline_state_idx
  ON media_assets(pipeline_state, created_at DESC);

CREATE TABLE IF NOT EXISTS media_asset_versions (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES media_assets(asset_id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  original_object_key TEXT NOT NULL,
  derivative_object_key TEXT,
  original_sha256 TEXT NOT NULL CHECK (original_sha256 ~ '^[a-f0-9]{64}$'),
  derivative_sha256 TEXT CHECK (derivative_sha256 IS NULL OR derivative_sha256 ~ '^[a-f0-9]{64}$'),
  original_bytes BIGINT NOT NULL CHECK (original_bytes > 0),
  derivative_bytes BIGINT CHECK (derivative_bytes IS NULL OR derivative_bytes > 0),
  mime_type TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  watermark_profile TEXT NOT NULL DEFAULT 'TRAMPILLERA_VISIBLE_V1',
  pipeline_state TEXT NOT NULL CHECK (pipeline_state IN ('RECEIVED','SCANNED','PROCESSING','VERIFIED','FAILED')),
  verification_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, version_number)
);
CREATE INDEX IF NOT EXISTS media_asset_versions_asset_idx
  ON media_asset_versions(asset_id, version_number DESC);

CREATE TABLE IF NOT EXISTS media_asset_access_events (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES media_assets(asset_id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('PREVIEW','DOWNLOAD','EXPORT','RIGHTS_CHANGE','RESTRICTION_CHANGE','VERIFICATION')),
  actor TEXT NOT NULL DEFAULT 'admin',
  request_id TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS media_asset_access_events_asset_idx
  ON media_asset_access_events(asset_id, created_at DESC);

-- Account security factor foundation. No existing account/session data is modified.
CREATE TABLE account_security_settings (
  account_type TEXT NOT NULL CHECK (account_type IN ('admin','employee')),
  account_id TEXT NOT NULL,
  security_profile TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (security_profile IN ('STANDARD','ENHANCED','STRICT')),
  policy_version INTEGER NOT NULL DEFAULT 1 CHECK (policy_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_type, account_id)
);

CREATE TABLE account_security_factors (
  id BIGSERIAL PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('admin','employee')),
  account_id TEXT NOT NULL,
  factor_type TEXT NOT NULL CHECK (factor_type IN ('TOTP','VSC')),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','REVOKED')),
  secret_ciphertext TEXT,
  verifier TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CHECK (
    (factor_type = 'TOTP' AND secret_ciphertext IS NOT NULL AND verifier IS NULL)
    OR
    (factor_type = 'VSC' AND verifier IS NOT NULL AND secret_ciphertext IS NULL)
  )
);

CREATE INDEX account_security_factors_account_idx
  ON account_security_factors(account_type, account_id, factor_type, status);

CREATE UNIQUE INDEX account_security_factors_one_active_idx
  ON account_security_factors(account_type, account_id, factor_type)
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX account_security_factors_one_pending_idx
  ON account_security_factors(account_type, account_id, factor_type)
  WHERE status = 'PENDING';

COMMENT ON TABLE account_security_settings IS
  'Per-account optional security preferences; not an authorization or age-verification record.';
COMMENT ON TABLE account_security_factors IS
  'Encrypted TOTP secrets and one-way VSC verifiers. Never store plaintext factor secrets.';

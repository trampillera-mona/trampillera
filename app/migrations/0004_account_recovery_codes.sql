-- One-time recovery credentials. Codes are stored only as salted scrypt verifiers.
CREATE TABLE account_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('admin','employee')),
  account_id TEXT NOT NULL,
  selector CHAR(16) NOT NULL CHECK (selector ~ '^[A-F0-9]{16}$'),
  verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (account_type, account_id, selector)
);

CREATE INDEX account_recovery_codes_account_idx
  ON account_recovery_codes(account_type, account_id, created_at DESC);

CREATE INDEX account_recovery_codes_unused_idx
  ON account_recovery_codes(account_type, account_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

COMMENT ON TABLE account_recovery_codes IS
  'Single-use recovery code verifiers and non-secret selectors only; plaintext secrets are displayed once and never stored.';

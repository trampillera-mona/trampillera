-- One-time recovery credentials. Codes are stored only as salted scrypt verifiers.
CREATE TABLE account_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('admin','employee')),
  account_id TEXT NOT NULL,
  verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX account_recovery_codes_account_idx
  ON account_recovery_codes(account_type, account_id, created_at DESC);

CREATE INDEX account_recovery_codes_unused_idx
  ON account_recovery_codes(account_type, account_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

COMMENT ON TABLE account_recovery_codes IS
  'Single-use recovery code verifiers only; plaintext codes are displayed once and never stored.';

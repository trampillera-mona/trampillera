-- Require a fresh independent authenticator after account recovery.
ALTER TABLE account_security_settings
  ADD COLUMN recovery_reenroll_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN account_security_settings.recovery_reenroll_required IS
  'When true, authenticated account sessions are restricted to password setup and security-factor re-enrollment until TOTP is confirmed.';

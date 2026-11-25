-- Track the last accepted TOTP time-step to reject replay within the validity window.
ALTER TABLE account_security_factors
  ADD COLUMN last_totp_counter BIGINT;

ALTER TABLE account_security_factors
  ADD CONSTRAINT account_security_factors_last_totp_counter_nonnegative
  CHECK (last_totp_counter IS NULL OR last_totp_counter >= 0);

COMMENT ON COLUMN account_security_factors.last_totp_counter IS
  'Highest accepted TOTP time-step counter. A counter may be consumed only once per factor.';

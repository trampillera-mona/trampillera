-- TRAMPILLERA Business Control Plane foundation.
-- Public submissions are intake records only; no email, payment, or external outreach is triggered.
CREATE TABLE IF NOT EXISTS business_inquiries (
  id BIGSERIAL PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL CHECK (request_type IN ('SERVICE','PRODUCT','PARTNERSHIP','OTHER')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'PUBLIC_PORTAL',
  stage TEXT NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW','REVIEWING','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST')),
  estimated_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR','USD','RSD')),
  next_action_at TIMESTAMPTZ,
  internal_notes TEXT NOT NULL DEFAULT '',
  consent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS business_inquiries_stage_created_idx
  ON business_inquiries(stage, created_at DESC);
CREATE INDEX IF NOT EXISTS business_inquiries_email_idx
  ON business_inquiries(contact_email, created_at DESC);

CREATE TABLE IF NOT EXISTS business_partner_applications (
  id BIGSERIAL PRIMARY KEY,
  organization_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  capabilities TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','REVIEWING','APPROVED','REJECTED')),
  internal_notes TEXT NOT NULL DEFAULT '',
  consent_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS business_partner_applications_status_created_idx
  ON business_partner_applications(status, created_at DESC);

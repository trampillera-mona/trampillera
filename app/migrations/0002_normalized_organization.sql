-- 0002: introduce normalized organization entities without guessing legacy mappings.
-- Existing employees.department/job_title remain untouched and no assignments are inferred.

CREATE TABLE org_units (
  id BIGSERIAL PRIMARY KEY,
  unit_key TEXT NOT NULL UNIQUE
    CHECK (unit_key ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  unit_type TEXT NOT NULL
    CHECK (unit_type IN ('COMPANY','DIVISION','DEPARTMENT','TEAM','PROJECT_GROUP','OTHER')),
  parent_unit_id BIGINT REFERENCES org_units(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX org_units_parent_idx ON org_units(parent_unit_id);
CREATE INDEX org_units_status_type_idx ON org_units(status, unit_type);

CREATE TABLE positions (
  id BIGSERIAL PRIMARY KEY,
  position_key TEXT NOT NULL UNIQUE
    CHECK (position_key ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX positions_status_title_idx ON positions(status, title);

CREATE TABLE employee_org_assignments (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  org_unit_id BIGINT NOT NULL REFERENCES org_units(id) ON DELETE RESTRICT,
  position_id BIGINT REFERENCES positions(id) ON DELETE RESTRICT,
  assignment_type TEXT NOT NULL DEFAULT 'PRIMARY'
    CHECK (assignment_type IN ('PRIMARY','SECONDARY','TEMPORARY')),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED','CANCELLED')),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE INDEX employee_org_assignments_employee_idx
  ON employee_org_assignments(employee_id, status, valid_from DESC);
CREATE INDEX employee_org_assignments_unit_idx
  ON employee_org_assignments(org_unit_id, status, valid_from DESC);
CREATE INDEX employee_org_assignments_position_idx
  ON employee_org_assignments(position_id)
  WHERE position_id IS NOT NULL;

-- Serialize hierarchy writes and reject self-parenting or ancestor cycles.
CREATE OR REPLACE FUNCTION trampillera_guard_org_unit_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cycle_found BOOLEAN := FALSE;
BEGIN
  PERFORM pg_advisory_xact_lock(742019, 2);

  IF NEW.parent_unit_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS NOT NULL AND NEW.parent_unit_id = NEW.id THEN
    RAISE EXCEPTION 'An organizational unit cannot be its own parent'
      USING ERRCODE = '23514';
  END IF;

  WITH RECURSIVE ancestor_chain(id, parent_unit_id) AS (
    SELECT id, parent_unit_id
      FROM org_units
      WHERE id = NEW.parent_unit_id
    UNION
    SELECT parent.id, parent.parent_unit_id
      FROM org_units AS parent
      JOIN ancestor_chain AS child ON parent.id = child.parent_unit_id
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestor_chain WHERE id = NEW.id
  ) INTO cycle_found;

  IF cycle_found THEN
    RAISE EXCEPTION 'Organizational unit hierarchy cycle detected'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER org_units_prevent_cycle
BEFORE INSERT OR UPDATE OF parent_unit_id ON org_units
FOR EACH ROW EXECUTE FUNCTION trampillera_guard_org_unit_cycle();

-- Serialize primary-assignment checks per employee and reject overlapping active periods.
CREATE OR REPLACE FUNCTION trampillera_guard_primary_org_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  overlap_found BOOLEAN := FALSE;
BEGIN
  IF NEW.assignment_type = 'PRIMARY' AND NEW.status = 'ACTIVE' THEN
    PERFORM pg_advisory_xact_lock(742019, NEW.employee_id);

    SELECT EXISTS (
      SELECT 1
        FROM employee_org_assignments AS existing
       WHERE existing.employee_id = NEW.employee_id
         AND existing.assignment_type = 'PRIMARY'
         AND existing.status = 'ACTIVE'
         AND existing.id IS DISTINCT FROM NEW.id
         AND daterange(existing.valid_from, existing.valid_until, '[]')
             && daterange(NEW.valid_from, NEW.valid_until, '[]')
    ) INTO overlap_found;

    IF overlap_found THEN
      RAISE EXCEPTION 'Overlapping active primary organizational assignment'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_org_assignments_prevent_primary_overlap
BEFORE INSERT OR UPDATE OF employee_id, assignment_type, valid_from, valid_until, status
ON employee_org_assignments
FOR EACH ROW EXECUTE FUNCTION trampillera_guard_primary_org_assignment();

COMMENT ON TABLE org_units IS
  'Normalized organizational units. Legacy employee department text is not auto-mapped.';
COMMENT ON TABLE positions IS
  'Normalized organizational positions; a position is not an authorization role.';
COMMENT ON TABLE employee_org_assignments IS
  'Effective-dated employee placements. Empty until each legacy mapping is explicitly reviewed.';

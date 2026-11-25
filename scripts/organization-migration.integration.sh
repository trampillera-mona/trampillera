#!/usr/bin/env bash
set -euo pipefail

employee_id="${1:?employee id is required}"

db() {
  docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1"' sh "$1"
}

db "INSERT INTO org_units(unit_key,name,unit_type) VALUES ('ci-root','CI Root','COMPANY') ON CONFLICT (unit_key) DO NOTHING"
db "INSERT INTO org_units(unit_key,name,unit_type,parent_unit_id) SELECT 'ci-child','CI Child','DEPARTMENT',id FROM org_units WHERE unit_key='ci-root' ON CONFLICT (unit_key) DO NOTHING"
db "INSERT INTO positions(position_key,title) VALUES ('ci-tester','CI Tester') ON CONFLICT (position_key) DO NOTHING"

if db "UPDATE org_units SET parent_unit_id=(SELECT id FROM org_units WHERE unit_key='ci-child') WHERE unit_key='ci-root'"; then
  echo "ERROR: hierarchy cycle guard accepted a cycle"
  exit 1
else
  echo "Verified: hierarchy cycle rejected"
fi

db "INSERT INTO employee_org_assignments(employee_id,org_unit_id,position_id,valid_from,valid_until,created_by) SELECT $employee_id,u.id,p.id,DATE '2026-01-01',DATE '2026-12-31','ci' FROM org_units u CROSS JOIN positions p WHERE u.unit_key='ci-root' AND p.position_key='ci-tester'"

if db "INSERT INTO employee_org_assignments(employee_id,org_unit_id,position_id,valid_from,valid_until,created_by) SELECT $employee_id,u.id,p.id,DATE '2026-06-01',DATE '2026-12-31','ci-duplicate' FROM org_units u CROSS JOIN positions p WHERE u.unit_key='ci-root' AND p.position_key='ci-tester'"; then
  echo "ERROR: overlapping primary assignment guard accepted a duplicate"
  exit 1
else
  echo "Verified: overlapping primary assignment rejected"
fi

db "SELECT CASE WHEN COUNT(*) = 1 THEN 'organization assignment verified' ELSE 1/0::text END FROM employee_org_assignments WHERE employee_id=$employee_id"

#!/usr/bin/env bash
set -euo pipefail

ADMIN_PASSWORD="ci-temporary-admin-password-123"
EMPLOYEE_EMAIL="ci-teammate-two@example.test"
EMPLOYEE_PASSWORD="ci-test-reset-password-789"
ADMIN_COOKIE="/tmp/psl-admin-cookies.txt"
EMPLOYEE_COOKIE="/tmp/psl-employee-cookies.txt"
ENROLL_JSON="/tmp/psl-enroll.json"

curl() { command curl -H 'Origin: http://127.0.0.1:3000' "$@"; }
totp_code() {
  node --input-type=module -e 'import { totpCode } from "./app/security/totp.js"; console.log(totpCode(process.argv[1]));' "$1"
}

echo "PSL integration: administrator enrollment and second-step login"
curl --fail --silent -c "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" http://127.0.0.1:3000/api/auth/login >/dev/null
curl --fail --silent -b "$ADMIN_COOKIE" -c "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d '{}' http://127.0.0.1:3000/api/auth/totp/enroll > "$ENROLL_JSON"
ADMIN_SECRET="$(jq -r '.secret' "$ENROLL_JSON")"
test -n "$ADMIN_SECRET" && test "$ADMIN_SECRET" != "null"
ADMIN_CODE="$(totp_code "$ADMIN_SECRET")"
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADMIN_CODE\"}" http://127.0.0.1:3000/api/auth/totp/confirm | jq -e '.enabled == true' >/dev/null
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d '{}' http://127.0.0.1:3000/api/auth/logout >/dev/null
ADMIN_LOGIN="$(curl --fail --silent -c "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" http://127.0.0.1:3000/api/auth/login)"
printf '%s' "$ADMIN_LOGIN" | jq -e '.requiresTotp == true and .authenticated == false' >/dev/null
ADMIN_CODE="$(totp_code "$ADMIN_SECRET")"
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADMIN_CODE\"}" http://127.0.0.1:3000/api/auth/totp/verify-login | jq -e '.authenticated == true and .role == "admin"' >/dev/null
ADMIN_CODE="$(totp_code "$ADMIN_SECRET")"
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\",\"code\":\"$ADMIN_CODE\"}" http://127.0.0.1:3000/api/auth/totp/disable | jq -e '.enabled == false' >/dev/null

echo "PSL integration: employee enrollment and second-step login"
curl --fail --silent -c "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMPLOYEE_EMAIL\",\"password\":\"$EMPLOYEE_PASSWORD\"}" http://127.0.0.1:3000/api/auth/employee-login >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -c "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d '{}' http://127.0.0.1:3000/api/auth/totp/enroll > "$ENROLL_JSON"
EMPLOYEE_SECRET="$(jq -r '.secret' "$ENROLL_JSON")"
test -n "$EMPLOYEE_SECRET" && test "$EMPLOYEE_SECRET" != "null"
EMPLOYEE_CODE="$(totp_code "$EMPLOYEE_SECRET")"
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$EMPLOYEE_CODE\"}" http://127.0.0.1:3000/api/auth/totp/confirm | jq -e '.enabled == true' >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d '{}' http://127.0.0.1:3000/api/auth/logout >/dev/null
EMPLOYEE_LOGIN="$(curl --fail --silent -c "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMPLOYEE_EMAIL\",\"password\":\"$EMPLOYEE_PASSWORD\"}" http://127.0.0.1:3000/api/auth/employee-login)"
printf '%s' "$EMPLOYEE_LOGIN" | jq -e '.requiresTotp == true and .authenticated == false' >/dev/null
EMPLOYEE_CODE="$(totp_code "$EMPLOYEE_SECRET")"
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$EMPLOYEE_CODE\"}" http://127.0.0.1:3000/api/auth/totp/verify-login | jq -e '.authenticated == true and .role == "employee"' >/dev/null
EMPLOYEE_CODE="$(totp_code "$EMPLOYEE_SECRET")"
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$EMPLOYEE_PASSWORD\",\"code\":\"$EMPLOYEE_CODE\"}" http://127.0.0.1:3000/api/auth/totp/disable | jq -e '.enabled == false' >/dev/null

rm -f "$ADMIN_COOKIE" "$EMPLOYEE_COOKIE" "$ENROLL_JSON"
echo "PSL integration: administrator and employee TOTP flows verified."

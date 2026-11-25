#!/usr/bin/env bash
set -euo pipefail

ADMIN_PASSWORD="\${1:?admin password required}"
EMPLOYEE_EMAIL="\${2:?employee email required}"
EMPLOYEE_PASSWORD="\${3:?employee password required}"
ADMIN_COOKIE="/tmp/psl-admin-cookie.txt"
EMPLOYEE_COOKIE="/tmp/psl-employee-cookie.txt"
TOTP_JSON="/tmp/psl-totp-enrollment.json"
VSC_SEQUENCE='["ember","sun","leaf","aqua","sky","indigo"]'

curl() { command curl -H 'Origin: http://127.0.0.1:3000' "$@"; }
totp_code() {
  node --input-type=module -e 'import { totpCode } from "./app/security/totp.js"; console.log(totpCode(process.argv[1]));' "$1"
}
cleanup() { rm -f "$ADMIN_COOKIE" "$EMPLOYEE_COOKIE" "$TOTP_JSON"; }
trap cleanup EXIT

echo "PSL integration: administrator VSC + TOTP combined sign-in"
curl --fail --silent -c "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" http://127.0.0.1:3000/api/auth/login >/dev/null
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\",\"sequence\":$VSC_SEQUENCE}" \
  http://127.0.0.1:3000/api/auth/vsc/enroll | jq -e '.pending == true' >/dev/null
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"sequence\":$VSC_SEQUENCE}" http://127.0.0.1:3000/api/auth/vsc/confirm | jq -e '.enabled == true' >/dev/null

curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" http://127.0.0.1:3000/api/auth/totp/enroll > "$TOTP_JSON"
ADMIN_TOTP_SECRET="$(jq -r '.secret' "$TOTP_JSON")"
test -n "$ADMIN_TOTP_SECRET" && test "$ADMIN_TOTP_SECRET" != "null"
ADMIN_TOTP_CODE="$(totp_code "$ADMIN_TOTP_SECRET")"
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADMIN_TOTP_CODE\"}" http://127.0.0.1:3000/api/auth/totp/confirm | jq -e '.enabled == true' >/dev/null

curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d '{}' http://127.0.0.1:3000/api/auth/logout >/dev/null
ADMIN_LOGIN="$(curl --fail --silent -c "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" http://127.0.0.1:3000/api/auth/login)"
printf '%s' "$ADMIN_LOGIN" | jq -e '.requiresVsc == true and .requiresTotp == false and .authenticated == false' >/dev/null
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"sequence\":$VSC_SEQUENCE}" http://127.0.0.1:3000/api/auth/vsc/verify-login | jq -e '.requiresTotp == true and .authenticated == false' >/dev/null
ADMIN_TOTP_CODE="$(totp_code "$ADMIN_TOTP_SECRET")"
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADMIN_TOTP_CODE\"}" http://127.0.0.1:3000/api/auth/totp/verify-login | jq -e '.authenticated == true and .role == "admin"' >/dev/null

ADMIN_TOTP_CODE="$(totp_code "$ADMIN_TOTP_SECRET")"
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\",\"code\":\"$ADMIN_TOTP_CODE\"}" \
  http://127.0.0.1:3000/api/auth/totp/disable | jq -e '.enabled == false' >/dev/null
curl --fail --silent -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\",\"sequence\":$VSC_SEQUENCE}" \
  http://127.0.0.1:3000/api/auth/vsc/disable | jq -e '.enabled == false' >/dev/null

echo "PSL integration: employee VSC enrollment and sign-in"
curl --fail --silent -c "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMPLOYEE_EMAIL\",\"password\":\"$EMPLOYEE_PASSWORD\"}" \
  http://127.0.0.1:3000/api/auth/employee-login | jq -e '.authenticated == true and .role == "employee"' >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$EMPLOYEE_PASSWORD\",\"sequence\":$VSC_SEQUENCE}" \
  http://127.0.0.1:3000/api/auth/vsc/enroll | jq -e '.pending == true' >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"sequence\":$VSC_SEQUENCE}" http://127.0.0.1:3000/api/auth/vsc/confirm | jq -e '.enabled == true' >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d '{}' http://127.0.0.1:3000/api/auth/logout >/dev/null
EMPLOYEE_LOGIN="$(curl --fail --silent -c "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMPLOYEE_EMAIL\",\"password\":\"$EMPLOYEE_PASSWORD\"}" \
  http://127.0.0.1:3000/api/auth/employee-login)"
printf '%s' "$EMPLOYEE_LOGIN" | jq -e '.requiresVsc == true and .authenticated == false' >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"sequence\":$VSC_SEQUENCE}" http://127.0.0.1:3000/api/auth/vsc/verify-login | jq -e '.authenticated == true and .role == "employee"' >/dev/null
curl --fail --silent -b "$EMPLOYEE_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"password\":\"$EMPLOYEE_PASSWORD\",\"sequence\":$VSC_SEQUENCE}" \
  http://127.0.0.1:3000/api/auth/vsc/disable | jq -e '.enabled == false' >/dev/null

echo "PSL integration: administrator combined VSC+TOTP and employee VSC flows passed."

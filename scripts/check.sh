#!/usr/bin/env sh
set -eu
node --check app/server.js
node scripts/verify-preservation.mjs
echo "Static verification passed. Runtime integration still requires Docker/PostgreSQL."

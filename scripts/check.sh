#!/usr/bin/env sh
set -eu
node --check app/server.js
node --check app/ai-provider.js
node --test scripts/ai-provider.test.mjs
node scripts/verify-preservation.mjs
echo "Static verification passed. Runtime integration still requires Docker/PostgreSQL."
node --test scripts/locale-voice.test.mjs

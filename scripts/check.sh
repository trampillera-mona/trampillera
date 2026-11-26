#!/usr/bin/env sh
set -eu
node --check app/server.js
node --check app/business.js
node --check app/ai-provider.js
node --check app/public/shared/trampillera-analytics.js
node --test scripts/ai-provider.test.mjs
node scripts/verify-preservation.mjs
node --test scripts/locale-voice.test.mjs
node --test scripts/analytics-growth.test.mjs
node --test scripts/business-pipeline.test.mjs
echo "Static verification passed. Runtime integration still requires Docker/PostgreSQL."

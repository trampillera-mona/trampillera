#!/usr/bin/env sh
set -eu
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
printf 'ADMIN_PASSWORD=%s\n' "$(openssl rand -base64 24 | tr -d '/+=')"
printf 'SESSION_SECRET=%s\n' "$(openssl rand -hex 48)"

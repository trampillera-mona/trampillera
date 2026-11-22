# Verification checklist

- [ ] `docker compose config` succeeds after `.env` is populated.
- [ ] `docker compose ps` reports both `db` and `app` healthy.
- [ ] `/api/health` returns `status: ok` and `database: connected`.
- [ ] `/` loads the full platform interface.
- [ ] `/control/` shows the administrator sign-in gate.
- [ ] Correct administrator password creates a session.
- [ ] Module registration persists after app restart.
- [ ] Module lifecycle transitions persist and appear in audit log.
- [ ] Connector and model-provider registration persist.
- [ ] AI endpoint returns an explicit configuration message when no provider key is configured.
- [ ] HTTPS is enabled at the production ingress.

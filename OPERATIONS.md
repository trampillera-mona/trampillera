# Operations

## Health

- `GET /ready`: process and PostgreSQL readiness.
- `GET /api/health`: database-aware service health.
- `GET /api/platform/status`: counts from the persistent registries.

## Backups

Create a logical PostgreSQL backup:

```sh
docker compose exec -T db pg_dump -U trampillera trampillera > trampillera-backup.sql
```

Restore into a maintenance window:

```sh
cat trampillera-backup.sql | docker compose exec -T db psql -U trampillera -d trampillera
```

## Updating

```sh
git pull
docker compose up -d --build
docker compose logs --tail=100 app
```

## Security

Use a reverse proxy with HTTPS, keep PostgreSQL on the private Docker network, rotate credentials after suspected exposure, and restrict administrative access at the network layer where possible.

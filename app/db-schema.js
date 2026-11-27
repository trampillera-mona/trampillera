export function resolveDatabaseSchema(raw = "public") {
  const schema = String(raw || "public").trim();
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
    throw new Error("DB_SCHEMA must be a lowercase PostgreSQL identifier (1–63 characters).");
  }
  return schema;
}

export function buildDatabaseSearchPath(schema) {
  const resolved = resolveDatabaseSchema(schema);
  return resolved === "public" ? undefined : resolved;
}

export async function ensureDatabaseSchema(pool, schema) {
  const resolved = resolveDatabaseSchema(schema);
  if (resolved === "public") return false;
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${resolved}"`);
  return true;
}

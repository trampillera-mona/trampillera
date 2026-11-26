import express from "express";
import { resolveAIProviderConfig, getAIProviderStatus, buildAIRequestBody, extractAIReply, extractAIUsage } from "./ai-provider.js";
import helmet from "helmet";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
import pg from "pg";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { runMigrations } from "./migrations.js";
import crypto from "node:crypto";
import path from "node:path";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const app = express();
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";
const APP_STARTED_AT = new Date();
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 14) throw new Error("Set ADMIN_PASSWORD to a unique password of at least 14 characters.");
if (!SESSION_SECRET || SESSION_SECRET.length < 32) throw new Error("Set SESSION_SECRET to a random value of at least 32 characters.");

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined
});
pool.on("error", (err) => {
  console.error(JSON.stringify({ level: "error", event: "postgres_idle_client_error", message: err.message }));
});

app.disable("x-powered-by");
// Render and production ingress sit behind one trusted reverse-proxy hop.
const trustProxy = process.env.TRUST_PROXY === "true" || (process.env.TRUST_PROXY !== "false" && NODE_ENV === "production");
app.set("trust proxy", trustProxy ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "media-src": ["'self'", "blob:", "https:"],
      "connect-src": ["'self'", "https:"],
      "frame-ancestors": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: "sameorigin" }
}));
// Allow microphone use in this origin, including the same-origin ITY CITY module iframes.
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "microphone=(self)");
  next();
});
app.use(express.json({ limit: "256kb" }));
app.use(cookieSession({
  name: "trampillera_session",
  keys: [SESSION_SECRET],
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.COOKIE_SECURE === "true",
  maxAge: 8 * 60 * 60 * 1000,
  path: "/"
}));

const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  const session = req.session;
  if (session?.authenticated === true) {
    const now = Date.now();
    const issuedAt = Number(session.issuedAt);
    const lastSeenAt = Number(session.lastSeenAt ?? session.issuedAt);
    const invalidClock = !Number.isFinite(issuedAt) || !Number.isFinite(lastSeenAt) || issuedAt > now + 60_000 || lastSeenAt > now + 60_000;
    if (invalidClock || now - issuedAt > SESSION_ABSOLUTE_MS || now - lastSeenAt > SESSION_IDLE_MS) {
      req.session = null;
    } else {
      session.lastSeenAt = now;
    }
  }
  next();
});

function sameOriginGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ error: "Cross-site state-changing requests are not allowed." });
  }
  const source = req.get("origin") || req.get("referer");
  if (!source) {
    return res.status(403).json({ error: "Request origin could not be verified." });
  }
  try {
    const expectedOrigin = `${req.protocol}://${req.get("host")}`;
    if (new URL(source).origin !== expectedOrigin) {
      return res.status(403).json({ error: "Request origin does not match this application." });
    }
  } catch {
    return res.status(403).json({ error: "Request origin is invalid." });
  }
  next();
}

app.use("/api", sameOriginGuard);
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false }));

const lifecycle = ["DISCOVERED", "INSTALLED", "CONFIGURED", "DISABLED"];
const MODULE_LIFECYCLE_TRANSITIONS = {
  DISCOVERED:["INSTALLED"],
  INSTALLED:["CONFIGURED"],
  CONFIGURED:["DISABLED"],
  DISABLED:["INSTALLED"]
};
const validKey = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,79}$/.test(v);
const clean = (v, max=500) => typeof v === "string" ? v.trim().slice(0,max) : "";
const asyncRoute = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_modules (
      key TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL DEFAULT '1.0.0',
      status TEXT NOT NULL DEFAULT 'DISCOVERED', description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS platform_connectors (
      key TEXT PRIMARY KEY, name TEXT NOT NULL, provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED', endpoint TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS model_providers (
      key TEXT PRIMARY KEY, name TEXT NOT NULL, org TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '', deployment TEXT NOT NULL DEFAULT 'CLOUD',
      modal TEXT NOT NULL DEFAULT '', spec TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'DISCOVERED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGSERIAL PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL,
      entity_key TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '',
      actor TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at DESC);
    CREATE TABLE IF NOT EXISTS admin_auth_state (
      singleton_id SMALLINT PRIMARY KEY CHECK (singleton_id = 1),
      auth_version INTEGER NOT NULL DEFAULT 1,
      password_fingerprint TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS employees (
      id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '', job_title TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL, auth_version INTEGER NOT NULL DEFAULT 1, active BOOLEAN NOT NULL DEFAULT TRUE,
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS team_missions (
      id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'TEAM', xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward BETWEEN 1 AND 5000),
      due_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
      created_by TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS mission_assignments (
      id BIGSERIAL PRIMARY KEY, mission_id BIGINT NOT NULL REFERENCES team_missions(id) ON DELETE CASCADE,
      employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','IN_PROGRESS','SUBMITTED','VERIFIED','REJECTED')),
      submission_note TEXT NOT NULL DEFAULT '', review_note TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, reviewed_by TEXT NOT NULL DEFAULT '',
      xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(mission_id, employee_id)
    );
    CREATE TABLE IF NOT EXISTS mission_messages (
      id BIGSERIAL PRIMARY KEY, mission_id BIGINT NOT NULL REFERENCES team_missions(id) ON DELETE CASCADE,
      employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS mission_assignments_employee_idx ON mission_assignments(employee_id,status);
    CREATE INDEX IF NOT EXISTS mission_assignments_status_idx ON mission_assignments(status,submitted_at DESC);
    CREATE INDEX IF NOT EXISTS mission_messages_mission_idx ON mission_messages(mission_id,created_at);
  `);
  await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1");

  await pool.query(
    "CREATE TABLE IF NOT EXISTS site_visitors (visitor_hash TEXT NOT NULL, visit_date DATE NOT NULL, first_campaign TEXT NOT NULL DEFAULT '', first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(visitor_hash, visit_date));" +
    "CREATE TABLE IF NOT EXISTS site_pageviews (id BIGSERIAL PRIMARY KEY, visitor_hash TEXT NOT NULL, path TEXT NOT NULL, source TEXT NOT NULL DEFAULT '', medium TEXT NOT NULL DEFAULT '', campaign TEXT NOT NULL DEFAULT '', referrer_host TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" +
    "CREATE INDEX IF NOT EXISTS site_pageviews_created_idx ON site_pageviews(created_at DESC);" +
    "CREATE INDEX IF NOT EXISTS site_pageviews_campaign_idx ON site_pageviews(campaign, created_at DESC);" +
    "CREATE TABLE IF NOT EXISTS growth_campaigns (id BIGSERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'OTHER', objective TEXT NOT NULL DEFAULT '', destination_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED','ARCHIVED')), budget NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(budget >= 0), created_by TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" +
    "CREATE TABLE IF NOT EXISTS growth_campaign_events (id BIGSERIAL PRIMARY KEY, campaign_id BIGINT NOT NULL REFERENCES growth_campaigns(id) ON DELETE CASCADE, event_type TEXT NOT NULL CHECK(event_type IN ('CLICK')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" +
    "CREATE INDEX IF NOT EXISTS growth_campaign_events_idx ON growth_campaign_events(campaign_id, created_at DESC);"
  );

  // Record the existing startup-created schema as the immutable legacy baseline.
  // All subsequent schema changes are applied through versioned SQL migrations.
  await runMigrations(pool);

  const adminFingerprint = crypto.createHmac("sha256", SESSION_SECRET).update(ADMIN_PASSWORD).digest("hex");
  const adminStateClient = await pool.connect();
  try {
    await adminStateClient.query("BEGIN");
    await adminStateClient.query(
      "INSERT INTO admin_auth_state(singleton_id,password_fingerprint) VALUES(1,$1) ON CONFLICT(singleton_id) DO NOTHING",
      [adminFingerprint]
    );
    const currentAdminState = await adminStateClient.query(
      "SELECT auth_version,password_fingerprint FROM admin_auth_state WHERE singleton_id=1 FOR UPDATE"
    );
    if (currentAdminState.rows[0].password_fingerprint !== adminFingerprint) {
      await adminStateClient.query(
        "UPDATE admin_auth_state SET auth_version=auth_version+1,password_fingerprint=$1,updated_at=NOW() WHERE singleton_id=1",
        [adminFingerprint]
      );
      await auditWithClient(adminStateClient,"ADMIN_CREDENTIAL_ROTATED","security","admin","Administrator password changed; previous sessions revoked","system");
    }
    await adminStateClient.query("COMMIT");
  } catch (err) {
    await adminStateClient.query("ROLLBACK");
    throw err;
  } finally {
    adminStateClient.release();
  }
  const count = await pool.query("SELECT COUNT(*)::int AS n FROM platform_modules");
  if (count.rows[0].n === 0) {
    await pool.query(
      `INSERT INTO platform_modules(key,name,version,status,description) VALUES
       ('media.library','Media Library','1.0.0','CONFIGURED','Asset catalogue and media metadata'),
       ('community.hub','Community Hub','0.8.0','INSTALLED','Audience and member workspace'),
       ('jarviser.core','JARVISER Core','0.6.0','DISCOVERED','Model and service orchestration dispatcher')
       ON CONFLICT DO NOTHING`
    );
  }
  await pool.query(
    "INSERT INTO platform_modules(key,name,version,status,description) VALUES('audience.growth','Audience Intelligence & Growth','1.0.0','INSTALLED','Consent-based audience analytics and tracked promotion campaigns') ON CONFLICT(key) DO NOTHING"
  );
  const connectors = await pool.query("SELECT COUNT(*)::int AS n FROM platform_connectors");
  if (connectors.rows[0].n === 0) {
    await pool.query(
      `INSERT INTO platform_connectors(key,name,provider,status,endpoint) VALUES
       ('storage.s3','Object Storage','S3-compatible','NOT_CONFIGURED',''),
       ('analytics.api','Analytics API','Custom REST','DISCONNECTED','')
       ON CONFLICT DO NOTHING`
    );
  }
  const models = await pool.query("SELECT COUNT(*)::int AS n FROM model_providers");
  if (models.rows[0].n === 0) {
    await pool.query(
      `INSERT INTO model_providers(key,name,org,region,deployment,modal,spec,status) VALUES
       ('qwen.model-studio','Qwen Model Studio','Alibaba Cloud','Cloud / workspace region','CLOUD','text','Qwen-compatible chat completions','DISCOVERED'),
       ('openai.gpt','OpenAI GPT provider','OpenAI','US / Cloud','CLOUD','text · vision','general reasoning · coding','DISCOVERED'),
       ('local.llama','Local LLM runtime','Local deployment','On-premise','LOCAL','text','offline inference','DISCOVERED')
       ON CONFLICT DO NOTHING`
    );
  }
  await pool.query(
    `INSERT INTO model_providers(key,name,org,region,deployment,modal,spec,status)
     VALUES('qwen.model-studio','Qwen Model Studio','Alibaba Cloud','Cloud / workspace region','CLOUD','text','Qwen-compatible chat completions','DISCOVERED')
     ON CONFLICT(key) DO NOTHING`
  );
}
async function audit(action, type, key="", details="", actor="admin") {
  await pool.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES($1,$2,$3,$4,$5)", [action,type,key,details,actor]);
}
async function auditWithClient(client, action, type, key="", details="", actor="admin") {
  await client.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES($1,$2,$3,$4,$5)", [action,type,key,details,actor]);
}
async function requireAdmin(req,res,next) {
  if (req.session?.role !== "admin" || !Number.isSafeInteger(Number(req.session.adminAuthVersion))) {
    req.session = null;
    return res.status(401).json({ error: "Administrator session is no longer valid. Sign in again." });
  }
  try {
    const r = await pool.query("SELECT auth_version FROM admin_auth_state WHERE singleton_id=1");
    if (!r.rowCount || Number(req.session.adminAuthVersion) !== Number(r.rows[0].auth_version)) {
      req.session = null;
      return res.status(401).json({ error: "Administrator session is no longer valid. Sign in again." });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}
async function verifyEmployeeSession(req,res,next,allowPasswordChange=false) {
  if (req.session?.authenticated !== true || req.session?.role !== "employee" || !req.session?.employeeId) {
    return res.status(403).json({ error: "Employee session required." });
  }
  const r=await pool.query("SELECT active,must_change_password,auth_version FROM employees WHERE id=$1",[req.session.employeeId]);
  if(!r.rowCount || !r.rows[0].active || Number(req.session.authVersion)!==Number(r.rows[0].auth_version)) {
    req.session=null;
    return res.status(401).json({ error: "Employee session is no longer valid. Sign in again." });
  }
  if(!allowPasswordChange && r.rows[0].must_change_password) {
    return res.status(403).json({ error: "Change your temporary password before using the team workspace.", code: "PASSWORD_CHANGE_REQUIRED" });
  }
  next();
}
const requireEmployee = (req,res,next) => verifyEmployeeSession(req,res,next,false);
const requireEmployeeSetup = (req,res,next) => verifyEmployeeSession(req,res,next,true);
function passwordHash(password) {
  const salt=crypto.randomBytes(16).toString("hex");
  const hash=crypto.scryptSync(password,salt,64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
function passwordMatches(password,stored) {
  const [scheme,salt,expectedHex]=String(stored||"").split("$");
  if(scheme!=="scrypt"||!salt||!expectedHex) return false;
  const expected=Buffer.from(expectedHex,"hex");
  const supplied=crypto.scryptSync(password,salt,expected.length);
  return expected.length===supplied.length && crypto.timingSafeEqual(expected,supplied);
}
function requireAuth(req,res,next) {
  if (req.session?.authenticated === true) return next();
  return res.status(401).json({ error: "Authentication required." });
}
function validateBody(fields) {
  return (req,res,next) => {
    for (const [name,max] of Object.entries(fields)) {
      if (typeof req.body?.[name] !== "string" || req.body[name].trim().length === 0 || req.body[name].length > max) {
        return res.status(400).json({ error: `Invalid or missing field: ${name}` });
      }
    }
    next();
  };
}

app.get("/api/health", asyncRoute(async (_req,res) => {
  await pool.query("SELECT 1");
  res.json({ status:"ok", service:"trampillera-unified", database:"connected", timestamp:new Date().toISOString() });
}));
app.get("/api/platform/status", asyncRoute(async (_req,res) => {
  const [m,c,p] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS n FROM platform_modules"),
    pool.query("SELECT COUNT(*)::int AS n FROM platform_connectors"),
    pool.query("SELECT COUNT(*)::int AS n FROM model_providers")
  ]);
  res.json({
    status:"available",
    scope:"application_and_postgresql_registry",
    modules:m.rows[0].n,
    connectors:c.rows[0].n,
    modelProviders:p.rows[0].n,
    controlPlane:"available",
    externalIntegrations:"UNKNOWN",
    connectorConnectivity:"UNKNOWN",
    providerConnectivity:"UNKNOWN"
  });
}));
app.get("/api/modules", asyncRoute(async (_req,res) => {
  const result = await pool.query("SELECT key,name,version,status,description FROM platform_modules ORDER BY key");
  res.json({ items:result.rows });
}));
app.get("/api/auth/diagnostics", (req,res) => {
  res.set("Cache-Control", "no-store");
  const cookieHeader = req.headers.cookie || "";
  const sessionCookieReceived = cookieHeader.split(";").some(part => part.trim().startsWith("trampillera_session="));
  res.json({
    timestamp: new Date().toISOString(),
    request: {
      protocol: req.protocol,
      secure: req.secure,
      host: req.get("host") || null
    },
    session: {
      cookieReceived: sessionCookieReceived,
      authenticated: req.session?.authenticated === true
    },
    configuration: {
      trustProxy: trustProxy ? "enabled" : "disabled",
      cookieSecure: process.env.COOKIE_SECURE === "true",
      cookieSameSite: "strict",
      cookiePath: "/"
    }
  });
});
app.post("/api/auth/login", asyncRoute(async (req,res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const expected = Buffer.from(ADMIN_PASSWORD);
  const supplied = Buffer.from(password);
  const ok = expected.length === supplied.length && crypto.timingSafeEqual(expected,supplied);
  if (!ok) return res.status(401).json({ error:"Invalid administrator password." });
  const authState = await pool.query("SELECT auth_version FROM admin_auth_state WHERE singleton_id=1");
  if (!authState.rowCount) return res.status(503).json({ error:"Administrator authentication state is unavailable." });
  const now=Date.now();
  req.session = { authenticated:true, role:"admin", adminAuthVersion:Number(authState.rows[0].auth_version), actor:"admin", issuedAt:now, lastSeenAt:now };
  await audit("AUTH_LOGIN","security","admin","Administrator session created");
  res.json({ authenticated:true });
}));
app.get("/api/auth/me", asyncRoute(async (req,res) => {
  if(req.session?.authenticated !== true) return res.json({authenticated:false});
  if(req.session.role === "employee" && req.session.employeeId) {
    const r=await pool.query("SELECT id,email,display_name,department,job_title,must_change_password,active,auth_version FROM employees WHERE id=$1",[req.session.employeeId]);
    if(!r.rowCount || !r.rows[0].active || Number(req.session.authVersion)!==Number(r.rows[0].auth_version)) { req.session=null; return res.json({authenticated:false}); }
    const e=r.rows[0];
    return res.json({authenticated:true,role:"employee",employee:{id:e.id,email:e.email,name:e.display_name,department:e.department,jobTitle:e.job_title,mustChangePassword:e.must_change_password}});
  }
  if(req.session.role === "admin" && Number.isSafeInteger(Number(req.session.adminAuthVersion))) {
    const r=await pool.query("SELECT auth_version FROM admin_auth_state WHERE singleton_id=1");
    if(r.rowCount && Number(req.session.adminAuthVersion)===Number(r.rows[0].auth_version)) return res.json({authenticated:true,role:"admin"});
  }
  req.session=null;
  return res.json({authenticated:false});
}));
app.post("/api/auth/logout", (req,res) => { req.session = null; res.json({ authenticated:false }); });


app.post("/api/analytics/visit", asyncRoute(async (req,res) => {
  const visitorId=typeof req.body?.visitorId==="string"?req.body.visitorId:"";
  if(!/^[a-zA-Z0-9-]{24,80}$/.test(visitorId)) return res.status(400).json({error:"Invalid visitor token."});
  const agent=(req.get("user-agent")||"").toLowerCase();
  if(/bot|crawler|spider|preview|headless/.test(agent)) return res.status(204).end();
  const visitorHash=crypto.createHmac("sha256",SESSION_SECRET).update(visitorId).digest("hex");
  const rawPath=clean(req.body?.path,300);
  const pagePath=rawPath.startsWith("/")?rawPath.split("?")[0].slice(0,240):"/";
  const source=clean(req.body?.source,100).toLowerCase().replace(/[^a-z0-9._-]/g,"");
  const medium=clean(req.body?.medium,100).toLowerCase().replace(/[^a-z0-9._-]/g,"");
  const campaign=clean(req.body?.campaign,100).toLowerCase().replace(/[^a-z0-9._-]/g,"");
  let referrerHost="";
  try { if(req.body?.referrer) referrerHost=new URL(String(req.body.referrer)).hostname.slice(0,160); } catch {}
  await pool.query(
    "INSERT INTO site_visitors(visitor_hash,visit_date,first_campaign) VALUES($1,CURRENT_DATE,$2) ON CONFLICT(visitor_hash,visit_date) DO UPDATE SET last_seen_at=NOW(),first_campaign=CASE WHEN site_visitors.first_campaign='' THEN EXCLUDED.first_campaign ELSE site_visitors.first_campaign END",
    [visitorHash,campaign]
  );
  await pool.query(
    "INSERT INTO site_pageviews(visitor_hash,path,source,medium,campaign,referrer_host) VALUES($1,$2,$3,$4,$5,$6)",
    [visitorHash,pagePath,source,medium,campaign,referrerHost]
  );
  const counts=await pool.query("SELECT (SELECT COUNT(DISTINCT visitor_hash)::int FROM site_visitors) AS visitors,(SELECT COUNT(*)::int FROM site_visitors WHERE visit_date=CURRENT_DATE) AS today,(SELECT COUNT(*)::int FROM site_pageviews) AS pageviews");
  res.set("Cache-Control","no-store");
  res.json(counts.rows[0]);
}));
app.get("/api/analytics/counter", asyncRoute(async (_req,res) => {
  const r=await pool.query("SELECT (SELECT COUNT(DISTINCT visitor_hash)::int FROM site_visitors) AS visitors,(SELECT COUNT(*)::int FROM site_visitors WHERE visit_date=CURRENT_DATE) AS today,(SELECT COUNT(*)::int FROM site_pageviews) AS pageviews");
  res.set("Cache-Control","no-store");
  res.json(r.rows[0]);
}));

app.use("/api/control", requireAuth, requireAdmin);

const allowedAssetMimeByExtension = new Map([
  [".avif","image/avif"],[".gif","image/gif"],[".jpg","image/jpeg"],
  [".jpeg","image/jpeg"],[".png","image/png"],[".webp","image/webp"]
]);
async function inspectPublicAsset(publicPath) {
  if (typeof publicPath !== "string" || !publicPath.startsWith("/") ||
      publicPath.startsWith("//") || publicPath.includes("\\") || /[?#]/.test(publicPath) || /[\x00-\x1f]/.test(publicPath)) {
    throw Object.assign(new Error("Asset path must be a same-origin public path."), { status: 400 });
  }
  const resolved = path.resolve(PUBLIC_DIR, publicPath.slice(1));
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    throw Object.assign(new Error("Asset path is outside the public directory."), { status: 400 });
  }
  const [publicRoot, realFile] = await Promise.all([realpath(PUBLIC_DIR), realpath(resolved)]);
  if (realFile !== publicRoot && !realFile.startsWith(publicRoot + path.sep)) {
    throw Object.assign(new Error("Asset resolves outside the public directory."), { status: 400 });
  }
  const info = await stat(realFile);
  if (!info.isFile()) throw Object.assign(new Error("Asset path is not a file."), { status: 400 });
  const mimeType = allowedAssetMimeByExtension.get(path.extname(realFile).toLowerCase());
  if (!mimeType) throw Object.assign(new Error("Only raster image assets (AVIF, GIF, JPEG, PNG, WebP) can be registered."), { status: 415 });
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(realFile);
    stream.on("data", chunk => hash.update(chunk));
    stream.function tapsStorageConfig() {
  const required = ["TAPS_S3_ENDPOINT","TAPS_S3_BUCKET","TAPS_S3_ACCESS_KEY_ID","TAPS_S3_SECRET_ACCESS_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) return { configured:false, missing, client:null, bucket:"" };
  let endpoint;
  try { endpoint = new URL(process.env.TAPS_S3_ENDPOINT); }
  catch { return { configured:false, missing:["TAPS_S3_ENDPOINT_INVALID"], client:null, bucket:"" }; }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (endpoint.pathname !== "/" && endpoint.pathname !== "")) {
    return { configured:false, missing:["TAPS_S3_ENDPOINT_INVALID"], client:null, bucket:"" };
  }
  const client = new S3Client({
    endpoint:endpoint.toString().replace(/\/$/,""),
    region:process.env.TAPS_S3_REGION || "auto",
    forcePathStyle:true,
    credentials:{accessKeyId:process.env.TAPS_S3_ACCESS_KEY_ID,secretAccessKey:process.env.TAPS_S3_SECRET_ACCESS_KEY},
    maxAttempts:3
  });
  return { configured:true, missing:[], client, bucket:process.env.TAPS_S3_BUCKET };
}
async function objectBodyBuffer(body) {
  if (!body || typeof body.transformToByteArray !== "function") throw new Error("Object storage returned an unreadable response body.");
  return Buffer.from(await body.transformToByteArray());
}
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
function buildVisibleWatermarkSvg(width,height,assetId) {
  const safeId = assetId.replace(/[^A-Z0-9-]/g,"");
  const fontSize = Math.max(16,Math.min(34,Math.round(width/48)));
  const smallSize = Math.max(12,Math.min(20,Math.round(width/78)));
  const patternText = "TRAMPILLERA.COM  •  © 2026";
  const patternWidth = Math.max(300,Math.round(width*0.62));
  const patternHeight = Math.max(190,Math.round(height*0.38));
  const bottom = Math.max(0,height-48);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
    '<defs><pattern id="wm" width="' + patternWidth + '" height="' + patternHeight + '" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">' +
    '<text x="0" y="72" font-family="Arial,sans-serif" font-size="' + fontSize + '" font-weight="700" letter-spacing="2" fill="#ffffff" fill-opacity="0.17">' + patternText + '</text></pattern></defs>' +
    '<rect width="100%" height="100%" fill="url(#wm)"/>' +
    '<rect x="0" y="' + bottom + '" width="' + width + '" height="48" fill="#080d16" fill-opacity="0.62"/>' +
    '<text x="' + Math.max(14,width-18) + '" y="' + (height-28) + '" text-anchor="end" font-family="Arial,sans-serif" font-size="' + smallSize + '" font-weight="700" letter-spacing="1.2" fill="#ffffff">TRAMPILLERA.COM  •  ' + safeId + '</text></svg>';
  return Buffer.from(svg,"utf8");
}
app.get("/api/control/taps/status", asyncRoute(async (_req,res) => {
  const storage = tapsStorageConfig();
  let bucketReachable = false;
  let storageError = "";
  if (storage.configured) {
    try { await storage.client.send(new HeadBucketCommand({Bucket:storage.bucket})); bucketReachable = true; }
    catch (error) { storageError = error.name || "STORAGE_CONNECTION_FAILED"; }
  }
  const counts = await pool.query("SELECT pipeline_state,COUNT(*)::int AS count FROM media_assets GROUP BY pipeline_state ORDER BY pipeline_state");
  res.set("Cache-Control","no-store");
  res.json({
    service:"TRAMPILLERA Asset Protection Service",
    version:"0.2.0",
    storage:{provider:"S3_COMPATIBLE_PRIVATE_BUCKET",configured:storage.configured,reachable:bucketReachable,missingConfiguration:storage.missing,error:storageError || undefined},
    pipeline:{implemented:true,enabled:bucketReachable,watermark:"VISIBLE_EMBEDDED_WEBP",originals:"PRIVATE_IMMUTABLE",verification:"SHA256_STORAGE_ROUNDTRIP"},
    assets:counts.rows,
    note:"Legacy public assets are not migrated automatically. Only assets ingested through TAPS are stored as private originals with protected derivatives."
  });
}));
app.post("/api/control/assets/ingest",
  express.raw({type:["image/jpeg","image/png","image/webp","image/avif"],limit:"20mb"}),
  asyncRoute(async (req,res) => {
    const storage = tapsStorageConfig();
    if (!storage.configured) return res.status(503).json({error:"TAPS object storage is not configured.",missingConfiguration:storage.missing});
    try { await storage.client.send(new HeadBucketCommand({Bucket:storage.bucket})); }
    catch (error) { return res.status(503).json({error:"TAPS object storage is not reachable.",code:error.name || "STORAGE_UNAVAILABLE"}); }
    if (!Buffer.isBuffer(req.body) || req.body.length < 16) return res.status(400).json({error:"Upload an image body using image/jpeg, image/png, image/webp or image/avif."});
    const contentType = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const formatByMime = {"image/jpeg":"jpeg","image/png":"png","image/webp":"webp","image/avif":"heif"};
    if (!formatByMime[contentType]) return res.status(415).json({error:"Unsupported image content type."});
    const title = clean(req.get("x-asset-title"),160);
    if (title.length < 2) return res.status(400).json({error:"X-Asset-Title header is required."});
    const rightsHolder = clean(req.get("x-rights-holder"),160) || "UNCONFIRMED";
    const sourceCredit = clean(req.get("x-source-credit"),500);
    const licenseLabel = clean(req.get("x-license-label"),160) || "Permission required";
    const originalBuffer = req.body;
    let sourceMetadata;
    try { sourceMetadata = await sharp(originalBuffer,{failOn:"error",limitInputPixels:40_000_000,animated:false}).metadata(); }
    catch { return res.status(415).json({error:"The uploaded file is not a valid supported raster image."}); }
    const actualFormat = sourceMetadata.format;
    const expectedFormat = formatByMime[contentType];
    if ((expectedFormat === "heif" && actualFormat !== "heif") || (expectedFormat !== "heif" && actualFormat !== expectedFormat)) {
      return res.status(415).json({error:"Declared content type does not match the detected image format."});
    }
    if (!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width * sourceMetadata.height > 40_000_000) {
      return res.status(413).json({error:"Image dimensions exceed the TAPS processing limit."});
    }
    const assetId = "TPA-" + crypto.randomUUID().toUpperCase();
    const version = 1;
    const extension = ({jpeg:"jpg",png:"png",webp:"webp",heif:"avif"})[actualFormat];
    const originalKey = "originals/" + assetId + "/v" + version + "/source." + extension;
    const derivativeKey = "derivatives/" + assetId + "/v" + version + "/protected.webp";
    const originalHash = sha256(originalBuffer);
    const actor = clean(req.session?.actor,100) || "admin";
    await pool.query(
      "INSERT INTO media_assets(asset_id,title,public_path,mime_type,sha256,rights_holder,source_credit,license_label,watermark_state,protection_state,metadata,pipeline_state,storage_provider,original_sha256,original_bytes,version_number) " +
      "VALUES($1,$2,NULL,$3,$4,$5,$6,$7,'PENDING','ACTIVE',$8::jsonb,'RECEIVED','S3_COMPATIBLE',$4,$9,1)",
      [assetId,title,contentType,originalHash,rightsHolder,sourceCredit,licenseLabel,JSON.stringify({hashAlgorithm:"SHA-256",ingest:"TAPS",originalStorage:"private"}),originalBuffer.length]
    );
    let originalStored = false;
    try {
      await storage.client.send(new PutObjectCommand({
        Bucket:storage.bucket,Key:originalKey,Body:originalBuffer,ContentType:contentType,
        Metadata:{assetid:assetId,version:String(version),sha256:originalHash,role:"immutable-original"}
      }));
      originalStored = true;
      await pool.query("UPDATE media_assets SET original_object_key=$2,pipeline_state='SCANNED',image_width=$3,image_height=$4,updated_at=NOW() WHERE asset_id=$1",
        [assetId,originalKey,sourceMetadata.width,sourceMetadata.height]);
      await pool.query("UPDATE media_assets SET pipeline_state='PROCESSING',updated_at=NOW() WHERE asset_id=$1",[assetId]);
      const transformed = await sharp(originalBuffer,{failOn:"error",limitInputPixels:40_000_000,animated:false})
        .rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).toBuffer({resolveWithObject:true});
      const watermarkSvg = buildVisibleWatermarkSvg(transformed.info.width,transformed.info.height,assetId);
      const derivativeBuffer = await sharp(transformed.data).composite([{input:watermarkSvg,blend:"over"}]).webp({quality:88,effort:5}).toBuffer();
      const derivativeHash = sha256(derivativeBuffer);
      await storage.client.send(new PutObjectCommand({
        Bucket:storage.bucket,Key:derivativeKey,Body:derivativeBuffer,ContentType:"image/webp",
        Metadata:{assetid:assetId,version:String(version),sha256:derivativeHash,watermark:"TRAMPILLERA_VISIBLE_V1",role:"protected-derivative"}
      }));
      const originalStoredObject = await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:originalKey}));
      const originalReadBack = await objectBodyBuffer(originalStoredObject.Body);
      if (sha256(originalReadBack) !== originalHash || originalReadBack.length !== originalBuffer.length) throw new Error("Original failed storage round-trip integrity verification.");
      const stored = await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:derivativeKey}));
      const readBack = await objectBodyBuffer(stored.Body);
      const readBackHash = sha256(readBack);
      if (readBackHash !== derivativeHash || readBack.length !== derivativeBuffer.length) throw new Error("Protected derivative failed storage round-trip integrity verification.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "UPDATE media_assets SET derivative_object_key=$2,derivative_sha256=$3,derivative_bytes=$4,mime_type=$5,watermark_state='EMBEDDED',pipeline_state='VERIFIED',verified_at=NOW(),verification_details=$6::jsonb,metadata=metadata || $7::jsonb,updated_at=NOW() WHERE asset_id=$1",
          [assetId,derivativeKey,derivativeHash,derivativeBuffer.length,contentType,
            JSON.stringify({originalHash,originalReadBackHash:sha256(originalReadBack),derivativeHash,derivativeReadBackHash:readBackHash,originalBytesVerified:originalReadBack.length,derivativeBytesVerified:readBack.length,watermarkProfile:"TRAMPILLERA_VISIBLE_V1",storageRoundTrip:"PASS"}),
            JSON.stringify({derivativeMimeType:"image/webp",derivativeWidth:transformed.info.width,derivativeHeight:transformed.info.height})]
        );
        await client.query(
          "INSERT INTO media_asset_versions(asset_id,version_number,original_object_key,derivative_object_key,original_sha256,derivative_sha256,original_bytes,derivative_bytes,mime_type,image_width,image_height,watermark_profile,pipeline_state,verification_details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'TRAMPILLERA_VISIBLE_V1','VERIFIED',$12::jsonb)",
          [assetId,version,originalKey,derivativeKey,originalHash,derivativeHash,originalBuffer.length,derivativeBuffer.length,contentType,transformed.info.width,transformed.info.height,
            JSON.stringify({storageRoundTrip:"PASS",originalHashMatches:true,derivativeHashMatches:true,watermarkEmbedded:true})]
        );
        await client.query("INSERT INTO media_asset_access_events(asset_id,event_type,actor,request_id,details) VALUES($1,'VERIFICATION',$2,$3,$4::jsonb)",
          [assetId,actor,req.get("x-request-id") || "",JSON.stringify({result:"VERIFIED",derivativeSha256:derivativeHash})]);
        await auditWithClient(client,"TAPS_ASSET_VERIFIED","media_asset",assetId,"original_sha256="+originalHash+"; derivative_sha256="+derivativeHash,actor);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
      res.status(201).json({item:{assetId,title,pipelineState:"VERIFIED",watermarkState:"EMBEDDED",originalSha256:originalHash,derivativeSha256:derivativeHash,originalBytes:originalBuffer.length,derivativeBytes:derivativeBuffer.length,width:transformed.info.width,height:transformed.info.height,preview:"/api/control/assets/"+assetId+"/preview"},message:"Original stored privately; watermarked WebP derivative generated and SHA-256 verified after storage retrieval."});
    } catch (error) {
      await pool.query("UPDATE media_assets SET pipeline_state='FAILED',verification_details=$2::jsonb,updated_at=NOW() WHERE asset_id=$1",
        [assetId,JSON.stringify({failure:error.message,originalStored,originalObjectKey:originalStored?originalKey:null})]).catch(() => {});
      console.error(JSON.stringify({level:"error",event:"taps_ingest_failed",assetId,message:error.message}));
      return res.status(502).json({error:"TAPS processing failed. The asset was not marked VERIFIED.",assetId,originalPreserved:originalStored});
    }
  })
);
app.get("/api/control/assets/:assetId/preview", asyncRoute(async (req,res) => {
  const assetId = clean(req.params.assetId,64);
  const result = await pool.query("SELECT derivative_object_key FROM media_assets WHERE asset_id=$1 AND protection_state='ACTIVE' AND pipeline_state='VERIFIED'",
    [assetId]);
  if (!result.rowCount || !result.rows[0].derivative_object_key) return res.status(404).json({error:"Verified protected preview not found."});
  const storage = tapsStorageConfig();
  if (!storage.configured) return res.status(503).json({error:"TAPS object storage is not configured."});
  const object = await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:result.rows[0].derivative_object_key}));
  const body = await objectBodyBuffer(object.Body);
  await pool.query("INSERT INTO media_asset_access_events(asset_id,event_type,actor,request_id,details) VALUES($1,'PREVIEW',$2,$3,'{}'::jsonb)",
    [assetId,clean(req.session?.actor,100)||"admin",req.get("x-request-id")||""]);
  res.set({"Content-Type":"image/webp","Content-Length":String(body.length),"Cache-Control":"private, no-store","Content-Disposition":"inline","X-Content-Type-Options":"nosniff"});
  res.send(body);
}));
app.get("/api/control/assets", asyncRoute(async (req,res) => {
  const state = clean(req.query.state,20).toUpperCase();
  if (state && !["ACTIVE","RESTRICTED","RETIRED"].includes(state)) return res.status(400).json({ error:"Invalid asset protection state." });
  const values = state ? [state] : [];
  const result = await pool.query(
    "SELECT asset_id,title,public_path,mime_type,sha256,rights_holder,source_credit,license_label,watermark_state,protection_state,pipeline_state,storage_provider,version_number,original_bytes,derivative_bytes,verified_at,verification_details,metadata,created_at,updated_at FROM media_assets " +
    (state ? "WHERE protection_state=$1 " : "") + "ORDER BY created_at DESC LIMIT 500", values
  );
  res.set("Cache-Control","no-store");
  res.json({ items:result.rows, count:result.rowCount });
}));
app.post("/api/control/assets", asyncRoute(async (req,res) => {
  const title = clean(req.body?.title,160);
  const publicPath = clean(req.body?.publicPath,2048);
  const rightsHolder = clean(req.body?.rightsHolder,160) || "TRAMPILLERA MEDIA";
  const sourceCredit = clean(req.body?.sourceCredit,500);
  const licenseLabel = clean(req.body?.licenseLabel,160) || "Permission required";
  if (title.length < 2 || !publicPath) return res.status(400).json({ error:"Asset title and public path are required." });
  let inspected;
  try { inspected = await inspectPublicAsset(publicPath); }
  catch (error) { return res.status(error.status || 400).json({ error:error.message }); }
  const assetId = "TPA-" + crypto.randomUUID().toUpperCase();
  const result = await pool.query(
    "INSERT INTO media_assets(asset_id,title,public_path,mime_type,sha256,rights_holder,source_credit,license_label,watermark_state,protection_state,metadata) " +
    "VALUES($1,$2,$3,$4,$5,$6,$7,$8,'OVERLAY_ONLY','ACTIVE',$9::jsonb) " +
    "RETURNING asset_id,title,public_path,mime_type,sha256,rights_holder,source_credit,license_label,watermark_state,protection_state,metadata,created_at",
    [assetId,title,publicPath,inspected.mimeType,inspected.sha256,rightsHolder,sourceCredit,licenseLabel,
      JSON.stringify({ bytes:inspected.bytes, hashAlgorithm:"SHA-256", hashComputedBy:"server", storage:"application-public-directory" })]
  );
  await audit("MEDIA_ASSET_REGISTERED","media_asset",assetId,"sha256=" + inspected.sha256 + "; path=" + publicPath);
  res.status(201).json({ item:result.rows[0], message:"Asset registered and server-side SHA-256 fingerprint computed. Watermark state remains OVERLAY_ONLY until an embedded-watermark export is produced." });
}));
app.patch("/api/control/assets/:assetId", asyncRoute(async (req,res) => {
  const state = clean(req.body?.protectionState,20).toUpperCase();
  if (!["ACTIVE","RESTRICTED","RETIRED"].includes(state)) return res.status(400).json({ error:"Protection state must be ACTIVE, RESTRICTED or RETIRED." });
  const result = await pool.query(
    "UPDATE media_assets SET protection_state=$2,updated_at=NOW() WHERE asset_id=$1 RETURNING asset_id,title,public_path,protection_state,updated_at",
    [clean(req.params.assetId,64),state]
  );
  if (!result.rowCount) return res.status(404).json({ error:"Asset record not found." });
  await audit("MEDIA_ASSET_STATE_CHANGED","media_asset",result.rows[0].asset_id,"state=" + state);
  res.json({ item:result.rows[0] });
}));

app.get("/api/control/analytics/summary", asyncRoute(async (req,res) => {
  const parsed=Number(req.query.days||30);
  const days=Number.isFinite(parsed)?Math.max(7,Math.min(90,Math.trunc(parsed))):30;
  const [totals,daily,pages,sources,campaigns]=await Promise.all([
    pool.query("SELECT COUNT(*)::int AS pageviews,COUNT(DISTINCT visitor_hash)::int AS visitors,COUNT(*) FILTER(WHERE created_at>=NOW()-INTERVAL '24 hours')::int AS views_24h,COUNT(DISTINCT visitor_hash) FILTER(WHERE created_at::date=CURRENT_DATE)::int AS visitors_today FROM site_pageviews"),
    pool.query("SELECT to_char(d.day,'YYYY-MM-DD') AS day,COALESCE(p.views,0)::int AS views,COALESCE(p.visitors,0)::int AS visitors FROM generate_series(CURRENT_DATE-($1::int-1),CURRENT_DATE,INTERVAL '1 day') d(day) LEFT JOIN (SELECT created_at::date AS day,COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_pageviews WHERE created_at>=CURRENT_DATE-($1::int-1) GROUP BY created_at::date) p ON p.day=d.day::date ORDER BY d.day",[days]),
    pool.query("SELECT path,COUNT(*)::int AS views,COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_pageviews WHERE created_at>=NOW()-($1::int*INTERVAL '1 day') GROUP BY path ORDER BY views DESC LIMIT 10",[days]),
    pool.query("SELECT COALESCE(NULLIF(source,''),NULLIF(referrer_host,''),'Direct') AS source,COUNT(*)::int AS visits,COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_pageviews WHERE created_at>=NOW()-($1::int*INTERVAL '1 day') GROUP BY 1 ORDER BY visits DESC LIMIT 10",[days]),
    pool.query("SELECT c.id,c.slug,c.name,c.channel,c.objective,c.destination_url,c.status,c.budget,c.created_at,COALESCE(e.clicks,0)::int AS clicks,COALESCE(v.visits,0)::int AS visits,COALESCE(v.visitors,0)::int AS visitors FROM growth_campaigns c LEFT JOIN (SELECT campaign_id,COUNT(*) AS clicks FROM growth_campaign_events WHERE created_at>=NOW()-($1::int*INTERVAL '1 day') GROUP BY campaign_id) e ON e.campaign_id=c.id LEFT JOIN (SELECT campaign,COUNT(*) AS visits,COUNT(DISTINCT visitor_hash) AS visitors FROM site_pageviews WHERE created_at>=NOW()-($1::int*INTERVAL '1 day') AND campaign<>'' GROUP BY campaign) v ON v.campaign=c.slug ORDER BY c.created_at DESC LIMIT 100",[days])
  ]);
  res.set("Cache-Control","no-store");
  res.json({days,totals:totals.rows[0],daily:daily.rows,pages:pages.rows,sources:sources.rows,campaigns:campaigns.rows});
}));
app.get("/api/control/growth/campaigns", asyncRoute(async (_req,res) => {
  const r=await pool.query("SELECT c.id,c.slug,c.name,c.channel,c.objective,c.destination_url,c.status,c.budget,c.created_at,COALESCE(e.clicks,0)::int AS clicks,COALESCE(v.visits,0)::int AS visits,COALESCE(v.visitors,0)::int AS visitors FROM growth_campaigns c LEFT JOIN (SELECT campaign_id,COUNT(*) AS clicks FROM growth_campaign_events GROUP BY campaign_id) e ON e.campaign_id=c.id LEFT JOIN (SELECT campaign,COUNT(*) AS visits,COUNT(DISTINCT visitor_hash) AS visitors FROM site_pageviews WHERE campaign<>'' GROUP BY campaign) v ON v.campaign=c.slug ORDER BY c.created_at DESC LIMIT 100");
  res.json({items:r.rows});
}));
app.post("/api/control/growth/campaigns", asyncRoute(async (req,res) => {
  const name=clean(req.body?.name,120);
  const channel=clean(req.body?.channel,40).toUpperCase()||"OTHER";
  const objective=clean(req.body?.objective,300);
  const destination=clean(req.body?.destinationUrl,2048);
  const budget=Number(req.body?.budget||0);
  if(name.length<2 || !destination || !Number.isFinite(budget) || budget<0 || budget>1000000000) return res.status(400).json({error:"Provide a campaign name, valid destination URL and non-negative budget."});
  let target;
  try { target=new URL(destination); } catch { return res.status(400).json({error:"Destination URL is invalid."}); }
  if(!["https:","http:"].includes(target.protocol)) return res.status(400).json({error:"Only HTTP and HTTPS campaign destinations are allowed."});
  const base=name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"campaign";
  const slug=base+"-"+crypto.randomBytes(3).toString("hex");
  const r=await pool.query("INSERT INTO growth_campaigns(slug,name,channel,objective,destination_url,budget) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,slug,name,channel,objective,destination_url,status,budget,created_at",[slug,name,channel,objective,target.toString(),budget]);
  await audit("GROWTH_CAMPAIGN_CREATED","growth_campaign",slug,"Created "+name+" campaign");
  res.status(201).json({item:r.rows[0]});
}));
app.patch("/api/control/growth/campaigns/:id", asyncRoute(async (req,res) => {
  const status=clean(req.body?.status,20).toUpperCase();
  if(!["ACTIVE","PAUSED","ARCHIVED"].includes(status)) return res.status(400).json({error:"Campaign status must be ACTIVE, PAUSED or ARCHIVED."});
  const r=await pool.query("UPDATE growth_campaigns SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,slug,name,status",[req.params.id,status]);
  if(!r.rowCount) return res.status(404).json({error:"Campaign not found."});
  await audit("GROWTH_CAMPAIGN_STATUS_CHANGED","growth_campaign",r.rows[0].slug,"Campaign status set to "+status);
  res.json({item:r.rows[0]});
}));

app.get("/api/control/overview", asyncRoute(async (_req,res) => {
  const [m,c,p,a] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS n FROM platform_modules"),
    pool.query("SELECT COUNT(*)::int AS n FROM platform_connectors"),
    pool.query("SELECT COUNT(*)::int AS n FROM model_providers"),
    pool.query("SELECT COUNT(*)::int AS n FROM audit_events")
  ]);
  res.json({ modules:m.rows[0].n, connectors:c.rows[0].n, models:p.rows[0].n, auditEvents:a.rows[0].n });
}));
app.get("/api/control/modules", asyncRoute(async (_req,res) => {
  const r=await pool.query("SELECT key,name,version,status,description FROM platform_modules ORDER BY created_at DESC");
  res.json({items:r.rows});
}));
app.post("/api/control/modules", validateBody({key:80,name:120}), asyncRoute(async (req,res) => {
  if(!validKey(req.body.key)) return res.status(400).json({error:"Module key format is invalid."});
  const {key,name}=req.body;
  const r=await pool.query(
    "INSERT INTO platform_modules(key,name,version,status,description) VALUES($1,$2,$3,'DISCOVERED',$4) ON CONFLICT DO NOTHING RETURNING *",
    [key.trim(),clean(name,120),clean(req.body.version,32)||"1.0.0",clean(req.body.description,500)]
  );
  if(!r.rowCount) return res.status(409).json({error:"A module with this key already exists."});
  await audit("MODULE_REGISTERED","module",key,`Registered ${clean(name,120)}`);
  res.status(201).json({item:r.rows[0]});
}));
app.post("/api/control/modules/:key/lifecycle", validateBody({status:32,note:500}), asyncRoute(async (req,res) => {
  const key=req.params.key;
  const next=clean(req.body.status,32).toUpperCase();
  const note=clean(req.body.note,500);
  if(!lifecycle.includes(next) || note.length<5) return res.status(400).json({error:"A valid target lifecycle state and a transition note of at least 5 characters are required."});
  const client=await pool.connect();
  let transactionOpen=false;
  try {
    await client.query("BEGIN");
    transactionOpen=true;
    const currentResult=await client.query("SELECT status FROM platform_modules WHERE key=$1 FOR UPDATE",[key]);
    if(!currentResult.rowCount) {
      await client.query("ROLLBACK");
      transactionOpen=false;
      return res.status(404).json({error:"Module not found."});
    }
    const current=currentResult.rows[0].status;
    if(!MODULE_LIFECYCLE_TRANSITIONS[current]?.includes(next)) {
      await client.query("ROLLBACK");
      transactionOpen=false;
      return res.status(409).json({error:`Lifecycle transition ${current} → ${next} is not allowed.`,current,requested:next});
    }
    const updated=await client.query(
      "UPDATE platform_modules SET status=$2,updated_at=NOW() WHERE key=$1 RETURNING key,name,version,status,description",
      [key,next]
    );
    await auditWithClient(client,"MODULE_LIFECYCLE_CHANGED","module",key,`from=${current}; to=${next}; note=${note}`);
    await client.query("COMMIT");
    transactionOpen=false;
    res.json({item:updated.rows[0]});
  } catch(err) {
    if(transactionOpen) await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}));
app.get("/api/control/connectors", asyncRoute(async (_req,res) => {
  const r=await pool.query("SELECT key,name,provider,status,endpoint FROM platform_connectors ORDER BY created_at DESC");
  res.json({items:r.rows});
}));
app.post("/api/control/connectors", validateBody({key:80,name:120,provider:120}), asyncRoute(async (req,res) => {
  if(!validKey(req.body.key)) return res.status(400).json({error:"Connector key format is invalid."});
  const r=await pool.query(
    "INSERT INTO platform_connectors(key,name,provider,status,endpoint) VALUES($1,$2,$3,'NOT_CONFIGURED',$4) ON CONFLICT DO NOTHING RETURNING *",
    [req.body.key.trim(),clean(req.body.name,120),clean(req.body.provider,120),clean(req.body.endpoint,500)]
  );
  if(!r.rowCount) return res.status(409).json({error:"A connector with this key already exists."});
  await audit("CONNECTOR_REGISTERED","connector",req.body.key,`Registered ${clean(req.body.name,120)}`);
  res.status(201).json({item:r.rows[0]});
}));
app.post("/api/control/connectors/:key/validate", asyncRoute(async (req,res) => {
  const r=await pool.query("SELECT key,endpoint FROM platform_connectors WHERE key=$1",[req.params.key]);
  if(!r.rowCount) return res.status(404).json({error:"Connector not found."});
  const endpoint=r.rows[0].endpoint;
  if(endpoint) {
    let u;
    try { u=new URL(endpoint); } catch { return res.status(400).json({error:"Endpoint URL is invalid."}); }
    if(u.protocol!=="https:" || u.username || u.password) return res.status(400).json({error:"Connector endpoints must use HTTPS and cannot contain embedded credentials."});
  }
  await pool.query("UPDATE platform_connectors SET status=$2,updated_at=NOW() WHERE key=$1",[req.params.key,endpoint?"CONFIGURED":"NOT_CONFIGURED"]);
  await audit("CONNECTOR_CONFIGURATION_VALIDATED","connector",req.params.key,endpoint?"HTTPS endpoint syntax validated; no outbound request was made.":"No endpoint configured.");
  res.json({message:endpoint?"HTTPS endpoint configuration is valid. No external connectivity test was performed.":"Connector exists but has no endpoint configured."});
}));
app.get("/api/control/models", asyncRoute(async (_req,res) => {
  const r=await pool.query("SELECT key,name,org,region,deployment,modal,spec,status FROM model_providers ORDER BY created_at DESC");
  res.json({items:r.rows});
}));
app.post("/api/control/models", validateBody({key:80,name:160}), asyncRoute(async (req,res) => {
  if(!validKey(req.body.key)) return res.status(400).json({error:"Provider key format is invalid."});
  const r=await pool.query(
    "INSERT INTO model_providers(key,name,org,region,deployment,modal,spec,status) VALUES($1,$2,$3,$4,$5,$6,$7,'DISCOVERED') ON CONFLICT DO NOTHING RETURNING *",
    [req.body.key.trim(),clean(req.body.name,160),clean(req.body.org,120),clean(req.body.region,120),["CLOUD","LOCAL","HYBRID"].includes(req.body.deployment)?req.body.deployment:"CLOUD",clean(req.body.modal,160),clean(req.body.spec,300)]
  );
  if(!r.rowCount) return res.status(409).json({error:"A provider with this key already exists."});
  await audit("MODEL_PROVIDER_REGISTERED","model_provider",req.body.key,`Registered ${clean(req.body.name,160)}`);
  res.status(201).json({item:r.rows[0]});
}));
app.get("/api/control/audit", asyncRoute(async (_req,res) => {
  const r=await pool.query("SELECT action,entity_type,entity_key,details,created_at FROM audit_events ORDER BY created_at DESC LIMIT 100");
  res.json({items:r.rows});
}));
app.get("/api/control/settings", (_req,res) => res.json({
  environment:NODE_ENV, database:"PostgreSQL", authentication:"Administrator session cookie",
  aiProvider:getAIProviderStatus(),
  realtime:"HTTP API (WebSocket integration not enabled in this release)"
}));
app.get("/api/control/diagnostics", asyncRoute(async (_req,res) => {
  const started = Date.now();
  const result = await pool.query("SELECT 1 AS ok, NOW() AS database_time");
  const latencyMs = Date.now() - started;
  const commit = process.env.RENDER_GIT_COMMIT || null;
  res.json({
    runtime: {
      status: "PASS",
      nodeVersion: process.version,
      environment: NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: APP_STARTED_AT.toISOString()
    },
    database: {
      status: result.rows[0]?.ok === 1 ? "PASS" : "UNKNOWN",
      latencyMs,
      serverTime: result.rows[0]?.database_time || null
    },
    connectionPool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    },
    deployment: {
      commit: commit && /^[0-9a-f]{7,40}$/i.test(commit) ? commit : null,
      source: commit ? "RENDER_GIT_COMMIT" : "UNKNOWN"
    },
    backup: { status: "UNKNOWN", evidence: "No backup or restore verification is available to this application." }
  });
}));

app.post("/api/control/ai/chat", rateLimit({windowMs:60_000,limit:12,standardHeaders:"draft-8",legacyHeaders:false}), asyncRoute(async (req,res) => {
  const message=clean(req.body?.message,4000);
  if(!message) return res.status(400).json({error:"Message is required."});
  const config=resolveAIProviderConfig();
  if(!config.configured) {
    const hint=config.provider==="qwen"?"Set QWEN_API_KEY and QWEN_API_URL on the server.":config.provider==="openai"?"Set OPENAI_API_KEY on the server.":"Set AI_PROVIDER to qwen or openai.";
    return res.status(503).json({error:`AI provider "${config.provider}" is not configured. ${hint}`});
  }
  const requestBody=buildAIRequestBody(config,message);
  let response;
  try {
    response=await fetch(config.endpoint,{
      method:"POST",
      headers:{"Authorization":`Bearer ${config.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify(requestBody),
      signal:AbortSignal.timeout(30_000)
    });
  } catch(err) {
    const timedOut=err.name==="TimeoutError"||err.name==="AbortError";
    await audit("AI_REQUEST_FAILED","ai",config.provider,`model=${config.model}; error=${timedOut?"timeout":"network"}`);
    return res.status(timedOut?504:502).json({error:timedOut?"AI provider request timed out.":"AI provider could not be reached."});
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok) {
    await audit("AI_REQUEST_FAILED","ai",config.provider,`model=${config.model}; provider_status=${response.status}`);
    return res.status(502).json({error:"AI provider returned an error. Check server logs and provider configuration."});
  }
  const output=extractAIReply(data,config.protocol);
  if(!output) {
    await audit("AI_REQUEST_FAILED","ai",config.provider,`model=${config.model}; error=empty_response`);
    return res.status(502).json({error:"AI provider returned no text output."});
  }
  const usage=extractAIUsage(data);
  await audit("AI_REQUEST_COMPLETED","ai",config.provider,`model=${config.model}; input_tokens=${usage.inputTokens}; output_tokens=${usage.outputTokens}`);
  res.json({reply:output,provider:config.provider,model:config.model});
}));


// ITY CITY employee identity, team missions, moderated XP and mission discussion.
app.post("/api/auth/employee-login", rateLimit({windowMs:15*60_000,limit:8,standardHeaders:"draft-8",legacyHeaders:false}), asyncRoute(async (req,res) => {
  const email=clean(req.body?.email,254).toLowerCase();
  const password=typeof req.body?.password==="string"?req.body.password:"";
  if(!email || !password) return res.status(400).json({error:"Email and password are required."});
  const r=await pool.query("SELECT id,email,display_name,department,job_title,password_hash,active,must_change_password,auth_version FROM employees WHERE email=$1",[email]);
  const employee=r.rows[0];
  if(!employee || !employee.active || !passwordMatches(password,employee.password_hash)) return res.status(401).json({error:"Email or password is incorrect."});
  const now=Date.now();
  req.session={authenticated:true,role:"employee",employeeId:employee.id,authVersion:employee.auth_version,actor:`employee:${employee.id}`,issuedAt:now,lastSeenAt:now};
  await audit("EMPLOYEE_LOGIN","employee",String(employee.id),"Employee session created",String(employee.id));
  res.json({authenticated:true,role:"employee",mustChangePassword:employee.must_change_password,name:employee.display_name});
}));
app.post("/api/auth/change-password", requireEmployeeSetup, asyncRoute(async (req,res) => {
  if(req.session?.role!=="employee") return res.status(403).json({error:"Employee session required."});
  const password=typeof req.body?.newPassword==="string"?req.body.newPassword:"";
  if(password.length<12 || password.length>200) return res.status(400).json({error:"New password must contain at least 12 characters."});
  const client=await pool.connect();
  let authVersion;
  try {
    await client.query("BEGIN");
    const updated=await client.query("UPDATE employees SET password_hash=$2,must_change_password=FALSE,auth_version=auth_version+1,updated_at=NOW() WHERE id=$1 RETURNING auth_version",[req.session.employeeId,passwordHash(password)]);
    if(!updated.rowCount) throw new Error("Employee account is unavailable.");
    authVersion=updated.rows[0].auth_version;
    await auditWithClient(client,"EMPLOYEE_PASSWORD_CHANGED","employee",String(req.session.employeeId),"Employee changed initial or current password",String(req.session.employeeId));
    await client.query("COMMIT");
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
  req.session.authVersion=authVersion;
  req.session.lastSeenAt=Date.now();
  res.json({changed:true});
}));
app.get("/api/team/dashboard", requireAuth, requireEmployee, asyncRoute(async (req,res) => {
  const id=req.session.employeeId;
  const [employee,stats,missions,leaders]=await Promise.all([
    pool.query("SELECT id,email,display_name,department,job_title,must_change_password FROM employees WHERE id=$1 AND active=TRUE",[id]),
    pool.query("SELECT COALESCE(SUM(xp_awarded),0)::int AS xp, COUNT(*) FILTER (WHERE status='VERIFIED')::int AS completed, COUNT(*) FILTER (WHERE status IN ('ASSIGNED','IN_PROGRESS'))::int AS active, COUNT(*) FILTER (WHERE status='SUBMITTED')::int AS awaiting FROM mission_assignments WHERE employee_id=$1",[id]),
    pool.query("SELECT COUNT(*)::int AS total FROM mission_assignments WHERE employee_id=$1",[id]),
    pool.query("SELECT e.id,e.display_name,e.department,COALESCE(SUM(a.xp_awarded),0)::int AS xp,COUNT(a.id) FILTER (WHERE a.status='VERIFIED')::int AS completed FROM employees e LEFT JOIN mission_assignments a ON a.employee_id=e.id WHERE e.active=TRUE GROUP BY e.id ORDER BY xp DESC,completed DESC,e.display_name ASC LIMIT 10")
  ]);
  if(!employee.rowCount) return res.status(401).json({error:"Employee account is unavailable."});
  res.json({employee:employee.rows[0],stats:stats.rows[0],assignedMissions:missions.rows[0].total,leaderboard:leaders.rows});
}));
app.get("/api/team/missions", requireAuth, requireEmployee, asyncRoute(async (req,res) => {
  const r=await pool.query(`SELECT m.id,m.title,m.description,m.category,m.xp_reward,m.due_at,a.id AS assignment_id,a.status,a.submission_note,a.review_note,a.submitted_at,a.reviewed_at,
    (SELECT COUNT(*)::int FROM mission_messages mm WHERE mm.mission_id=m.id) AS message_count
    FROM mission_assignments a JOIN team_missions m ON m.id=a.mission_id
    WHERE a.employee_id=$1 AND m.status='PUBLISHED' ORDER BY CASE a.status WHEN 'SUBMITTED' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'ASSIGNED' THEN 3 WHEN 'REJECTED' THEN 4 ELSE 5 END,m.due_at NULLS LAST,m.created_at DESC`,[req.session.employeeId]);
  res.json({items:r.rows});
}));
app.post("/api/team/missions/:id/start", requireAuth, requireEmployee, asyncRoute(async (req,res) => {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("UPDATE mission_assignments SET status='IN_PROGRESS',updated_at=NOW() WHERE mission_id=$1 AND employee_id=$2 AND status IN ('ASSIGNED','REJECTED') RETURNING id,status",[req.params.id,req.session.employeeId]);
    if(!r.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"This mission cannot be started in its current state."});}
    await auditWithClient(client,"MISSION_STARTED","mission",String(req.params.id),"Employee started an assigned mission",String(req.session.employeeId));
    await client.query("COMMIT");
    res.json({item:r.rows[0]});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));
app.post("/api/team/missions/:id/submit", requireAuth, requireEmployee, asyncRoute(async (req,res) => {
  const note=clean(req.body?.note,3000);
  if(note.length<8) return res.status(400).json({error:"Add a short result note (at least 8 characters) before submitting."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("UPDATE mission_assignments SET status='SUBMITTED',submission_note=$3,submitted_at=NOW(),review_note='',updated_at=NOW() WHERE mission_id=$1 AND employee_id=$2 AND status='IN_PROGRESS' RETURNING id,status,submitted_at",[req.params.id,req.session.employeeId,note]);
    if(!r.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"Start the mission before submitting it."});}
    await auditWithClient(client,"MISSION_SUBMITTED","mission",String(req.params.id),"Employee submitted a result for review",String(req.session.employeeId));
    await client.query("COMMIT");
    res.json({item:r.rows[0],message:"Submitted for review. XP is awarded only after administrator verification."});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));
async function employeeCanAccessMission(missionId,employeeId) {
  const r=await pool.query("SELECT 1 FROM mission_assignments WHERE mission_id=$1 AND employee_id=$2",[missionId,employeeId]);
  return r.rowCount>0;
}
app.get("/api/team/missions/:id/messages", requireAuth, requireEmployee, asyncRoute(async (req,res) => {
  if(!await employeeCanAccessMission(req.params.id,req.session.employeeId)) return res.status(404).json({error:"Mission not found."});
  const r=await pool.query("SELECT mm.id,mm.body,mm.created_at,e.display_name,e.id AS employee_id FROM (SELECT id,body,created_at,employee_id FROM mission_messages WHERE mission_id=$1 ORDER BY created_at DESC,id DESC LIMIT 200) mm JOIN employees e ON e.id=mm.employee_id ORDER BY mm.created_at ASC,mm.id ASC",[req.params.id]);
  res.json({items:r.rows});
}));
app.post("/api/team/missions/:id/messages", requireAuth, requireEmployee, asyncRoute(async (req,res) => {
  const body=clean(req.body?.body,2000);
  if(body.length<1) return res.status(400).json({error:"Message cannot be empty."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("INSERT INTO mission_messages(mission_id,employee_id,body) SELECT $1,$2,$3 WHERE EXISTS (SELECT 1 FROM mission_assignments WHERE mission_id=$1 AND employee_id=$2) RETURNING id,body,created_at",[req.params.id,req.session.employeeId,body]);
    if(!r.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Mission not found."});}
    await auditWithClient(client,"MISSION_MESSAGE_POSTED","mission",String(req.params.id),"Employee posted a mission discussion message",String(req.session.employeeId));
    await client.query("COMMIT");
    res.status(201).json({item:r.rows[0]});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));
app.get("/api/control/team/employees", asyncRoute(async (_req,res) => {
  const r=await pool.query(`SELECT e.id,e.email,e.display_name,e.department,e.job_title,e.active,e.must_change_password,e.created_at,
    COALESCE(SUM(a.xp_awarded),0)::int AS xp,COUNT(a.id) FILTER (WHERE a.status='VERIFIED')::int AS completed
    FROM employees e LEFT JOIN mission_assignments a ON a.employee_id=e.id GROUP BY e.id ORDER BY e.created_at DESC`);
  res.json({items:r.rows});
}));
app.post("/api/control/team/employees", asyncRoute(async (req,res) => {
  const email=clean(req.body?.email,254).toLowerCase(),name=clean(req.body?.name,120);
  const department=clean(req.body?.department,120),jobTitle=clean(req.body?.jobTitle,120);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) return res.status(400).json({error:"A valid email and employee name are required."});
  const temporaryPassword=crypto.randomBytes(18).toString("base64url");
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("INSERT INTO employees(email,display_name,department,job_title,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id,email,display_name,department,job_title,active,must_change_password,created_at",[email,name,department,jobTitle,passwordHash(temporaryPassword)]);
    await auditWithClient(client,"EMPLOYEE_CREATED","employee",String(r.rows[0].id),`Created employee account for ${email}`);
    await client.query("COMMIT");
    res.status(201).json({item:r.rows[0],temporaryPassword,warning:"Copy this temporary password now. It will not be shown again; the employee must change it at first sign-in."});
  } catch(err) {
    await client.query("ROLLBACK");
    if(err.code==="23505") return res.status(409).json({error:"An employee with this email already exists."});
    throw err;
  } finally { client.release(); }
}));
app.post("/api/control/team/employees/:id/status", asyncRoute(async (req,res) => {
  const active=req.body?.active;
  if(typeof active!=="boolean") return res.status(400).json({error:"active must be true or false."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("UPDATE employees SET active=$2,auth_version=CASE WHEN $2=FALSE THEN auth_version+1 ELSE auth_version END,updated_at=NOW() WHERE id=$1 RETURNING id,email,display_name,active",[req.params.id,active]);
    if(!r.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Employee not found."});}
    await auditWithClient(client,"EMPLOYEE_STATUS_CHANGED","employee",String(req.params.id),`active=${active}`);
    await client.query("COMMIT");
    res.json({item:r.rows[0]});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));
app.post("/api/control/team/employees/:id/reset-password", asyncRoute(async (req,res) => {
  const temporaryPassword=crypto.randomBytes(18).toString("base64url");
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query("UPDATE employees SET password_hash=$2,must_change_password=TRUE,auth_version=auth_version+1,updated_at=NOW() WHERE id=$1 AND active=TRUE RETURNING id,email,display_name",[req.params.id,passwordHash(temporaryPassword)]);
    if(!r.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Active employee account not found."});}
    await auditWithClient(client,"EMPLOYEE_PASSWORD_RESET","employee",String(req.params.id),"Administrator issued a new temporary password");
    await client.query("COMMIT");
    res.json({item:r.rows[0],temporaryPassword,warning:"Copy this temporary password now. It will not be shown again; the employee must change it at next sign-in."});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));
;
// Organization Desk: normalized structure and explicit employee placement.
app.get("/api/control/organization", asyncRoute(async (_req,res) => {
  const [units,positions,employees] = await Promise.all([
    pool.query(`SELECT u.id,u.unit_key,u.name,u.unit_type,u.parent_unit_id,u.status,u.created_at,
      p.name AS parent_name,COUNT(DISTINCT a.id)::int AS active_assignments
      FROM org_units u LEFT JOIN org_units p ON p.id=u.parent_unit_id
      LEFT JOIN employee_org_assignments a ON a.org_unit_id=u.id AND a.status='ACTIVE'
        AND a.valid_from<=CURRENT_DATE AND (a.valid_until IS NULL OR a.valid_until>=CURRENT_DATE)
      GROUP BY u.id,p.name ORDER BY u.name`),
    pool.query("SELECT id,position_key,title,description,status FROM positions ORDER BY title"),
    pool.query(`SELECT e.id,e.email,e.display_name,e.department AS legacy_department,e.job_title AS legacy_job_title,e.active,
      a.id AS assignment_id,a.assignment_type,a.valid_from,a.valid_until,
      u.id AS org_unit_id,u.name AS org_unit_name,p.id AS position_id,p.title AS position_title
      FROM employees e
      LEFT JOIN LATERAL (
        SELECT * FROM employee_org_assignments x
        WHERE x.employee_id=e.id AND x.status='ACTIVE'
          AND x.valid_from<=CURRENT_DATE AND (x.valid_until IS NULL OR x.valid_until>=CURRENT_DATE)
        ORDER BY CASE x.assignment_type WHEN 'PRIMARY' THEN 0 ELSE 1 END,x.valid_from DESC,x.id DESC
        LIMIT 1
      ) a ON TRUE
      LEFT JOIN org_units u ON u.id=a.org_unit_id
      LEFT JOIN positions p ON p.id=a.position_id
      ORDER BY e.active DESC,e.display_name,e.id`)
  ]);
  res.set("Cache-Control","no-store");
  res.json({units:units.rows,positions:positions.rows,employees:employees.rows,
    summary:{units:units.rowCount,positions:positions.rowCount,employees:employees.rowCount,
      assigned:employees.rows.filter(x=>x.assignment_id!==null).length,
      unmapped:employees.rows.filter(x=>x.assignment_id===null).length}});
}));
app.post("/api/control/organization/units", asyncRoute(async (req,res) => {
  const key=clean(req.body?.key,80).toLowerCase(),name=clean(req.body?.name,160);
  const type=clean(req.body?.type,32).toUpperCase();
  const parentId=req.body?.parentId===""||req.body?.parentId==null?null:Number(req.body.parentId);
  if(!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(key)||!name||
    !["COMPANY","DIVISION","DEPARTMENT","TEAM","PROJECT_GROUP","OTHER"].includes(type)||
    (parentId!==null&&(!Number.isSafeInteger(parentId)||parentId<1))) {
    return res.status(400).json({error:"Provide a valid key, name, unit type and optional parent."});
  }
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    if(parentId!==null){
      const parent=await client.query("SELECT id,status FROM org_units WHERE id=$1",[parentId]);
      if(!parent.rowCount||parent.rows[0].status!=="ACTIVE"){await client.query("ROLLBACK");return res.status(400).json({error:"Parent unit does not exist or is inactive."});}
    }
    const r=await client.query("INSERT INTO org_units(unit_key,name,unit_type,parent_unit_id) VALUES($1,$2,$3,$4) RETURNING id,unit_key,name,unit_type,parent_unit_id,status",[key,name,type,parentId]);
    await auditWithClient(client,"ORG_UNIT_CREATED","org_unit",String(r.rows[0].id),`Created ${type} unit ${key}`);
    await client.query("COMMIT");
    res.status(201).json({item:r.rows[0]});
  } catch(err) {
    await client.query("ROLLBACK");
    if(err.code==="23505") return res.status(409).json({error:"An organizational unit with this key already exists."});
    if(err.code==="23514") return res.status(409).json({error:"The requested hierarchy is not valid."});
    throw err;
  } finally { client.release(); }
}));
app.post("/api/control/organization/positions", asyncRoute(async (req,res) => {
  const key=clean(req.body?.key,80).toLowerCase(),title=clean(req.body?.title,160),description=clean(req.body?.description,1000);
  if(!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(key)||!title) return res.status(400).json({error:"Provide a valid position key and title."});
  try {
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      const r=await client.query("INSERT INTO positions(position_key,title,description) VALUES($1,$2,$3) RETURNING id,position_key,title,description,status",[key,title,description]);
      await auditWithClient(client,"ORG_POSITION_CREATED","position",String(r.rows[0].id),`Created position ${key}`);
      await client.query("COMMIT");
      res.status(201).json({item:r.rows[0]});
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
  } catch(err) {
    if(err.code==="23505") return res.status(409).json({error:"A position with this key already exists."});
    throw err;
  }
}));
app.post("/api/control/organization/assignments", asyncRoute(async (req,res) => {
  const employeeId=Number(req.body?.employeeId),unitId=Number(req.body?.unitId);
  const positionId=req.body?.positionId===""||req.body?.positionId==null?null:Number(req.body.positionId);
  const type=clean(req.body?.type,20).toUpperCase()||"PRIMARY";
  const validFrom=clean(req.body?.validFrom,10)||new Date().toISOString().slice(0,10);
  const validUntil=clean(req.body?.validUntil,10)||null;
  if(!Number.isSafeInteger(employeeId)||employeeId<1||!Number.isSafeInteger(unitId)||unitId<1||
    (positionId!==null&&(!Number.isSafeInteger(positionId)||positionId<1))||
    !["PRIMARY","SECONDARY","TEMPORARY"].includes(type)||
    !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)||(validUntil&&!/^\d{4}-\d{2}-\d{2}$/.test(validUntil))||
    (validUntil&&validUntil<validFrom)) return res.status(400).json({error:"Assignment fields or effective dates are invalid."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const [employee,unit,position]=await Promise.all([
      client.query("SELECT id,active FROM employees WHERE id=$1 FOR UPDATE",[employeeId]),
      client.query("SELECT id,status FROM org_units WHERE id=$1",[unitId]),
      positionId===null?Promise.resolve({rowCount:1,rows:[{status:"ACTIVE"}]}):client.query("SELECT id,status FROM positions WHERE id=$1",[positionId])
    ]);
    if(!employee.rowCount||!employee.rows[0].active){await client.query("ROLLBACK");return res.status(400).json({error:"Employee account does not exist or is inactive."});}
    if(!unit.rowCount||unit.rows[0].status!=="ACTIVE"){await client.query("ROLLBACK");return res.status(400).json({error:"Organizational unit does not exist or is inactive."});}
    if(!position.rowCount||position.rows[0].status!=="ACTIVE"){await client.query("ROLLBACK");return res.status(400).json({error:"Position does not exist or is inactive."});}
    const r=await client.query(`INSERT INTO employee_org_assignments(employee_id,org_unit_id,position_id,assignment_type,valid_from,valid_until,created_by)
      VALUES($1,$2,$3,$4,$5::date,$6::date,'admin')
      RETURNING id,employee_id,org_unit_id,position_id,assignment_type,valid_from,valid_until,status`,
      [employeeId,unitId,positionId,type,validFrom,validUntil]);
    await auditWithClient(client,"EMPLOYEE_ORG_ASSIGNMENT_CREATED","employee_org_assignment",String(r.rows[0].id),
      `employee_id=${employeeId}; unit_id=${unitId}; position_id=${positionId??"UNASSIGNED"}; type=${type}`);
    await client.query("COMMIT");
    res.status(201).json({item:r.rows[0],message:"Organizational assignment recorded. Legacy department and job-title text remains unchanged."});
  } catch(err) {
    await client.query("ROLLBACK");
    if(err.code==="23514") return res.status(409).json({error:"Assignment conflicts with the effective-date or primary-assignment rules."});
    throw err;
  } finally { client.release(); }
}));
app.get("/api/control/team/missions", asyncRoute(async (_req,res) => {
  const r=await pool.query(`SELECT m.id,m.title,m.description,m.category,m.xp_reward,m.due_at,m.status,m.created_at,
    COUNT(a.id)::int AS assigned,COUNT(a.id) FILTER (WHERE a.status='SUBMITTED')::int AS submitted,
    COUNT(a.id) FILTER (WHERE a.status='VERIFIED')::int AS verified
    FROM team_missions m LEFT JOIN mission_assignments a ON a.mission_id=m.id GROUP BY m.id ORDER BY m.created_at DESC`);
  res.json({items:r.rows});
}));
app.post("/api/control/team/missions", asyncRoute(async (req,res) => {
  const title=clean(req.body?.title,160),description=clean(req.body?.description,3000),category=clean(req.body?.category,80)||"TEAM";
  const xp=Number(req.body?.xpReward),ids=Array.isArray(req.body?.employeeIds)?[...new Set(req.body.employeeIds.map(Number).filter(n=>Number.isSafeInteger(n)&&n>0))]:[];
  if(!title || !ids.length || !Number.isInteger(xp) || xp<1 || xp>5000) return res.status(400).json({error:"Title, at least one employee, and an XP reward from 1 to 5000 are required."});
  let dueAt=null;
  if(req.body?.dueAt){const d=new Date(req.body.dueAt);if(Number.isNaN(d.getTime()))return res.status(400).json({error:"Due date is invalid."});dueAt=d.toISOString();}
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const employees=await client.query("SELECT id FROM employees WHERE active=TRUE AND id=ANY($1::bigint[])",[ids]);
    if(employees.rowCount!==ids.length){await client.query("ROLLBACK");return res.status(400).json({error:"One or more selected employee accounts are missing or inactive."});}
    const m=await client.query("INSERT INTO team_missions(title,description,category,xp_reward,due_at,created_by,status) VALUES($1,$2,$3,$4,$5,'admin','PUBLISHED') RETURNING *",[title,description,category,xp,dueAt]);
    for(const id of ids) await client.query("INSERT INTO mission_assignments(mission_id,employee_id) VALUES($1,$2)",[m.rows[0].id,id]);
    await auditWithClient(client,"MISSION_PUBLISHED","mission",String(m.rows[0].id),`Published to ${ids.length} employee(s)`);
    await client.query("COMMIT");
    res.status(201).json({item:m.rows[0],assigned:ids.length});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));
app.get("/api/control/team/submissions", asyncRoute(async (_req,res) => {
  const r=await pool.query(`SELECT a.id AS assignment_id,a.status,a.submission_note,a.submitted_at,m.id AS mission_id,m.title,m.xp_reward,
    e.id AS employee_id,e.display_name,e.email,e.department
    FROM mission_assignments a JOIN team_missions m ON m.id=a.mission_id JOIN employees e ON e.id=a.employee_id
    WHERE a.status='SUBMITTED' ORDER BY a.submitted_at ASC`);
  res.json({items:r.rows});
}));
app.post("/api/control/team/submissions/:id/review", asyncRoute(async (req,res) => {
  const decision=req.body?.decision,note=clean(req.body?.note,1500);
  if(!["VERIFIED","REJECTED"].includes(decision)) return res.status(400).json({error:"Decision must be VERIFIED or REJECTED."});
  if(decision==="REJECTED" && note.length<4) return res.status(400).json({error:"Add a short reason when returning a submission."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const r=await client.query(`UPDATE mission_assignments a SET status=$2,review_note=$3,reviewed_at=NOW(),reviewed_by='admin',
      xp_awarded=CASE WHEN $2='VERIFIED' THEN m.xp_reward ELSE 0 END,updated_at=NOW()
      FROM team_missions m WHERE a.id=$1 AND a.mission_id=m.id AND a.status='SUBMITTED'
      RETURNING a.id,a.status,a.employee_id,a.mission_id,a.xp_awarded`,[req.params.id,decision,note]);
    if(!r.rowCount){await client.query("ROLLBACK");return res.status(409).json({error:"Submission is no longer awaiting review."});}
    const item=r.rows[0];
    await auditWithClient(client,decision==="VERIFIED"?"MISSION_VERIFIED":"MISSION_RETURNED","mission",String(item.mission_id),decision==="VERIFIED"?`Verified; ${item.xp_awarded} XP awarded`:"Returned for revision");
    await client.query("COMMIT");
    res.json({item,message:decision==="VERIFIED"?`Verified. ${item.xp_awarded} XP awarded.`:"Returned to employee for revision."});
  } catch(err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
}));


app.get("/go/:slug", asyncRoute(async (req,res) => {
  const r=await pool.query("SELECT id,slug,channel,destination_url,status FROM growth_campaigns WHERE slug=$1",[clean(req.params.slug,80)]);
  if(!r.rowCount || r.rows[0].status!=="ACTIVE") return res.status(404).send("Campaign link is unavailable.");
  const campaign=r.rows[0];
  await pool.query("INSERT INTO growth_campaign_events(campaign_id,event_type) VALUES($1,'CLICK')",[campaign.id]);
  const destination=new URL(campaign.destination_url);
  destination.searchParams.set("utm_campaign",campaign.slug);
  if(!destination.searchParams.has("utm_source")) destination.searchParams.set("utm_source","trampillera");
  if(!destination.searchParams.has("utm_medium")) destination.searchParams.set("utm_medium",String(campaign.channel||"campaign").toLowerCase());
  res.redirect(302,destination.toString());
}));

// Public image delivery: discourage hotlinking and image-search indexing. This is not DRM.
app.use((req,res,next)=>{
  if(/\\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(req.path)){
    res.setHeader("X-Robots-Tag","noimageindex, noarchive");
    res.setHeader("Cross-Origin-Resource-Policy","same-site");
    res.setHeader("X-Content-Type-Options","nosniff");
  }
  next();
});
app.use(express.static(path.join(__dirname,"public"),{index:"index.html",etag:true,maxAge:NODE_ENV==="production"?"1h":0}));
app.get("/control",(_req,res)=>res.redirect(301,"/control/"));
app.get("/control/",(_req,res)=>res.sendFile(path.join(__dirname,"public/control/index.html")));
app.get("/control/index.html",(_req,res)=>res.sendFile(path.join(__dirname,"public/control/index.html")));
app.get("/ready",asyncRoute(async (_req,res)=>{await pool.query("SELECT 1");res.json({ready:true});}));
app.use((req,res)=>res.status(404).json({error:"Route not found."}));
app.use((err,_req,res,_next)=>{
  console.error(JSON.stringify({level:"error",message:err.message,stack:NODE_ENV==="development"?err.stack:undefined}));
  res.status(500).json({error:NODE_ENV==="development"?err.message:"Internal server error."});
});

await initializeDatabase();
const server=app.listen(PORT,"0.0.0.0",()=>console.log(`TRAMPILLERA UNIFIED COMPLETE listening on ${PORT}`));
async function shutdown(signal){
  console.log(`${signal}: shutting down`);
  server.close(async()=>{await pool.end();process.exit(0);});
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on("SIGTERM",()=>shutdown("SIGTERM"));
process.on("SIGINT",()=>shutdown("SIGINT"));

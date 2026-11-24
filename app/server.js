import express from "express";
import helmet from "helmet";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
import pg from "pg";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
       ('openai.gpt','OpenAI GPT provider','OpenAI','US / Cloud','CLOUD','text · vision','general reasoning · coding','DISCOVERED'),
       ('local.llama','Local LLM runtime','Local deployment','On-premise','LOCAL','text','offline inference','DISCOVERED')
       ON CONFLICT DO NOTHING`
    );
  }
}
async function audit(action, type, key="", details="", actor="admin") {
  await pool.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES($1,$2,$3,$4,$5)", [action,type,key,details,actor]);
}
async function auditWithClient(client, action, type, key="", details="", actor="admin") {
  await client.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES($1,$2,$3,$4,$5)", [action,type,key,details,actor]);
}
function requireAdmin(req,res,next) {
  if (req.session?.role === "admin" || (req.session?.authenticated === true && !req.session?.role)) return next();
  return res.status(403).json({ error: "Administrator access required." });
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
  res.json({ status:"operational", modules:m.rows[0].n, connectors:c.rows[0].n, modelProviders:p.rows[0].n, controlPlane:"available" });
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
  const now=Date.now();
  req.session = { authenticated:true, role:"admin", actor:"admin", issuedAt:now, lastSeenAt:now };
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
  return res.json({authenticated:true,role:"admin"});
}));
app.post("/api/auth/logout", (req,res) => { req.session = null; res.json({ authenticated:false }); });

app.use("/api/control", requireAuth, requireAdmin);
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
app.post("/api/control/modules/:key/lifecycle", asyncRoute(async (req,res) => {
  const key=req.params.key;
  const r=await pool.query("SELECT status FROM platform_modules WHERE key=$1",[key]);
  if(!r.rowCount) return res.status(404).json({error:"Module not found."});
  const current=r.rows[0].status;
  const next={DISCOVERED:"INSTALLED",INSTALLED:"CONFIGURED",CONFIGURED:"DISABLED",DISABLED:"INSTALLED"}[current]||"DISCOVERED";
  const updated=await pool.query("UPDATE platform_modules SET status=$2,updated_at=NOW() WHERE key=$1 RETURNING key,name,version,status,description",[key,next]);
  await audit("MODULE_LIFECYCLE_CHANGED","module",key,`${current} -> ${next}`);
  res.json({item:updated.rows[0]});
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
  aiProvider:process.env.OPENAI_API_KEY?"configured":"not_configured",
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

app.post("/api/control/ai/chat", asyncRoute(async (req,res) => {
  const message=clean(req.body?.message,4000);
  if(!message) return res.status(400).json({error:"Message is required."});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:"AI provider is not configured. Set OPENAI_API_KEY on the server to enable AI requests."});
  const response=await fetch(process.env.OPENAI_API_URL||"https://api.openai.com/v1/responses",{
    method:"POST",headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",input:message})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) return res.status(502).json({error:data.error?.message||"AI provider request failed."});
  const output=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
  await audit("AI_REQUEST_COMPLETED","ai","provider","AI response received from configured provider");
  res.json({reply:output||"The provider returned no text output."});
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

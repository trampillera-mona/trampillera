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

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "media-src": ["'self'", "blob:", "https:"],
      "connect-src": ["'self'", "https:"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
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
  `);
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
async function audit(action, type, key="", details="") {
  await pool.query("INSERT INTO audit_events(action,entity_type,entity_key,details) VALUES($1,$2,$3,$4)", [action,type,key,details]);
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
app.post("/api/auth/login", asyncRoute(async (req,res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const expected = Buffer.from(ADMIN_PASSWORD);
  const supplied = Buffer.from(password);
  const ok = expected.length === supplied.length && crypto.timingSafeEqual(expected,supplied);
  if (!ok) return res.status(401).json({ error:"Invalid administrator password." });
  req.session = { authenticated:true, issuedAt:Date.now() };
  await audit("AUTH_LOGIN","security","admin","Administrator session created");
  res.json({ authenticated:true });
}));
app.get("/api/auth/me", (req,res) => res.json({ authenticated:req.session?.authenticated === true }));
app.post("/api/auth/logout", (req,res) => { req.session = null; res.json({ authenticated:false }); });

app.use("/api/control", requireAuth);
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

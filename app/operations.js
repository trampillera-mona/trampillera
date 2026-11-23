import express from "express";
import { randomUUID } from "node:crypto";

export const OPERATIONAL_DOMAINS = {
  analytics:{label:"Analytics & Parsing",statuses:["PLANNED","READY","RUNNING","PAUSED","FAILED"]},
  connectors:{label:"Connectors",statuses:["DISCOVERED","CONFIGURED","CONNECTED","DEGRADED","DISABLED"]},
  ai:{label:"JARVISER Reactor",statuses:["DISCOVERED","CONFIGURED","AVAILABLE","DEGRADED","DISABLED"]},
  property:{label:"Property Bureau",statuses:["DRAFT","IN_REVIEW","VERIFIED","PUBLISHED","ARCHIVED"]},
  auctions:{label:"Auction House",statuses:["DRAFT","SCHEDULED","OPEN","CLOSED","CANCELLED"]},
  commerce:{label:"Commerce",statuses:["DRAFT","ACTIVE","PAUSED","FULFILMENT","COMPLETED","CANCELLED"]},
  adtech:{label:"AdTech & Affiliates",statuses:["DRAFT","SCHEDULED","RUNNING","PAUSED","COMPLETED"]},
  communications:{label:"Communications",statuses:["DRAFT","ACTIVE","MODERATED","ARCHIVED"]},
  support:{label:"Support Desk",statuses:["OPEN","IN_PROGRESS","WAITING","RESOLVED","CLOSED"]},
  media:{label:"Media Studio",statuses:["IDEA","PLANNED","IN_PRODUCTION","REVIEW","PUBLISHED","ARCHIVED"]},
  worlds:{label:"Multiverse Studio",statuses:["DRAFT","BUILDING","TESTING","PUBLISHED","PAUSED"]},
  engineering:{label:"Design Bureau & R&D",statuses:["IDEA","SPECIFICATION","IN_PROGRESS","TESTING","VERIFIED","BLOCKED"]},
  infrastructure:{label:"Infrastructure",statuses:["PLANNED","PROVISIONING","AVAILABLE","DEGRADED","MAINTENANCE","RETIRED"]},
  people:{label:"Office & HR",statuses:["INVITED","ACTIVE","ON_LEAVE","DISABLED"]},
  tasks:{label:"Tasks & Operations",statuses:["OPEN","IN_PROGRESS","BLOCKED","REVIEW","DONE","CANCELLED"]},
  treasury:{label:"Treasury Ledger",statuses:["DRAFT","SUBMITTED","APPROVED","REJECTED"]},
  payroll:{label:"Payroll & Royalties",statuses:["DRAFT","SUBMITTED","APPROVED","REJECTED"]},
  ip:{label:"IP Registry",statuses:["DRAFT","IN_REVIEW","APPROVED","LICENSED","ARCHIVED"]},
  governance:{label:"Governance & Risk",statuses:["OPEN","IN_REVIEW","MITIGATED","ACCEPTED","CLOSED"]}
};
const TRANSITIONS = {
  analytics:{PLANNED:["READY","FAILED"],READY:["RUNNING","PAUSED"],RUNNING:["PAUSED","FAILED"],PAUSED:["RUNNING","FAILED"],FAILED:["PLANNED"]},
  connectors:{DISCOVERED:["CONFIGURED","DISABLED"],CONFIGURED:["CONNECTED","DISABLED"],CONNECTED:["DEGRADED","DISABLED"],DEGRADED:["CONNECTED","DISABLED"],DISABLED:["CONFIGURED"]},
  ai:{DISCOVERED:["CONFIGURED","DISABLED"],CONFIGURED:["AVAILABLE","DEGRADED","DISABLED"],AVAILABLE:["DEGRADED","DISABLED"],DEGRADED:["AVAILABLE","DISABLED"],DISABLED:["CONFIGURED"]},
  property:{DRAFT:["IN_REVIEW","ARCHIVED"],IN_REVIEW:["DRAFT","VERIFIED"],VERIFIED:["IN_REVIEW","PUBLISHED"],PUBLISHED:["ARCHIVED"],ARCHIVED:[]},
  auctions:{DRAFT:["SCHEDULED","CANCELLED"],SCHEDULED:["OPEN","CANCELLED"],OPEN:["CLOSED","CANCELLED"],CLOSED:[],CANCELLED:[]},
  commerce:{DRAFT:["ACTIVE","CANCELLED"],ACTIVE:["PAUSED","FULFILMENT"],PAUSED:["ACTIVE","CANCELLED"],FULFILMENT:["COMPLETED","CANCELLED"],COMPLETED:[],CANCELLED:[]},
  adtech:{DRAFT:["SCHEDULED"],SCHEDULED:["RUNNING","PAUSED"],RUNNING:["PAUSED","COMPLETED"],PAUSED:["RUNNING","COMPLETED"],COMPLETED:[]},
  communications:{DRAFT:["ACTIVE","ARCHIVED"],ACTIVE:["MODERATED","ARCHIVED"],MODERATED:["ACTIVE","ARCHIVED"],ARCHIVED:[]},
  support:{OPEN:["IN_PROGRESS","CLOSED"],IN_PROGRESS:["WAITING","RESOLVED"],WAITING:["IN_PROGRESS","RESOLVED"],RESOLVED:["CLOSED","IN_PROGRESS"],CLOSED:[]},
  media:{IDEA:["PLANNED"],PLANNED:["IN_PRODUCTION"],IN_PRODUCTION:["REVIEW"],REVIEW:["IN_PRODUCTION","PUBLISHED"],PUBLISHED:["ARCHIVED"],ARCHIVED:[]},
  worlds:{DRAFT:["BUILDING"],BUILDING:["TESTING"],TESTING:["BUILDING","PUBLISHED"],PUBLISHED:["PAUSED"],PAUSED:["BUILDING"]},
  engineering:{IDEA:["SPECIFICATION"],SPECIFICATION:["IN_PROGRESS"],IN_PROGRESS:["BLOCKED","TESTING"],BLOCKED:["IN_PROGRESS"],TESTING:["IN_PROGRESS","VERIFIED"],VERIFIED:[]},
  infrastructure:{PLANNED:["PROVISIONING"],PROVISIONING:["AVAILABLE","DEGRADED"],AVAILABLE:["DEGRADED","MAINTENANCE","RETIRED"],DEGRADED:["AVAILABLE","MAINTENANCE"],MAINTENANCE:["AVAILABLE","RETIRED"],RETIRED:[]},
  people:{INVITED:["ACTIVE","DISABLED"],ACTIVE:["ON_LEAVE","DISABLED"],ON_LEAVE:["ACTIVE","DISABLED"],DISABLED:[]},
  tasks:{OPEN:["IN_PROGRESS","BLOCKED","CANCELLED"],IN_PROGRESS:["BLOCKED","REVIEW","DONE"],BLOCKED:["IN_PROGRESS","CANCELLED"],REVIEW:["IN_PROGRESS","DONE"],DONE:[],CANCELLED:[]},
  treasury:{DRAFT:["SUBMITTED"],SUBMITTED:["APPROVED","REJECTED"],APPROVED:[],REJECTED:["DRAFT"]},
  payroll:{DRAFT:["SUBMITTED"],SUBMITTED:["APPROVED","REJECTED"],APPROVED:[],REJECTED:["DRAFT"]},
  ip:{DRAFT:["IN_REVIEW","ARCHIVED"],IN_REVIEW:["DRAFT","APPROVED"],APPROVED:["LICENSED","ARCHIVED"],LICENSED:["ARCHIVED"],ARCHIVED:[]},
  governance:{OPEN:["IN_REVIEW"],IN_REVIEW:["MITIGATED","ACCEPTED","CLOSED"],MITIGATED:["IN_REVIEW","CLOSED"],ACCEPTED:["CLOSED"],CLOSED:[]}
};
const TRANSITIONS = {
analytics:{PLANNED:["READY","FAILED"],READY:["RUNNING","PAUSED"],RUNNING:["PAUSED","FAILED"],PAUSED:["RUNNING","FAILED"],FAILED:["PLANNED"]},
connectors:{DISCOVERED:["CONFIGURED","DISABLED"],CONFIGURED:["CONNECTED","DISABLED"],CONNECTED:["DEGRADED","DISABLED"],DEGRADED:["CONNECTED","DISABLED"],DISABLED:["CONFIGURED"]},
ai:{DISCOVERED:["CONFIGURED","DISABLED"],CONFIGURED:["AVAILABLE","DEGRADED","DISABLED"],AVAILABLE:["DEGRADED","DISABLED"],DEGRADED:["AVAILABLE","DISABLED"],DISABLED:["CONFIGURED"]},
property:{DRAFT:["IN_REVIEW","ARCHIVED"],IN_REVIEW:["DRAFT","VERIFIED"],VERIFIED:["IN_REVIEW","PUBLISHED"],PUBLISHED:["ARCHIVED"],ARCHIVED:[]},
auctions:{DRAFT:["SCHEDULED","CANCELLED"],SCHEDULED:["OPEN","CANCELLED"],OPEN:["CLOSED","CANCELLED"],CLOSED:[],CANCELLED:[]},
commerce:{DRAFT:["ACTIVE","CANCELLED"],ACTIVE:["PAUSED","FULFILMENT"],PAUSED:["ACTIVE","CANCELLED"],FULFILMENT:["COMPLETED","CANCELLED"],COMPLETED:[],CANCELLED:[]},
adtech:{DRAFT:["SCHEDULED"],SCHEDULED:["RUNNING","PAUSED"],RUNNING:["PAUSED","COMPLETED"],PAUSED:["RUNNING","COMPLETED"],COMPLETED:[]},
communications:{DRAFT:["ACTIVE","ARCHIVED"],ACTIVE:["MODERATED","ARCHIVED"],MODERATED:["ACTIVE","ARCHIVED"],ARCHIVED:[]},
support:{OPEN:["IN_PROGRESS","CLOSED"],IN_PROGRESS:["WAITING","RESOLVED"],WAITING:["IN_PROGRESS","RESOLVED"],RESOLVED:["CLOSED","IN_PROGRESS"],CLOSED:[]},
media:{IDEA:["PLANNED"],PLANNED:["IN_PRODUCTION"],IN_PRODUCTION:["REVIEW"],REVIEW:["IN_PRODUCTION","PUBLISHED"],PUBLISHED:["ARCHIVED"],ARCHIVED:[]},
worlds:{DRAFT:["BUILDING"],BUILDING:["TESTING"],TESTING:["BUILDING","PUBLISHED"],PUBLISHED:["PAUSED"],PAUSED:["BUILDING"]},
engineering:{IDEA:["SPECIFICATION"],SPECIFICATION:["IN_PROGRESS"],IN_PROGRESS:["BLOCKED","TESTING"],BLOCKED:["IN_PROGRESS"],TESTING:["IN_PROGRESS","VERIFIED"],VERIFIED:[]},
infrastructure:{PLANNED:["PROVISIONING"],PROVISIONING:["AVAILABLE","DEGRADED"],AVAILABLE:["DEGRADED","MAINTENANCE","RETIRED"],DEGRADED:["AVAILABLE","MAINTENANCE"],MAINTENANCE:["AVAILABLE","RETIRED"],RETIRED:[]},
people:{INVITED:["ACTIVE","DISABLED"],ACTIVE:["ON_LEAVE","DISABLED"],ON_LEAVE:["ACTIVE","DISABLED"],DISABLED:[]},
tasks:{OPEN:["IN_PROGRESS","BLOCKED","CANCELLED"],IN_PROGRESS:["BLOCKED","REVIEW","DONE"],BLOCKED:["IN_PROGRESS","CANCELLED"],REVIEW:["IN_PROGRESS","DONE"],DONE:[],CANCELLED:[]},
treasury:{DRAFT:["SUBMITTED"],SUBMITTED:["APPROVED","REJECTED"],APPROVED:[],REJECTED:["DRAFT"]},
payroll:{DRAFT:["SUBMITTED"],SUBMITTED:["APPROVED","REJECTED"],APPROVED:[],REJECTED:["DRAFT"]},
ip:{DRAFT:["IN_REVIEW","ARCHIVED"],IN_REVIEW:["DRAFT","APPROVED"],APPROVED:["LICENSED","ARCHIVED"],LICENSED:["ARCHIVED"],ARCHIVED:[]},
governance:{OPEN:["IN_REVIEW"],IN_REVIEW:["MITIGATED","ACCEPTED","CLOSED"],MITIGATED:["IN_REVIEW","CLOSED"],ACCEPTED:["CLOSED"],CLOSED:[]}
};
const cleanText=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const validDomain=(d)=>Object.hasOwn(OPERATIONAL_DOMAINS,d);
const safePayload=(v)=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const asyncRoute=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

export async function initializeOperations(pool){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS control_records(
      id BIGSERIAL PRIMARY KEY, record_key UUID NOT NULL UNIQUE, domain TEXT NOT NULL,
      title TEXT NOT NULL, status TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      version INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL DEFAULT 'admin',
      updated_by TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS control_records_domain_updated_idx ON control_records(domain,updated_at DESC);
    CREATE INDEX IF NOT EXISTS control_records_status_idx ON control_records(status);
  `);
}
export function createOperationsRouter({pool}){
  const router=express.Router();
  router.use((req,res,next)=>{
    const origin=req.get("origin");
    if(origin){try{if(new URL(origin).host!==req.get("host"))return res.status(403).json({error:"Cross-origin request rejected."})}catch{return res.status(403).json({error:"Invalid request origin."})}}
    next();
  });
  router.get("/domains",(_req,res)=>res.json({items:Object.entries(OPERATIONAL_DOMAINS).map(([key,value])=>({key,...value,transitions:TRANSITIONS[key]}))}));
  router.get("/summary",asyncRoute(async(_req,res)=>{
    const [counts,recent,finance]=await Promise.all([
      pool.query("SELECT domain,status,COUNT(*)::int AS count FROM control_records GROUP BY domain,status ORDER BY domain,status"),
      pool.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE created_at>=NOW()-INTERVAL '24 hours')::int AS last24h FROM control_records"),
      pool.query("SELECT COUNT(*)::int AS entries,COALESCE(SUM(CASE WHEN payload->>'amount' ~ '^[0-9]+([.][0-9]+)?::numeric(18,2) AS pending_amount FROM control_records WHERE domain IN ('treasury','payroll')")
    ]);
    res.json({counts:counts.rows,total:recent.rows[0].total,last24h:recent.rows[0].last24h,finance:{entries:finance.rows[0].entries,pendingAmount:finance.rows[0].pending_amount},evidence:"Counts and amounts are calculated from persisted control_records. They are not bank balances or executed payments."});
  }));
  router.get("/records",asyncRoute(async(req,res)=>{
    const domain=cleanText(req.query.domain,40);
    if(!validDomain(domain))return res.status(400).json({error:"A valid domain query parameter is required."});
    const q=cleanText(req.query.q,120),status=cleanText(req.query.status,40),limit=Math.min(200,Math.max(1,Number.parseInt(req.query.limit,10)||100));
    const result=await pool.query(`SELECT id,record_key,domain,title,status,payload,version,created_by,updated_by,created_at,updated_at FROM control_records WHERE domain=$1 AND ($2='' OR status=$2) AND ($3='' OR title ILIKE '%'||$3||'%' OR payload::text ILIKE '%'||$3||'%') ORDER BY updated_at DESC LIMIT $4`,[domain,status,q,limit]);
    res.json({items:result.rows});
  }));
  router.get("/records/:id/history",asyncRoute(async(req,res)=>{
    const result=await pool.query("SELECT action,entity_type,entity_key,details,actor,created_at FROM audit_events WHERE entity_key=$1 ORDER BY created_at DESC LIMIT 50",[cleanText(req.params.id,80)]);
    res.json({items:result.rows});
  }));
  router.post("/records",asyncRoute(async(req,res)=>{
    const domain=cleanText(req.body?.domain,40),definition=OPERATIONAL_DOMAINS[domain],title=cleanText(req.body?.title,180),status=cleanText(req.body?.status,40)||(definition&&definition.statuses[0]),payload=safePayload(req.body?.payload);
    if(!definition)return res.status(400).json({error:"Unknown operational domain."});
    if(!title)return res.status(400).json({error:"Record title is required."});
    if(status!==definition.statuses[0])return res.status(400).json({error:"New records must start in the first lifecycle state: "+definition.statuses[0]});
    if(JSON.stringify(payload).length>12000)return res.status(400).json({error:"Record payload is too large."});
    if(["treasury","payroll"].includes(domain)&&payload.amount!==undefined&&(!Number.isFinite(Number(payload.amount))||Number(payload.amount)<0))return res.status(400).json({error:"Financial amount must be a non-negative number."});
    if(["treasury","payroll"].includes(domain)&&payload.amount!==undefined&&(!Number.isFinite(Number(payload.amount))||Number(payload.amount)<0))return res.status(400).json({error:"Financial amount must be a non-negative number."});
    const key=randomUUID(),client=await pool.connect();
    try{
      await client.query("BEGIN");
      const result=await client.query("INSERT INTO control_records(record_key,domain,title,status,payload,created_by,updated_by) VALUES($1,$2,$3,$4,$5::jsonb,'admin','admin') RETURNING id,record_key,domain,title,status,payload,version,created_by,updated_by,created_at,updated_at",[key,domain,title,status,JSON.stringify(payload)]);
      await client.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES('OPERATIONAL_RECORD_CREATED',$1,$2,$3,'admin')",[domain,key,JSON.stringify({title,status})]);
      await client.query("COMMIT");
      res.status(201).json({item:result.rows[0],audit:"COMMITTED_WITH_RECORD"});
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
  }));
  router.patch("/records/:id",asyncRoute(async(req,res)=>{
    const id=Number.parseInt(req.params.id,10),expectedVersion=Number.parseInt(req.body?.expectedVersion,10);
    if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:"Invalid record id."});
    if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)return res.status(400).json({error:"expectedVersion is required for concurrency control."});
    const title=req.body?.title===undefined?undefined:cleanText(req.body.title,180),status=req.body?.status===undefined?undefined:cleanText(req.body.status,40),patch=req.body?.payload===undefined?undefined:safePayload(req.body.payload);
    if(title!==undefined&&!title)return res.status(400).json({error:"Title cannot be empty."});
    if(patch!==undefined&&JSON.stringify(patch).length>12000)return res.status(400).json({error:"Record payload is too large."});
    if(patch!==undefined&&["treasury","payroll"].includes(req.body?.domain)&&patch.amount!==undefined&&(!Number.isFinite(Number(patch.amount))||Number(patch.amount)<0))return res.status(400).json({error:"Financial amount must be a non-negative number."});
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const current=await client.query("SELECT * FROM control_records WHERE id=$1 FOR UPDATE",[id]);
      if(!current.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Record not found."})}
      const row=current.rows[0];
      if(patch!==undefined&&["treasury","payroll"].includes(row.domain)&&patch.amount!==undefined&&(!Number.isFinite(Number(patch.amount))||Number(patch.amount)<0)){await client.query("ROLLBACK");return res.status(400).json({error:"Financial amount must be a non-negative number."})}
      if(row.version!==expectedVersion){await client.query("ROLLBACK");return res.status(409).json({error:"Record changed since it was loaded. Refresh and retry.",currentVersion:row.version})}
      const definition=OPERATIONAL_DOMAINS[row.domain];
      if(status!==undefined&&status!==row.status&&!(TRANSITIONS[row.domain]?.[row.status]||[]).includes(status)){await client.query("ROLLBACK");return res.status(409).json({error:"Lifecycle transition is not allowed.",currentStatus:row.status,allowedNext:TRANSITIONS[row.domain]?.[row.status]||[]})}
      const nextTitle=title===undefined?row.title:title,nextStatus=status===undefined?row.status:status,nextPayload=patch===undefined?row.payload:{...row.payload,...patch};
      const updated=await client.query("UPDATE control_records SET title=$2,status=$3,payload=$4::jsonb,version=version+1,updated_by='admin',updated_at=NOW() WHERE id=$1 RETURNING id,record_key,domain,title,status,payload,version,created_by,updated_by,created_at,updated_at",[id,nextTitle,nextStatus,JSON.stringify(nextPayload)]);
      await client.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES('OPERATIONAL_RECORD_UPDATED',$1,$2,$3,'admin')",[row.domain,row.record_key,JSON.stringify({fromVersion:row.version,toVersion:row.version+1,changes:{title:title!==undefined,status:status!==undefined,payload:patch!==undefined}})]);
      await client.query("COMMIT");
      res.json({item:updated.rows[0],audit:"COMMITTED_WITH_RECORD"});
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
  }));
  return router;
}
 THEN (payload->>'amount')::numeric ELSE 0 END) FILTER(WHERE domain='treasury' AND status IN ('SUBMITTED','APPROVED')),0)::numeric(18,2) AS pending_amount FROM control_records WHERE domain IN ('treasury','payroll')")
    ]);
    res.json({counts:counts.rows,total:recent.rows[0].total,last24h:recent.rows[0].last24h,finance:{entries:finance.rows[0].entries,pendingAmount:finance.rows[0].pending_amount},evidence:"Counts and amounts are calculated from persisted control_records. They are not bank balances or executed payments."});
  }));
  router.get("/records",asyncRoute(async(req,res)=>{
    const domain=cleanText(req.query.domain,40);
    if(!validDomain(domain))return res.status(400).json({error:"A valid domain query parameter is required."});
    const q=cleanText(req.query.q,120),status=cleanText(req.query.status,40),limit=Math.min(200,Math.max(1,Number.parseInt(req.query.limit,10)||100));
    const result=await pool.query(`SELECT id,record_key,domain,title,status,payload,version,created_by,updated_by,created_at,updated_at FROM control_records WHERE domain=$1 AND ($2='' OR status=$2) AND ($3='' OR title ILIKE '%'||$3||'%' OR payload::text ILIKE '%'||$3||'%') ORDER BY updated_at DESC LIMIT $4`,[domain,status,q,limit]);
    res.json({items:result.rows});
  }));
  router.get("/records/:id/history",asyncRoute(async(req,res)=>{
    const result=await pool.query("SELECT action,entity_type,entity_key,details,actor,created_at FROM audit_events WHERE entity_key=$1 ORDER BY created_at DESC LIMIT 50",[cleanText(req.params.id,80)]);
    res.json({items:result.rows});
  }));
  router.post("/records",asyncRoute(async(req,res)=>{
    const domain=cleanText(req.body?.domain,40),definition=OPERATIONAL_DOMAINS[domain],title=cleanText(req.body?.title,180),status=cleanText(req.body?.status,40)||(definition&&definition.statuses[0]),payload=safePayload(req.body?.payload);
    if(!definition)return res.status(400).json({error:"Unknown operational domain."});
    if(!title)return res.status(400).json({error:"Record title is required."});
    if(status!==definition.statuses[0])return res.status(400).json({error:"New records must start in the first lifecycle state: "+definition.statuses[0]});
    if(JSON.stringify(payload).length>12000)return res.status(400).json({error:"Record payload is too large."});
    if(["treasury","payroll"].includes(domain)&&payload.amount!==undefined&&(!Number.isFinite(Number(payload.amount))||Number(payload.amount)<0))return res.status(400).json({error:"Financial amount must be a non-negative number."});
    if(["treasury","payroll"].includes(domain)&&payload.amount!==undefined&&(!Number.isFinite(Number(payload.amount))||Number(payload.amount)<0))return res.status(400).json({error:"Financial amount must be a non-negative number."});
    const key=randomUUID(),client=await pool.connect();
    try{
      await client.query("BEGIN");
      const result=await client.query("INSERT INTO control_records(record_key,domain,title,status,payload,created_by,updated_by) VALUES($1,$2,$3,$4,$5::jsonb,'admin','admin') RETURNING id,record_key,domain,title,status,payload,version,created_by,updated_by,created_at,updated_at",[key,domain,title,status,JSON.stringify(payload)]);
      await client.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES('OPERATIONAL_RECORD_CREATED',$1,$2,$3,'admin')",[domain,key,JSON.stringify({title,status})]);
      await client.query("COMMIT");
      res.status(201).json({item:result.rows[0],audit:"COMMITTED_WITH_RECORD"});
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
  }));
  router.patch("/records/:id",asyncRoute(async(req,res)=>{
    const id=Number.parseInt(req.params.id,10),expectedVersion=Number.parseInt(req.body?.expectedVersion,10);
    if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:"Invalid record id."});
    if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)return res.status(400).json({error:"expectedVersion is required for concurrency control."});
    const title=req.body?.title===undefined?undefined:cleanText(req.body.title,180),status=req.body?.status===undefined?undefined:cleanText(req.body.status,40),patch=req.body?.payload===undefined?undefined:safePayload(req.body.payload);
    if(title!==undefined&&!title)return res.status(400).json({error:"Title cannot be empty."});
    if(patch!==undefined&&JSON.stringify(patch).length>12000)return res.status(400).json({error:"Record payload is too large."});
    if(patch!==undefined&&["treasury","payroll"].includes(req.body?.domain)&&patch.amount!==undefined&&(!Number.isFinite(Number(patch.amount))||Number(patch.amount)<0))return res.status(400).json({error:"Financial amount must be a non-negative number."});
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const current=await client.query("SELECT * FROM control_records WHERE id=$1 FOR UPDATE",[id]);
      if(!current.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Record not found."})}
      const row=current.rows[0];
      if(row.version!==expectedVersion){await client.query("ROLLBACK");return res.status(409).json({error:"Record changed since it was loaded. Refresh and retry.",currentVersion:row.version})}
      const definition=OPERATIONAL_DOMAINS[row.domain];
      if(status!==undefined&&status!==row.status&&!(TRANSITIONS[row.domain]?.[row.status]||[]).includes(status)){await client.query("ROLLBACK");return res.status(409).json({error:"Lifecycle transition is not allowed.",currentStatus:row.status,allowedNext:TRANSITIONS[row.domain]?.[row.status]||[]})}
      const nextTitle=title===undefined?row.title:title,nextStatus=status===undefined?row.status:status,nextPayload=patch===undefined?row.payload:{...row.payload,...patch};
      const updated=await client.query("UPDATE control_records SET title=$2,status=$3,payload=$4::jsonb,version=version+1,updated_by='admin',updated_at=NOW() WHERE id=$1 RETURNING id,record_key,domain,title,status,payload,version,created_by,updated_by,created_at,updated_at",[id,nextTitle,nextStatus,JSON.stringify(nextPayload)]);
      await client.query("INSERT INTO audit_events(action,entity_type,entity_key,details,actor) VALUES('OPERATIONAL_RECORD_UPDATED',$1,$2,$3,'admin')",[row.domain,row.record_key,JSON.stringify({fromVersion:row.version,toVersion:row.version+1,changes:{title:title!==undefined,status:status!==undefined,payload:patch!==undefined}})]);
      await client.query("COMMIT");
      res.json({item:updated.rows[0],audit:"COMMITTED_WITH_RECORD"});
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
  }));
  return router;
}

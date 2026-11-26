import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";

const router = express.Router();
const clean = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validWebsite = (value) => {
  if (!value) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
};
const publicIntakeLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." }
});
const referenceCode = () => "TP-" + new Date().toISOString().slice(0,10).replaceAll("-","") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
const INQUIRY_TRANSITIONS = { NEW:["REVIEWING","LOST"], REVIEWING:["QUALIFIED","LOST"], QUALIFIED:["PROPOSAL","LOST"], PROPOSAL:["NEGOTIATION","WON","LOST"], NEGOTIATION:["PROPOSAL","WON","LOST"], WON:[], LOST:["REVIEWING"] };
const PARTNER_TRANSITIONS = { PENDING:["REVIEWING","REJECTED"], REVIEWING:["APPROVED","REJECTED"], APPROVED:[], REJECTED:["REVIEWING"] };

async function notifyBusinessSubmission(payload) {
  const url = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_SECRET;
  if (!url || !secret) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret }),
      signal: AbortSignal.timeout(5000),
      redirect: "follow"
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) throw new Error("Webhook rejected notification");
    return true;
  } catch (error) {
    // Intake is already stored. Email failure must never discard the submission.
    console.error(JSON.stringify({ level: "warn", event: "business_email_notification_failed", error: error?.name || "Error" }));
    return false;
  }
}

export function createBusinessRouter({ pool, requireAdmin, audit }) {
  if (!pool || typeof requireAdmin !== "function" || typeof audit !== "function") {
    throw new TypeError("Business router requires pool, requireAdmin and audit dependencies.");
  }

  router.post("/api/business/inquiries", publicIntakeLimit, async (req, res, next) => {
    try {
      // Honeypot: bots fill hidden fields; discard without exposing validation details.
      if (clean(req.body?.companyFax, 120)) return res.status(202).json({ accepted: true });
      const organization = clean(req.body?.organization, 160);
      const contact = clean(req.body?.contactName, 120);
      const email = clean(req.body?.email, 254).toLowerCase();
      const website = clean(req.body?.website, 500);
      const type = clean(req.body?.requestType, 20).toUpperCase();
      const subject = clean(req.body?.subject, 180);
      const message = clean(req.body?.message, 5000);
      const consent = req.body?.consent === true;
      if (contact.length < 2 || !validEmail(email) || !validWebsite(website) ||
          !["SERVICE","PRODUCT","PARTNERSHIP","OTHER"].includes(type) ||
          subject.length < 3 || message.length < 20 || !consent) {
        return res.status(400).json({ error: "Please provide valid contact details, a request type, a short subject, a message of at least 20 characters, and consent." });
      }
      const ref = referenceCode();
      const result = await pool.query(
        `INSERT INTO business_inquiries
          (reference_code,organization_name,contact_name,contact_email,website,request_type,subject,message,consent_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         RETURNING reference_code,created_at`,
        [ref, organization, contact, email, website, type, subject, message]
      );
      await audit("BUSINESS_INQUIRY_RECEIVED","business_inquiry",ref,"Public inquiry received: "+type,"public");
      await notifyBusinessSubmission({ kind: "business inquiry", reference: ref, organization, contactName: contact, email, subject, message });
      return res.status(201).json({ accepted: true, reference: result.rows[0].reference_code, receivedAt: result.rows[0].created_at });
    } catch (error) { return next(error); }
  });

  router.post("/api/business/partner-applications", publicIntakeLimit, async (req, res, next) => {
    try {
      if (clean(req.body?.companyFax, 120)) return res.status(202).json({ accepted: true });
      const organization = clean(req.body?.organization, 160);
      const contact = clean(req.body?.contactName, 120);
      const email = clean(req.body?.email, 254).toLowerCase();
      const website = clean(req.body?.website, 500);
      const capabilities = clean(req.body?.capabilities, 2500);
      const message = clean(req.body?.message, 3000);
      if (organization.length < 2 || contact.length < 2 || !validEmail(email) ||
          !validWebsite(website) || capabilities.length < 20 || req.body?.consent !== true) {
        return res.status(400).json({ error: "Please provide organization, contact details, capabilities (at least 20 characters), and consent." });
      }
      const result = await pool.query(
        `INSERT INTO business_partner_applications
          (organization_name,contact_name,contact_email,website,capabilities,message,consent_at)
         VALUES($1,$2,$3,$4,$5,$6,NOW())
         RETURNING id,created_at`,
        [organization, contact, email, website, capabilities, message]
      );
      await audit("BUSINESS_PARTNER_APPLICATION_RECEIVED","partner_application",String(result.rows[0].id),"Public partner application received","public");
      await notifyBusinessSubmission({ kind: "partner application", applicationId: result.rows[0].id, organization, contactName: contact, email, capabilities, message });
      return res.status(201).json({ accepted: true, applicationId: result.rows[0].id, receivedAt: result.rows[0].created_at });
    } catch (error) { return next(error); }
  });

  router.use("/api/control/business", requireAdmin);

  router.get("/api/control/business/overview", async (_req, res, next) => {
    try {
      const [inquiries, partners, recent] = await Promise.all([
        pool.query("SELECT stage,COUNT(*)::int AS count FROM business_inquiries GROUP BY stage"),
        pool.query("SELECT status,COUNT(*)::int AS count FROM business_partner_applications GROUP BY status"),
        pool.query("SELECT id,reference_code,organization_name,contact_name,request_type,subject,stage,created_at FROM business_inquiries ORDER BY created_at DESC LIMIT 8")
      ]);
      res.set("Cache-Control","no-store");
      res.json({ inquiries: inquiries.rows, partners: partners.rows, recent: recent.rows });
    } catch (error) { next(error); }
  });

  router.get("/api/control/business/inquiries", async (req, res, next) => {
    try {
      const stage = clean(req.query.stage, 20).toUpperCase();
      const allowed = ["NEW","REVIEWING","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"];
      if (stage && !allowed.includes(stage)) return res.status(400).json({ error: "Invalid inquiry stage." });
      const result = stage
        ? await pool.query("SELECT * FROM business_inquiries WHERE stage=$1 ORDER BY created_at DESC LIMIT 200",[stage])
        : await pool.query("SELECT * FROM business_inquiries ORDER BY created_at DESC LIMIT 200");
      res.set("Cache-Control","no-store");
      res.json({ items: result.rows });
    } catch (error) { next(error); }
  });

  router.patch("/api/control/business/inquiries/:id", async (req, res, next) => {
    try {
      const stage = clean(req.body?.stage, 20).toUpperCase();
      const notes = clean(req.body?.internalNotes, 4000);
      const value = req.body?.estimatedValue === undefined ? null : Number(req.body.estimatedValue);
      const currency = req.body?.currency === undefined ? null : clean(req.body.currency, 3).toUpperCase();
      const nextAction = req.body?.nextActionAt === undefined || req.body.nextActionAt === "" ? null : new Date(req.body.nextActionAt);
      const allowed = ["NEW","REVIEWING","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"];
      if (!allowed.includes(stage) || (value !== null && (!Number.isFinite(value) || value < 0 || value > 1000000000)) ||
          (currency !== null && !["EUR","USD","RSD"].includes(currency)) ||
          (nextAction && Number.isNaN(nextAction.getTime()))) {
        return res.status(400).json({ error: "Invalid stage, estimated value, currency or next-action date." });
      }
      const current = await pool.query("SELECT stage FROM business_inquiries WHERE id=$1",[req.params.id]);
      if (!current.rowCount) return res.status(404).json({ error: "Inquiry not found." });
      if (!INQUIRY_TRANSITIONS[current.rows[0].stage]?.includes(stage)) {
        return res.status(409).json({ error: "This inquiry stage transition is not allowed.", currentStage: current.rows[0].stage, allowedNext: INQUIRY_TRANSITIONS[current.rows[0].stage] || [] });
      }
      const result = await pool.query(
        `UPDATE business_inquiries SET stage=$2,internal_notes=$3,
          estimated_value=COALESCE($4,estimated_value),currency=COALESCE($5,currency),
          next_action_at=$6,updated_at=NOW()
         WHERE id=$1 AND stage=$7 RETURNING id,reference_code,stage,estimated_value,currency,next_action_at,updated_at`,
        [req.params.id,stage,notes,value,currency,nextAction,current.rows[0].stage]
      );
      if (!result.rowCount) return res.status(409).json({ error: "Inquiry changed during review. Refresh and retry." });
      await audit("BUSINESS_INQUIRY_UPDATED","business_inquiry",result.rows[0].reference_code,"Stage set to "+stage);
      res.json({ item: result.rows[0] });
    } catch (error) { next(error); }
  });

  router.get("/api/control/business/partners", async (_req, res, next) => {
    try {
      const result = await pool.query("SELECT * FROM business_partner_applications ORDER BY created_at DESC LIMIT 200");
      res.set("Cache-Control","no-store");
      res.json({ items: result.rows });
    } catch (error) { next(error); }
  });

  router.patch("/api/control/business/partners/:id", async (req, res, next) => {
    try {
      const status = clean(req.body?.status, 20).toUpperCase();
      const notes = clean(req.body?.internalNotes, 4000);
      if (!["PENDING","REVIEWING","APPROVED","REJECTED"].includes(status)) return res.status(400).json({ error: "Invalid partner application status." });
      const current = await pool.query("SELECT status FROM business_partner_applications WHERE id=$1",[req.params.id]);
      if (!current.rowCount) return res.status(404).json({ error: "Partner application not found." });
      if (!PARTNER_TRANSITIONS[current.rows[0].status]?.includes(status)) {
        return res.status(409).json({ error: "This partner application transition is not allowed.", currentStatus: current.rows[0].status, allowedNext: PARTNER_TRANSITIONS[current.rows[0].status] || [] });
      }
      const result = await pool.query(
        "UPDATE business_partner_applications SET status=$2,internal_notes=$3,reviewed_at=CASE WHEN $2 IN ('APPROVED','REJECTED') THEN NOW() ELSE reviewed_at END,updated_at=NOW() WHERE id=$1 AND status=$4 RETURNING id,organization_name,status,updated_at",
        [req.params.id,status,notes,current.rows[0].status]
      );
      if (!result.rowCount) return res.status(409).json({ error: "Partner application changed during review. Refresh and retry." });
      await audit("BUSINESS_PARTNER_APPLICATION_UPDATED","partner_application",String(result.rows[0].id),"Status set to "+status);
      res.json({ item: result.rows[0] });
    } catch (error) { next(error); }
  });

  return router;
}

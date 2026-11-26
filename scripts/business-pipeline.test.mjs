import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../app/server.js", import.meta.url), "utf8");
const business = await readFile(new URL("../app/business.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../app/migrations/0005_business_pipeline.sql", import.meta.url), "utf8");
const publicPage = await readFile(new URL("../app/public/business/index.html", import.meta.url), "utf8");
const controlPage = await readFile(new URL("../app/public/control/business/index.html", import.meta.url), "utf8");
const portal = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");
const controlNav = await readFile(new URL("../app/public/control/index.html", import.meta.url), "utf8");

test("business router is mounted with the existing authenticated administrator boundary", () => {
  assert.match(server, /createBusinessRouter/);
  assert.match(server, /app\.use\(createBusinessRouter\(\{pool,requireAdmin,audit\}\)\)/);
  assert.match(business, /router\.use\("\/api\/control\/business", requireAdmin\)/);
});

test("public intake validates consent, rate limits submissions and stores durable records", () => {
  assert.match(business, /publicIntakeLimit/);
  assert.match(business, /req\.body\?\.consent !== true/);
  assert.match(business, /\/api\/business\/inquiries/);
  assert.match(business, /\/api\/business\/partner-applications/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS business_inquiries/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS business_partner_applications/);
  assert.match(migration, /consent_at TIMESTAMPTZ NOT NULL/);
  assert.doesNotMatch(migration, /ip_address|user_agent|fingerprint/i);
});

test("pipeline transitions and partner decisions are bounded and auditable", () => {
  assert.match(business, /INQUIRY_TRANSITIONS = \{ NEW:\["REVIEWING","LOST"\]/);
  assert.match(business, /WON:\[\], LOST:\["REVIEWING"\]/);
  assert.match(business, /PARTNER_TRANSITIONS = \{ PENDING:\["REVIEWING","REJECTED"\]/);
  assert.match(business, /BUSINESS_INQUIRY_UPDATED/);
  assert.match(business, /BUSINESS_PARTNER_APPLICATION_UPDATED/);
  assert.match(controlPage, /Commercial Operations Desk/);
  assert.match(controlPage, /No simulated entries/);
  assert.match(portal, /trampillera-business-link/);
  assert.match(controlNav, /href="\/control\/business\/"/);
});

test("email relay is optional, secret-protected and cannot block durable intake", () => {
  assert.match(business, /GOOGLE_APPS_SCRIPT_WEBHOOK_URL/);
  assert.match(business, /GOOGLE_APPS_SCRIPT_WEBHOOK_SECRET/);
  assert.match(business, /AbortSignal\.timeout\(5000\)/);
  assert.match(business, /Email failure must never discard the submission/);
  assert.match(business, /business_email_notification_failed/);
  assert.match(business, /await notifyBusinessSubmission/);
  assert.match(business, /GmailApp/);
  assert.match(business, /TRAMPILLERA_WEBHOOK_SECRET/);
  assert.match(business, /TRAMPILLERA_NOTIFY_TO/);
});

test("public intake does not claim to charge money or auto-approve partners", () => {
  assert.match(publicPage, /does not create a contract/i);
  assert.match(controlPage, /does not send email, contact prospects, create contracts, publish offers, or collect payments/i);
  assert.doesNotMatch(business, /nodemailer|sendMail|stripe|paypal/i);
});

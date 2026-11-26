import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../app/server.js", import.meta.url), "utf8");
const business = await readFile(new URL("../app/business.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../app/migrations/0005_business_pipeline.sql", import.meta.url), "utf8");
const publicPage = await readFile(new URL("../app/public/business/index.html", import.meta.url), "utf8");
const controlPage = await readFile(new URL("../app/public/control/business/index.html", import.meta.url), "utf8");

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
  assert.match(business, /"NEW","REVIEWING","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"/);
  assert.match(business, /"PENDING","REVIEWING","APPROVED","REJECTED"/);
  assert.match(business, /BUSINESS_INQUIRY_UPDATED/);
  assert.match(business, /BUSINESS_PARTNER_APPLICATION_UPDATED/);
  assert.match(controlPage, /Commercial Operations Desk/);
  assert.match(controlPage, /No simulated entries/);
});

test("public intake does not claim to send email, charge money or auto-approve partners", () => {
  assert.match(publicPage, /does not create a contract/i);
  assert.match(controlPage, /does not send email, contact prospects, create contracts, publish offers, or collect payments/i);
  assert.doesNotMatch(business, /nodemailer|sendMail|stripe|paypal/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../app/server.js", import.meta.url), "utf8");
const portal = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");
const tracker = await readFile(new URL("../app/public/shared/trampillera-analytics.js", import.meta.url), "utf8");
const growth = await readFile(new URL("../app/public/control/growth/index.html", import.meta.url), "utf8");

test("visitor analytics uses aggregate first-party identifiers without raw IP storage", () => {
  assert.match(server, /CREATE TABLE IF NOT EXISTS site_visitors/);
  assert.match(server, /CREATE TABLE IF NOT EXISTS site_pageviews/);
  assert.match(server, /audience\.growth/);
  assert.match(server, /utm_source/);
  assert.match(server, /utm_medium/);
  assert.match(server, /createHmac\("sha256",SESSION_SECRET\)/);
  assert.match(server, /\/api\/analytics\/visit/);
  assert.match(server, /\/api\/analytics\/counter/);
  assert.doesNotMatch(server, /INSERT INTO site_visitors[^\n]*ip_address/i);
  assert.match(tracker, /localStorage/);
  assert.match(tracker, /trampillera\.analytics\.consent\.v1/);
  assert.match(tracker, /removeItem\(storageKey\)/);
  assert.match(portal, /visitor-consent/);
  assert.match(tracker, /utm_campaign/);
  assert.match(portal, /trampillera-analytics\.js/);
  assert.match(portal, /visitor-counter-value/);
});

test("growth desk exposes authenticated reporting and campaign lifecycle", () => {
  assert.match(server, /\/api\/control\/analytics\/summary/);
  assert.match(server, /\/api\/control\/growth\/campaigns/);
  assert.match(server, /\/go\/:slug/);
  assert.match(server, /GROWTH_CAMPAIGN_CREATED/);
  assert.match(growth, /Audience Intelligence Desk/);
  assert.match(growth, /Promotion Campaign Studio/);
  assert.match(growth, /data-toggle/);
});
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const registryPath = "app/public/worlds-play/provenance/registry.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const errors = [];
const ids = new Set();
const paths = new Set();

function fail(message) { errors.push(message); }

if (registry.schema !== "trampillera.provenance.registry.v1.1") fail("Unexpected registry schema version.");
if (registry.standard !== "TMP-BPS-STD-001") fail("Registry does not reference TMP-BPS-STD-001.");
if (registry.brand !== "TRAMPILLERA") fail("Registry brand must be TRAMPILLERA.");
if (!Array.isArray(registry.assets) || registry.assets.length === 0) fail("Registry assets must be a non-empty array.");

for (const [index, asset] of (registry.assets ?? []).entries()) {
  const label = asset?.id ?? `asset at index ${index}`;
  for (const field of ["id", "title", "path", "type", "version", "origin_type", "attribution", "rights_status", "issued"]) {
    if (typeof asset?.[field] !== "string" || !asset[field].trim()) fail(`${label}: missing required field ${field}.`);
  }
  if (ids.has(asset.id)) fail(`${label}: duplicate asset ID.`);
  ids.add(asset.id);
  if (paths.has(asset.path)) fail(`${label}: duplicate canonical path.`);
  paths.add(asset.path);

  if (!/^[A-Z0-9][A-Z0-9-]{5,63}$/.test(asset.id ?? "")) fail(`${label}: invalid asset ID format.`);
  if (!/^\/worlds-play\/.+/.test(asset.path ?? "")) fail(`${label}: canonical path must be under /worlds-play/.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asset.issued ?? "")) fail(`${label}: issued must use YYYY-MM-DD.`);
  if (!["first-party-original", "commissioned", "partner-provided", "licensed-third-party", "user-generated", "derivative"].includes(asset.origin_type)) fail(`${label}: unsupported origin_type.`);

  const relative = asset.path?.replace(/^\//, "app/public/");
  if (!relative || !fs.existsSync(relative) || !fs.statSync(relative).isFile()) {
    fail(`${label}: registered file does not exist at ${relative ?? "(missing path)"}.`);
    continue;
  }
  const source = fs.readFileSync(relative, "utf8");
  if (!source.includes(asset.id)) fail(`${label}: source file does not contain its registered asset ID.`);
  if (!source.includes("TRAMPILLERA")) fail(`${label}: source file has no TRAMPILLERA attribution marker.`);
  if (relative.endsWith(".svg") && !source.includes("<metadata")) fail(`${label}: SVG has no embedded metadata block.`);
}

if (errors.length) {
  console.error("TRAMPILLERA provenance validation FAILED:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`TRAMPILLERA provenance validation passed: ${registry.assets.length} registered assets, unique IDs and paths, source files and attribution markers verified.`);
console.log("Note: this validates registry consistency, not cryptographic integrity, legal ownership or trademark registration.");

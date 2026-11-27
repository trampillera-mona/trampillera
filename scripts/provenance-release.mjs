#!/usr/bin/env node
/**
 * TRAMPILLERA provenance release utility.
 *
 * Commands:
 *   node scripts/provenance-release.mjs keygen [directory]
 *   node scripts/provenance-release.mjs manifest
 *   node scripts/provenance-release.mjs sign [private-key.pem]
 *   node scripts/provenance-release.mjs verify [public-key.pem]
 *
 * Private keys are generated locally and must never be committed or uploaded.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = "app/public/worlds-play/provenance";
const registryFile = path.join(root, base, "registry.json");
const manifestFile = path.join(root, base, "release-manifest.json");
const signatureFile = path.join(root, base, "release-manifest.sig.json");
const command = process.argv[2] ?? "help";

function readRegistry() {
  return JSON.parse(fs.readFileSync(registryFile, "utf8"));
}
function canonical(value) {
  return JSON.stringify(value, null, 2) + "\n";
}
function collectManifest() {
  const registry = readRegistry();
  const assets = registry.assets.map((asset) => {
    const file = path.join(root, "app/public", asset.path.replace(/^\//, ""));
    const bytes = fs.readFileSync(file);
    return {
      id: asset.id,
      path: asset.path,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      size_bytes: bytes.length
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return {
    schema: "trampillera.provenance.release-manifest.v1",
    brand: "TRAMPILLERA",
    product: registry.product,
    release: registry.release,
    issued: registry.issued,
    hash_algorithm: "SHA-256",
    signature_status: "unsigned-until-signed",
    notice: "Hashes detect content changes relative to this manifest. Publisher authenticity requires a valid Ed25519 signature verified against a separately trusted public key.",
    assets
  };
}
function fail(message) {
  console.error(message);
  process.exit(1);
}

if (command === "keygen") {
  const dir = path.resolve(process.argv[3] ?? "private/provenance");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const privatePath = path.join(dir, "trampillera-provenance-ed25519-private.pem");
  const publicPath = path.join(dir, "trampillera-provenance-ed25519-public.pem");
  fs.writeFileSync(privatePath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600, flag: "wx" });
  fs.writeFileSync(publicPath, publicKey.export({ type: "spki", format: "pem" }), { flag: "wx" });
  const fingerprint = crypto.createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex");
  console.log("Ed25519 keypair generated locally.");
  console.log("PRIVATE KEY — keep offline; never commit or upload:", privatePath);
  console.log("PUBLIC KEY — publish/pin independently:", publicPath);
  console.log("Public-key SHA-256 fingerprint:", fingerprint);
} else if (command === "manifest") {
  const manifest = collectManifest();
  fs.writeFileSync(manifestFile, canonical(manifest));
  console.log(`Wrote SHA-256 manifest for ${manifest.assets.length} registered assets: ${manifestFile}`);
} else if (command === "sign") {
  const privateArg = process.argv[3] ?? process.env.TRAMPILLERA_PROVENANCE_PRIVATE_KEY;
  if (!privateArg) fail("Provide a local private-key path or TRAMPILLERA_PROVENANCE_PRIVATE_KEY. Never store the private key in the repository.");
  const privatePath = path.resolve(privateArg);
  if (!fs.existsSync(privatePath)) fail("Provide a local private-key path or TRAMPILLERA_PROVENANCE_PRIVATE_KEY. Never store the private key in the repository.");
  if (!fs.existsSync(manifestFile)) fail("Release manifest missing. Run the manifest command first.");
  const privateKey = fs.readFileSync(privatePath, "utf8");
  const key = crypto.createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== "ed25519") fail("Signing key must be Ed25519.");
  const publicKey = crypto.createPublicKey(key);
  const bytes = fs.readFileSync(manifestFile);
  const signature = crypto.sign(null, bytes, key).toString("base64");
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  const fingerprint = crypto.createHash("sha256").update(publicDer).digest("hex");
  fs.writeFileSync(signatureFile, canonical({
    schema: "trampillera.provenance.detached-signature.v1",
    algorithm: "Ed25519",
    key_fingerprint_sha256: fingerprint,
    signature_base64: signature
  }));
  console.log("Detached Ed25519 signature written:", signatureFile);
  console.log("Pin this public-key fingerprint in a trusted verifier before treating signatures as authenticated:", fingerprint);
} else if (command === "verify") {
  const publicArg = process.argv[3];
  if (!publicArg) fail("Supply the trusted public key path as the second argument.");
  const publicPath = path.resolve(publicArg);
  if (!fs.existsSync(manifestFile) || !fs.existsSync(signatureFile)) fail("Manifest or detached signature is missing.");
  if (!fs.existsSync(publicPath)) fail("Supply the trusted public key path as the second argument.");
  const manifestBytes = fs.readFileSync(manifestFile);
  const signature = JSON.parse(fs.readFileSync(signatureFile, "utf8"));
  const publicKey = crypto.createPublicKey(fs.readFileSync(publicPath, "utf8"));
  if (publicKey.asymmetricKeyType !== "ed25519") fail("Verification key must be Ed25519.");
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  const fingerprint = crypto.createHash("sha256").update(publicDer).digest("hex");
  if (fingerprint !== signature.key_fingerprint_sha256) fail("Public-key fingerprint mismatch.");
  if (!crypto.verify(null, manifestBytes, publicKey, Buffer.from(signature.signature_base64, "base64"))) fail("Manifest signature INVALID.");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  for (const item of manifest.assets) {
    const file = path.join(root, "app/public", item.path.replace(/^\//, ""));
    const bytes = fs.readFileSync(file);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    if (digest !== item.sha256 || bytes.length !== item.size_bytes) fail(`Asset integrity mismatch: ${item.id}`);
  }
  console.log(`VALID: Ed25519 signature and SHA-256 integrity verified for ${manifest.assets.length} assets.`);
} else {
  console.log("TRAMPILLERA provenance release utility");
  console.log("Commands: keygen [directory] | manifest | sign [private-key.pem] | verify [trusted-public-key.pem]");
}

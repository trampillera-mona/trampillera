import crypto from "node:crypto";
import { decryptTotpSecret } from "./totp.js";

const RECOVERY_CODE_BYTES = 24;
const RECOVERY_SELECTOR_BYTES = 8;
const RECOVERY_CODE_COUNT = 10;
const SCRYPT = Object.freeze({ N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

function derive(value, salt) {
  return crypto.scryptSync(value, salt, 32, SCRYPT);
}

export function parseRecoveryCode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{64}$/.test(normalized)) return null;
  return { selector: normalized.slice(0, 16), secret: normalized.slice(16) };
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError("Recovery code count must be between 1 and 20.");
  }
  const records = Array.from({ length: count }, () => {
    const selector = crypto.randomBytes(RECOVERY_SELECTOR_BYTES).toString("hex").toUpperCase();
    const secret = crypto.randomBytes(RECOVERY_CODE_BYTES).toString("hex").toUpperCase();
    return { selector, secret, code: selector + secret, verifier: hashRecoverySecret(secret) };
  });
  return { codes: records.map((record) => record.code), records: records.map(({ selector, verifier }) => ({ selector, verifier })) };
}

function normalizeRecoverySecret(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-F0-9]{48}$/.test(normalized) ? normalized : null;
}

function hashRecoverySecret(secret) {
  const normalized = normalizeRecoverySecret(secret);
  if (!normalized) throw new TypeError("Invalid recovery secret format.");
  const salt = crypto.randomBytes(16);
  const digest = derive(normalized, salt);
  return "scrypt-recovery-v1$" + salt.toString("base64url") + "$" + digest.toString("base64url");
}

export function verifyRecoveryCode(code, verifier) {
  const parsed = parseRecoveryCode(code);
  if (!parsed || typeof verifier !== "string") return false;
  const parts = verifier.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt-recovery-v1") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  if (salt.length !== 16 || expected.length !== 32) return false;
  const actual = derive(parsed.secret, salt);
  return crypto.timingSafeEqual(actual, expected);
}

function decodeKeyring(keyring, activeKeyId) {
  if (!keyring || typeof keyring !== "object" || Array.isArray(keyring)) throw new TypeError("A keyring object is required.");
  if (typeof activeKeyId !== "string" || !/^[a-zA-Z0-9_-]{1,32}$/.test(activeKeyId)) throw new TypeError("A valid active key ID is required.");
  const keys = new Map();
  for (const [id, encoded] of Object.entries(keyring)) {
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id) || typeof encoded !== "string") throw new TypeError("Invalid keyring entry.");
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32 || key.toString("base64") !== encoded) throw new TypeError("Each key must be canonical Base64 for exactly 32 random bytes.");
    keys.set(id, key);
  }
  if (!keys.has(activeKeyId)) throw new Error("The active key ID is missing from the keyring.");
  return keys;
}

export function encryptTotpWithKeyring(secret, keyring, activeKeyId) {
  if (typeof secret !== "string" || !secret) throw new TypeError("A TOTP secret is required.");
  const keys = decodeKeyring(keyring, activeKeyId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keys.get(activeKeyId), iv);
  cipher.setAAD(Buffer.from("trampillera:psl:totp:v2:" + activeKeyId));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v2", activeKeyId, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTotpWithKeyring(envelope, keyring, legacyMasterKey) {
  const value = String(envelope || "");
  if (value.startsWith("v1.")) {
    if (!legacyMasterKey) throw new Error("Legacy TOTP key is required to decrypt a v1 envelope.");
    return decryptTotpSecret(value, legacyMasterKey);
  }
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== "v2") throw new Error("Unsupported TOTP secret envelope.");
  const [, keyId, ivPart, tagPart, ciphertextPart] = parts;
  const keys = decodeKeyring(keyring, keyId);
  const key = keys.get(keyId);
  if (!key) throw new Error("The TOTP envelope references a key that is not present in the keyring.");
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length < 1) throw new Error("Malformed TOTP secret envelope.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from("trampillera:psl:totp:v2:" + keyId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function rotateTotpEnvelope(envelope, keyring, activeKeyId, legacyMasterKey) {
  const plaintext = decryptTotpWithKeyring(envelope, keyring, legacyMasterKey);
  return encryptTotpWithKeyring(plaintext, keyring, activeKeyId);
}

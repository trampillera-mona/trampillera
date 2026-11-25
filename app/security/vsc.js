import crypto from "node:crypto";

export const VSC_TOKEN_IDS = Object.freeze([
  "ember", "sun", "leaf", "aqua", "sky",
  "indigo", "violet", "rose", "silver", "graphite"
]);
const TOKEN_SET = new Set(VSC_TOKEN_IDS);

export function normalizeVscSequence(sequence) {
  if (!Array.isArray(sequence) || sequence.length !== 6 ||
      sequence.some(token => typeof token !== "string" || !TOKEN_SET.has(token))) {
    throw new TypeError("Visual security code must contain six valid tokens.");
  }
  return sequence.join("|");
}

export function createVscVerifier(sequence) {
  const normalized = normalizeVscSequence(sequence);
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(normalized, salt, 32, {
    N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024
  });
  return "scrypt-v1$" + salt.toString("base64url") + "$" + derived.toString("base64url");
}

export function verifyVscSequence(sequence, verifier) {
  let normalized;
  try { normalized = normalizeVscSequence(sequence); } catch { return false; }
  const parts = String(verifier || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt-v1") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  if (salt.length !== 16 || expected.length !== 32) return false;
  const actual = crypto.scryptSync(normalized, salt, 32, {
    N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024
  });
  return crypto.timingSafeEqual(actual, expected);
}

import crypto from "node:crypto";
export function createInvitationToken(){return crypto.randomBytes(32).toString("base64url")}
export function hashInvitationToken(token){if(typeof token!=="string"||!/^[A-Za-z0-9_-]{40,60}$/.test(token))throw new TypeError("Invalid invitation token");return crypto.createHash("sha256").update(token).digest("hex")}
export function normalizePartnerEmail(value){return typeof value==="string"?value.trim().toLowerCase():""}
export function isValidPartnerEmail(value){return typeof value==="string"&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}

export function buildPartnerInvitationUrl(publicAppUrl, token) {
  hashInvitationToken(token);
  let base;
  try { base = new URL(publicAppUrl); } catch { throw new TypeError("PUBLIC_APP_URL must be a valid HTTPS origin"); }
  if (base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new TypeError("PUBLIC_APP_URL must be a clean HTTPS origin without credentials, path, query or fragment");
  }
  return `${base.origin}/city/workspace/#invite=${encodeURIComponent(token)}`;
}

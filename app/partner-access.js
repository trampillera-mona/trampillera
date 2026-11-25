import crypto from "node:crypto";
export function createInvitationToken(){return crypto.randomBytes(32).toString("base64url")}
export function hashInvitationToken(token){if(typeof token!=="string"||!/^[A-Za-z0-9_-]{40,60}$/.test(token))throw new TypeError("Invalid invitation token");return crypto.createHash("sha256").update(token).digest("hex")}
export function normalizePartnerEmail(value){return typeof value==="string"?value.trim().toLowerCase():""}
export function isValidPartnerEmail(value){return typeof value==="string"&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}

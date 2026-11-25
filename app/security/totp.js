import crypto from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function encodeBase32(input) {
  const bytes = Buffer.from(input);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(input) {
  if (typeof input !== "string" || !/^[A-Z2-7]+=*$/i.test(input)) {
    throw new TypeError("Invalid Base32 secret.");
  }
  const normalized = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of normalized) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new TypeError("Invalid Base32 secret.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpSecret(bytes = 20) {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 64) {
    throw new RangeError("TOTP secret length must be between 16 and 64 bytes.");
  }
  return encodeBase32(crypto.randomBytes(bytes));
}

export function totpCode(secret, timeMs = Date.now()) {
  if (!Number.isFinite(timeMs) || timeMs < 0) throw new TypeError("Invalid TOTP time.");
  const key = decodeBase32(secret);
  const counter = BigInt(Math.floor(timeMs / 1000 / STEP_SECONDS));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = crypto.createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % (10 ** DIGITS)).padStart(DIGITS, "0");
}

export function matchingTotpCounter(secret, token, timeMs = Date.now(), window = 1) {
  if (typeof token !== "string" || !/^\d{6}$/.test(token)) return null;
  if (!Number.isFinite(timeMs) || timeMs < 0 || !Number.isInteger(window) || window < 0 || window > 2) return null;
  const supplied = Buffer.from(token);
  const current = BigInt(Math.floor(timeMs / 1000 / STEP_SECONDS));
  // Prefer the newest matching step so a rare six-digit collision cannot roll the counter backward.
  for (let offset = window; offset >= -window; offset -= 1) {
    const counter = current + BigInt(offset);
    if (counter < 0n) continue;
    const expected = Buffer.from(totpCode(secret, Number(counter) * STEP_SECONDS * 1000));
    if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) {
      return counter.toString();
    }
  }
  return null;
}

export function verifyTotp(secret, token, timeMs = Date.now(), window = 1) {
  return matchingTotpCounter(secret, token, timeMs, window) !== null;
}

function encryptionKey(masterKey) {
  if (typeof masterKey !== "string" || Buffer.byteLength(masterKey, "utf8") < 32) {
    throw new Error("PSL_ENCRYPTION_KEY must contain at least 32 bytes.");
  }
  return Buffer.from(crypto.hkdfSync(
    "sha256",
    Buffer.from(masterKey, "utf8"),
    Buffer.from("trampillera-psl-v1", "utf8"),
    Buffer.from("totp-secret-encryption", "utf8"),
    32
  ));
}

export function encryptTotpSecret(secret, masterKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(masterKey), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTotpSecret(envelope, masterKey) {
  const parts = String(envelope || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Unsupported TOTP secret envelope.");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length < 16) {
    throw new Error("Malformed TOTP secret envelope.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(masterKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function buildOtpAuthUri(secret, accountLabel, issuer = "TRAMPILLERA") {
  const label = String(accountLabel || "").trim();
  const safeIssuer = String(issuer || "").trim();
  if (!label || !safeIssuer || label.length > 254 || safeIssuer.length > 64) {
    throw new TypeError("A valid account label and issuer are required.");
  }
  const path = encodeURIComponent(safeIssuer + ":" + label);
  const query = new URLSearchParams({
    secret,
    issuer: safeIssuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS)
  });
  return "otpauth://totp/" + path + "?" + query.toString();
}

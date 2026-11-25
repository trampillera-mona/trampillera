import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeBase32, decodeBase32, generateTotpSecret, totpCode, verifyTotp,
  encryptTotpSecret, decryptTotpSecret, buildOtpAuthUri, matchingTotpCounter
} from "../app/security/totp.js";

test("Base32 encodes and decodes RFC 4648 vectors", () => {
  assert.equal(encodeBase32(Buffer.from("foo")), "MZXW6");
  assert.equal(decodeBase32("MZXW6").toString(), "foo");
  assert.equal(encodeBase32(Buffer.from("foobar")), "MZXW6YTBOI");
  assert.equal(decodeBase32("MZXW6YTBOI").toString(), "foobar");
});

test("TOTP matches RFC 6238 SHA-1 six-digit vector at 59 seconds", () => {
  const secret = encodeBase32(Buffer.from("12345678901234567890"));
  assert.equal(totpCode(secret, 59000), "287082");
  assert.equal(verifyTotp(secret, "287082", 59000, 0), true);
  assert.equal(matchingTotpCounter(secret, "287082", 59000, 0), "1");
  assert.equal(matchingTotpCounter(secret, "287083", 59000, 0), null);
  assert.equal(verifyTotp(secret, "287083", 59000, 0), false);
});

test("verification accepts only six digits and bounded clock windows", () => {
  const secret = generateTotpSecret();
  const now = 1_700_000_000_000;
  assert.equal(verifyTotp(secret, totpCode(secret, now), now), true);
  assert.equal(verifyTotp(secret, "12345", now), false);
  assert.equal(verifyTotp(secret, "1234567", now), false);
  assert.equal(verifyTotp(secret, "abcdef", now), false);
  assert.equal(verifyTotp(secret, "123456", now, 3), false);
});

test("generated secrets have cryptographic length and valid Base32 encoding", () => {
  const secret = generateTotpSecret();
  assert.equal(decodeBase32(secret).length, 20);
  assert.throws(() => generateTotpSecret(8), /between 16 and 64/);
});

test("TOTP secret encryption uses authenticated encryption and rejects tampering", () => {
  const masterKey = "test-only-master-key-with-at-least-32-bytes";
  const secret = generateTotpSecret();
  const envelope = encryptTotpSecret(secret, masterKey);
  assert.equal(decryptTotpSecret(envelope, masterKey), secret);
  assert.throws(() => decryptTotpSecret(envelope, "different-test-master-key-at-least-32"), /Unsupported|authenticate|Unsupported state|unable to authenticate/i);
  const parts = envelope.split(".");
  parts[3] = Buffer.from("tampered-value-that-is-long-enough").toString("base64url");
  assert.throws(() => decryptTotpSecret(parts.join("."), masterKey));
  assert.throws(() => encryptTotpSecret(secret, "short"), /at least 32 bytes/);
});

test("otpauth URI carries issuer, algorithm, digits and period", () => {
  const uri = buildOtpAuthUri("JBSWY3DPEHPK3PXP", "admin@example.test");
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /issuer=TRAMPILLERA/);
  assert.match(uri, /algorithm=SHA1/);
  assert.match(uri, /digits=6/);
  assert.match(uri, /period=30/);
});


test("matching TOTP counter reports the accepted adjacent time step", () => {
  const secret = encodeBase32(Buffer.from("12345678901234567890"));
  assert.equal(matchingTotpCounter(secret, totpCode(secret, 30000), 59000, 1), "1");
  assert.equal(matchingTotpCounter(secret, "000000", 59000, 1), null);
  assert.equal(matchingTotpCounter(secret, "287082", -1, 1), null);
});

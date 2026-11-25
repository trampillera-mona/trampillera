import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode, encryptTotpWithKeyring, decryptTotpWithKeyring, rotateTotpEnvelope } from "../app/security/recovery-keyring.js";
import { encryptTotpSecret } from "../app/security/totp.js";

test("recovery codes are high-entropy, unique, salted and verifiable", () => {
  const generated = generateRecoveryCodes();
  assert.equal(generated.codes.length, 10);
  assert.equal(new Set(generated.codes).size, 10);
  assert.equal(generated.verifiers.length, 10);
  assert.ok(generated.codes.every((code) => /^[A-F0-9]{48}$/.test(code)));
  assert.ok(generated.codes.every((code, index) => verifyRecoveryCode(code, generated.verifiers[index])));
  assert.ok(generated.codes.every((code, index) => !verifyRecoveryCode(generated.codes[(index + 1) % 10], generated.verifiers[index])));
  assert.notEqual(hashRecoveryCode(generated.codes[0]), hashRecoveryCode(generated.codes[0]));
  assert.equal(verifyRecoveryCode("wrong", generated.verifiers[0]), false);
});

test("recovery code format and generation bounds are enforced", () => {
  assert.throws(() => generateRecoveryCodes(0));
  assert.throws(() => generateRecoveryCodes(21));
  assert.throws(() => hashRecoveryCode("short"));
  assert.equal(verifyRecoveryCode(null, "bad"), false);
});

test("versioned TOTP keyring encrypts and decrypts with key ID binding", () => {
  const oldKey = crypto.randomBytes(32).toString("base64");
  const newKey = crypto.randomBytes(32).toString("base64");
  const oldRing = { key_2026_01: oldKey };
  const envelope = encryptTotpWithKeyring("JBSWY3DPEHPK3PXP", oldRing, "key_2026_01");
  assert.match(envelope, /^v2\.key_2026_01\./);
  assert.equal(decryptTotpWithKeyring(envelope, oldRing), "JBSWY3DPEHPK3PXP");
  assert.throws(() => decryptTotpWithKeyring(envelope, { key_2026_02: newKey }));
  const rotatedRing = { key_2026_01: oldKey, key_2026_02: newKey };
  const rotated = rotateTotpEnvelope(envelope, rotatedRing, "key_2026_02");
  assert.match(rotated, /^v2\.key_2026_02\./);
  assert.equal(decryptTotpWithKeyring(rotated, rotatedRing), "JBSWY3DPEHPK3PXP");
  assert.equal(decryptTotpWithKeyring(envelope, rotatedRing), "JBSWY3DPEHPK3PXP");
});

test("legacy v1 envelopes can be read and migrated without losing the old key", () => {
  const legacyKey = crypto.randomBytes(32).toString("hex");
  const legacy = encryptTotpSecret("JBSWY3DPEHPK3PXP", legacyKey);
  const nextKey = crypto.randomBytes(32).toString("base64");
  const migrated = rotateTotpEnvelope(legacy, { key_2026_02: nextKey }, "key_2026_02", legacyKey);
  assert.match(migrated, /^v2\.key_2026_02\./);
  assert.equal(decryptTotpWithKeyring(migrated, { key_2026_02: nextKey }), "JBSWY3DPEHPK3PXP");
});

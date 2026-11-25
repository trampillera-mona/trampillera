import test from "node:test";
import assert from "node:assert/strict";
import { createVscVerifier, verifyVscSequence, normalizeVscSequence, VSC_TOKEN_IDS } from "../app/security/vsc.js";

const sample = ["ember", "sun", "leaf", "aqua", "sky", "indigo"];

test("VSC accepts six known token IDs and preserves order", () => {
  assert.equal(normalizeVscSequence(sample), sample.join("|"));
  assert.equal(VSC_TOKEN_IDS.length, 10);
  assert.throws(() => normalizeVscSequence(["ember", "sun"]));
  assert.throws(() => normalizeVscSequence(["ember", "sun", "leaf", "aqua", "sky", "unknown"]));
});

test("VSC verifier is salted, one-way and verifies the exact sequence", () => {
  const first = createVscVerifier(sample);
  const second = createVscVerifier(sample);
  assert.notEqual(first, second);
  assert.match(first, /^scrypt-v1\$/);
  assert.equal(verifyVscSequence(sample, first), true);
  assert.equal(verifyVscSequence(["sun", "ember", "leaf", "aqua", "sky", "indigo"], first), false);
  assert.equal(verifyVscSequence(sample, second), true);
  assert.equal(verifyVscSequence(["invalid"], first), false);
});

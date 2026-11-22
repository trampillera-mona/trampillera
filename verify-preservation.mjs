import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const pairs = [
  ["originals/trampillera-platform-full.original.html","app/public/index.html","platform source"],
  ["originals/trampillera-control-plane-preview.original.html","app/public/control/index.html","control plane source"]
];
const hash = (b) => createHash("sha256").update(b).digest("hex");
for (const [original,served,label] of pairs) {
  const a=readFileSync(new URL(`../${original}`,import.meta.url));
  const b=readFileSync(new URL(`../${served}`,import.meta.url));
  assert.ok(a.length>1000,`${label}: original source missing`);
  const expected = label === "platform source"
    ? "a9b4c6129e1c1ba3ead6cdac87e838ba296eed9b69d3c8a1a6ab9cdb60cfee92"
    : "3c03a27a36db9e08b678a255551cb25c9908a8373cd14552706545dcf7abdda6";
  assert.equal(hash(a),expected,`${label}: original uploaded source changed`);
  assert.ok(b.length>1000,`${label}: served interface missing`);
  console.log(`${label}: original ${a.length} bytes (${hash(a)}); deployed ${b.length} bytes (${hash(b)})`);
}
const platform=readFileSync(new URL("../app/public/index.html",import.meta.url),"utf8");
const control=readFileSync(new URL("../app/public/control/index.html",import.meta.url),"utf8");
assert.match(platform,/href="\/control\/"/,"platform shortcut must target Control Plane");
assert.match(control,/\/api\/control/,"Control Plane must call the shared API");
assert.match(control,/tp-login/,"Control Plane must include authentication gate");
console.log("Interface integration checks passed.");

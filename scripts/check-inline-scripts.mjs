import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const targets = [
  "app/public/control/index.html",
  "app/public/city/team/index.html"
];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trampillera-inline-check-"));
let checked = 0;
try {
  for (const file of targets) {
    const html = fs.readFileSync(file, "utf8");
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    let index = 0;
    for (const match of scripts) {
      const attrs = match[1] || "";
      if (/\bsrc\s*=/.test(attrs) || /application\/(ld\+json|json)/i.test(attrs)) continue;
      const source = match[2] || "";
      if (!source.trim()) continue;
      const target = path.join(temp, "inline-" + checked + ".js");
      fs.writeFileSync(target, source, "utf8");
      const result = spawnSync(process.execPath, ["--check", target], { encoding: "utf8" });
      if (result.status !== 0) {
        process.stderr.write("Inline script syntax error in " + file + " (script " + (index + 1) + "):\n" + (result.stderr || result.stdout));
        process.exitCode = 1;
        break;
      }
      checked += 1;
      index += 1;
    }
    if (process.exitCode) break;
  }
  if (!process.exitCode) console.log("Inline script syntax verified: " + checked + " blocks across " + targets.length + " pages.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

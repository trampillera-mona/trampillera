import { createRequire } from "node:module";
const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const base = process.env.PSL_BROWSER_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

async function checkSurface(path, expectedType, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  let submitted = null;
  await page.route("**/api/auth/me", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: false })
  }));
  await page.route("**/api/auth/recovery/reset", async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Security factors reset. Sign in again and enroll a new authenticator." })
    });
  });
  page.on("dialog", dialog => dialog.accept());

  try {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: "Recover account access" });
    await trigger.waitFor({ state: "visible" });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    if (await dialog.getAttribute("aria-modal") !== "true") throw new Error("Recovery dialog is not modal.");
    if (!(await dialog.getAttribute("aria-labelledby"))) throw new Error("Recovery dialog has no accessible title reference.");

    if (expectedType === "employee") {
      await dialog.getByLabel("Work email").fill("browser-test@example.invalid");
    }
    const password = dialog.getByLabel("Account password");
    const recoveryCode = dialog.getByLabel("One-time recovery code");
    if (!(await password.evaluate(node => node === document.activeElement))) {
      throw new Error("Initial focus did not move to the password field.");
    }
    await password.fill("browser-test-password");
    await recoveryCode.fill("selector.secret-browser-test");
    await dialog.getByRole("button", { name: "Reset security factors" }).click();
    await page.getByRole("heading", { name: "Recovery accepted" }).waitFor({ state: "visible" });

    if (!submitted) throw new Error("Recovery reset request was not sent.");
    if (submitted.accountType !== expectedType) throw new Error("Wrong account type submitted: " + submitted.accountType);
    if (submitted.password !== "browser-test-password") throw new Error("Password payload did not match the entered value.");
    if (submitted.recoveryCode !== "selector.secret-browser-test") throw new Error("Recovery code payload did not match the entered value.");
    if (expectedType === "employee" && submitted.email !== "browser-test@example.invalid") throw new Error("Employee email was not submitted.");

    const successText = await dialog.innerText();
    if (!successText.includes("You are not signed in")) throw new Error("Recovery UI does not clearly state that recovery did not sign in the user.");
    results.push({ path, viewport: viewport.width + "x" + viewport.height, status: "PASS" });
  } catch (error) {
    failures.push({ path, message: error.message });
    await page.screenshot({ path: "/tmp/psl-browser-" + expectedType + ".png", fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}

try {
  await checkSurface("/control/", "admin", { width: 1440, height: 900 });
  await checkSurface("/city/team/", "employee", { width: 390, height: 844 });
} finally {
  await browser.close();
}

for (const result of results) console.log("PSL browser check PASS:", JSON.stringify(result));
if (failures.length) {
  for (const failure of failures) console.error("PSL browser check FAIL:", JSON.stringify(failure));
  process.exitCode = 1;
} else {
  console.log("PSL browser checks: 2/2 passed.");
}

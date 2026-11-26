/**
 * TRAMPILLERA business-intake email relay.
 * Deploy as a Google Apps Script Web App (execute as you; access: anyone).
 * Script Properties:
 *   TRAMPILLERA_WEBHOOK_SECRET = same random 32+ character secret as Render
 *   TRAMPILLERA_NOTIFY_TO = TRAMPILLERA@gmail.com
 */
function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty("TRAMPILLERA_WEBHOOK_SECRET");
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (_) {
    return jsonResponse({ ok: false, error: "invalid_payload" });
  }
  if (!expected || typeof data.secret !== "string" || data.secret !== expected) {
    return jsonResponse({ ok: false, error: "unauthorized" });
  }
  const recipient = props.getProperty("TRAMPILLERA_NOTIFY_TO");
  if (!recipient) return jsonResponse({ ok: false, error: "recipient_not_configured" });
  const kind = safeText(data.kind, 60) || "business submission";
  const reference = safeText(data.reference || data.applicationId, 80);
  const details = [
    "A new submission has been stored in the TRAMPILLERA business pipeline.",
    "",
    "Type: " + kind,
    "Reference: " + reference,
    "Organization: " + safeText(data.organization, 160),
    "Contact: " + safeText(data.contactName, 120),
    "Email: " + safeText(data.email, 254),
    "Subject: " + safeText(data.subject, 180),
    "",
    "Message / capabilities:",
    safeText(data.message || data.capabilities, 5000),
    "",
    "Open the authenticated Business Operations Desk to review the full record."
  ];
  try {
    GmailApp.sendEmail(recipient, "[TRAMPILLERA] New " + kind, details.join("\n"), {
      name: "TRAMPILLERA Business Desk",
      replyTo: "TRAMPILLERA@gmail.com"
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("TRAMPILLERA notification send failed: " + (error && error.name || "Error"));
    return jsonResponse({ ok: false, error: "send_failed" });
  }
}
function safeText(value, maxLength) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, maxLength) : String(value || "").slice(0, maxLength);
}
function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

# TRAMPILLERA Gmail notification relay

This optional relay sends an internal email to the existing TRAMPILLERA Gmail inbox when a public business inquiry or partner application has been committed to PostgreSQL.

## Security and behavior
- The intake API stores the submission first. A relay outage never rolls back the record or changes the successful intake response.
- The relay is disabled until both Render environment variables are configured.
- The shared secret is never committed to this repository. Do not paste it into chat, source files, or GitHub.
- The Apps Script endpoint is public at the transport layer, but rejects requests without the shared secret.
- Notifications contain contact details and submitted message text. Keep the Apps Script project restricted to the account owner.
- This is an email notification only. It does not send a reply to the applicant, create a contract, or approve a partner.

## 1. Create the Apps Script
1. Sign in to the Google account that owns the TRAMPILLERA Gmail inbox.
2. Open https://script.google.com/ and create a standalone project named TRAMPILLERA Business Notifications.
3. Replace the editor contents with the code in google-apps-script/BusinessNotificationRelay.gs.
4. In Project Settings → Script Properties, add:
   - TRAMPILLERA_WEBHOOK_SECRET: a newly generated random secret of at least 32 characters.
   - TRAMPILLERA_NOTIFY_TO: TRAMPILLERA@gmail.com.
5. Save the project.

Generate the secret locally in a trusted password manager or with a secure random generator. Do not reuse an account password.

## 2. Deploy the Web App
1. Select Deploy → New deployment → Web app.
2. Set Execute as to Me.
3. Set Who has access to Anyone (the application-level shared secret protects the endpoint).
4. Deploy and authorize Gmail sending when Google prompts.
5. Copy the Web App URL. Treat it as configuration data; do not commit it.

## 3. Configure the application
In the Render service that runs the TRAMPILLERA Node application, add these environment variables:
- GOOGLE_APPS_SCRIPT_WEBHOOK_URL: the deployed Web App URL.
- GOOGLE_APPS_SCRIPT_WEBHOOK_SECRET: exactly the same secret stored in Apps Script.

Do not add either value to GitHub. Save the Render environment changes only when you are ready to enable notifications. A service restart/redeploy may be required for environment changes to take effect.

## 4. Verify
Submit one clearly marked test inquiry through the live business form. Confirm:
1. The form returns its normal accepted response and reference.
2. The record appears in the authenticated Business Operations Desk.
3. A matching notification arrives in the TRAMPILLERA Gmail inbox.

If the email does not arrive, check the Apps Script Executions page and application logs for business_email_notification_failed. The database record remains authoritative even if email delivery fails.

## Current status
Code is prepared in the feature branch. The relay is not active until the Apps Script deployment and the two Render environment variables are configured. No production service, database, or environment variable is changed by this repository update.
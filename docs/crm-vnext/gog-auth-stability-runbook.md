# CRM vNext - gog Auth Stability Runbook

Date: 2026-05-21
Status: active runbook; OAuth app moved to production on 2026-05-21

## Goal

Keep the local `gog` Google Workspace read-only evidence lane stable for Mantis/OpenClaw CRM work.

This lane powers read-only evidence searches across:

- Gmail
- Contacts / People
- Drive
- Docs
- Sheets

It must not send email, mutate Google data, print tokens, or expose personal content in logs.

## Current OAuth Client

- Account: `saludoalsol@gmail.com`
- gog client: `default`
- OAuth project number: `807471998270`
- Google Auth Platform publishing status: `In production`
- Audience/user type: `External`
- Local credentials path: `~/Library/Application Support/gogcli/credentials.json`
- Current CRM command:

```bash
npm run crm:vnext:gog-healthcheck -- \
  --account saludoalsol@gmail.com \
  --out ~/Documents/Mantis-Reports/crm_vnext_gog_healthcheck_<date>.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_gog_healthcheck_<date>.md \
  --fail-on-blocked
```

## Likely Root Cause

The observed pattern matches Google's documented Testing-mode refresh-token behavior:

- `gog` was reauthorized on 2026-05-11.
- It failed again by 2026-05-20/21 with `invalid_grant`.
- Google says projects configured with publishing status `Testing` expire test-user authorizations after seven days when the app receives a refresh token for scopes beyond basic profile/email.

Official references:

- https://support.google.com/cloud/answer/15549945
- https://developers.google.com/workspace/guides/configure-oauth-consent

## Durable Fix

Move the OAuth app from `Testing` to `In production`, if the project is safe and intended for Alejandro's own internal/personal automation.

This was completed on 2026-05-21 for project `807471998270`.

Expected effect:

- Stops the seven-day Testing-mode refresh-token expiration pattern.
- The app may still show an unverified-app warning if scopes are sensitive/restricted and app verification has not been completed.
- Tokens can still fail for other Google-documented reasons: manual revocation, six months of inactivity, Gmail password change, token limits, admin policies, or security events.

Privacy boundary:

- This is not intended to be distributed, marketed, embedded in third-party workflows, or used by anyone other than Alejandro's local Mantis/OpenClaw/Codex CRM infrastructure.
- Because Google currently shows the app as `External`, production status is not a strict "only our domain can authorize" boundary.
- Practical access remains private as long as the OAuth client configuration, local credential files, and refresh tokens are not shared.
- Do not paste tokens, OAuth codes, client secrets, or credential files into Telegram, reports, commits, prompts, screenshots, or logs.
- If strict domain-only authorization becomes necessary, create a separate Workspace/internal OAuth setup instead of broadening this one.

## Console Checklist

Use the Google Cloud Console with the owner/editor account for project `807471998270`.

1. Open Google Auth Platform > Audience:
   - https://console.cloud.google.com/auth/audience?project=807471998270
2. Confirm the project/app is the `gog` OAuth client used by this Mac.
3. Check publishing status:
   - If `Testing`, choose `Publish app` / move to `In production`.
   - If already `In production`, the instability is coming from another cause.
4. If Google asks for app details, keep the app description honest and internal:
   - purpose: local read-only Google Workspace evidence retrieval for Alejandro's private CRM automation;
   - scopes: read-only Gmail, Contacts/People, Drive, Docs, Sheets;
   - no outbound sending.
5. Do not add broader scopes unless a future approved workflow requires them.
6. Re-run:

```bash
npm run crm:vnext:gog-healthcheck -- --account saludoalsol@gmail.com --fail-on-blocked
```

## Reauth Command

If the token is already broken:

```bash
gog auth add saludoalsol@gmail.com \
  --services gmail,contacts,people,drive,docs,sheets \
  --readonly \
  --force-consent
```

Complete browser consent locally. Never paste OAuth codes, tokens, or client secrets into Telegram/chat.

## Monitoring Policy

For CRM source-recovery batches:

- Run `crm:vnext:gog-healthcheck` before serious stitching/source-recovery work that depends on Google.
- If blocked, Mantis should pause in `awaiting_human_unblock`.
- Do not close a final degraded evidence report unless Alejandro explicitly approves degraded mode.

For proactive stability:

- Run the healthcheck daily or before any CRM batch sprint.
- If it fails with `oauth_invalid_grant`, ask Alejandro to reauthorize or check Google Auth Platform publishing status.
- If it fails with `google_api_not_configured`, enable the missing API in the OAuth project.
- If it fails with `insufficient_permissions`, reauthorize with the read-only scopes above.

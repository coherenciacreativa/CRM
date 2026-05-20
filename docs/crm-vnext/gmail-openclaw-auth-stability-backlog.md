# CRM vNext - Gmail/OpenClaw Auth Stability Backlog

Date: 2026-05-10
Status: Repaired again on 2026-05-21 with local healthcheck tooling

## Context

Alejandro wants Mantis/OpenClaw to reliably search Gmail and contacts as part of CRM evidence gathering.

Codex's Gmail connector is currently working, but the local OpenClaw/gog integration returned:

```text
invalid_grant: Token has been expired or revoked
```

for both Gmail and Contacts read attempts.

## Current Read

This is an infrastructure/auth reliability issue, not a CRM data-model issue.

2026-05-11 update:

- `gog` was reauthorized for `saludoalsol@gmail.com` with a narrower read-only service set:
  - Gmail readonly,
  - Drive readonly,
  - Docs readonly,
  - Sheets readonly,
  - Contacts/People readonly,
  - OIDC profile/email.
- `gog auth list --check` reports the refresh token as valid.
- Gmail read/search probe succeeds.
- Initial Drive and Contacts probes then failed for a different reason: Google API `403 accessNotConfigured`.
  - Drive API was disabled for OAuth project `807471998270`.
  - People API was disabled for OAuth project `807471998270`.
- Alejandro enabled the required Google APIs from the Cloud Console.
- Final read-only probes passed:
  - Gmail search,
  - Drive search,
  - Contacts list,
  - Docs metadata,
  - Sheets metadata.

2026-05-21 update:

- `gog` token for `saludoalsol@gmail.com` failed again with `invalid_grant` during the Yoga Golden Cohort source-health preflight.
- Reauthorized with the same read-only service set:
  - Gmail readonly,
  - Drive readonly,
  - Docs readonly,
  - Sheets readonly,
  - Contacts/People readonly,
  - OIDC profile/email.
- Added `npm run crm:vnext:gog-healthcheck` as a reusable no-content smoke check for Mantis/OpenClaw Google Workspace evidence lanes.
- Live smoke check passed after reauth:
  - token exchange,
  - People profile endpoint,
  - Gmail thread search,
  - Contacts list,
  - Drive document search,
  - Docs metadata,
  - Drive spreadsheet search,
  - Sheets metadata.

Likely causes to verify later:

- Google OAuth app may be in Testing mode, where offline refresh tokens can expire after 7 days.
- Some required APIs may be disabled in the OAuth project, even after the user token itself is valid.
- Historical `gog` token had broad scopes, including Gmail/Contacts/Drive/Calendar/Sheets and write-capable Gmail scopes; the 2026-05-11 reauth narrowed this for CRM evidence work.
- The local token store/keyring may not be refreshing or persisting the expected refresh token cleanly.
- Codex Gmail and OpenClaw/gog use separate OAuth clients/token stores, so one can work while the other is broken.

Google's OAuth docs explicitly say refresh tokens can stop working because of user revocation, six months of inactivity, password changes when Gmail scopes are present, token limits, time-bound access/admin policies, or External + Testing OAuth consent screens that issue seven-day refresh tokens for non-profile scopes. Reference: https://developers.google.com/identity/protocols/oauth2#expiration

## Recommended Future Fix

Do not build CRM runtime directly on an unmonitored OpenClaw Gmail token.

Preferred route:

1. Create or configure a minimal CRM/Mantis Google OAuth client.
2. Request only read-oriented scopes needed for CRM evidence:
   - Gmail read/search,
   - Contacts/People read,
   - no Gmail send/modify/settings unless a later outbound workflow is explicitly approved.
3. Move the OAuth app out of Testing mode or complete the relevant verification path if required.
4. Store refresh tokens in a durable keyring/token store and add a non-destructive health check.
5. If health check returns `invalid_grant`, alert Alejandro via Telegram with exact reauth action and keep CRM working via connected evidence packets/fallback.

Current operating command, if reauth is needed again:

```bash
gog auth add saludoalsol@gmail.com \
  --services gmail,drive,docs,sheets,contacts,people \
  --readonly \
  --drive-scope readonly \
  --force-consent
```

Current smoke probes should verify token validity plus read-only access for Gmail, Drive, Contacts, Docs, and Sheets without printing personal content.

Reusable healthcheck:

```bash
npm run crm:vnext:gog-healthcheck -- \
  --account saludoalsol@gmail.com \
  --out ~/Documents/Mantis-Reports/crm_vnext_gog_healthcheck_<date>.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_gog_healthcheck_<date>.md \
  --fail-on-blocked
```

## Near-Term Policy

Continue CRM development using `evidenceSources` packets.

Mantis/Codex can search Gmail through whatever authenticated read-only path is healthy, redact sensitive snippets, and pass compact evidence packets into Deep Local Stitching.

This keeps the CRM useful even when one connector's OAuth state breaks.

## Do Not Forget

Schedule this as an infrastructure hito after the next core CRM loop is stable:

```text
Hito: Gmail/Contacts Auth Stability v0
Goal: make Mantis/OpenClaw Gmail/Contacts read-only evidence search stable enough for unattended operation.
```

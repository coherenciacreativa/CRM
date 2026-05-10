# CRM vNext - Gmail/OpenClaw Auth Stability Backlog

Date: 2026-05-10
Status: Backlog, not blocking current CRM build

## Context

Alejandro wants Mantis/OpenClaw to reliably search Gmail and contacts as part of CRM evidence gathering.

Codex's Gmail connector is currently working, but the local OpenClaw/gog integration returned:

```text
invalid_grant: Token has been expired or revoked
```

for both Gmail and Contacts read attempts.

## Current Read

This is an infrastructure/auth reliability issue, not a CRM data-model issue.

Likely causes to verify later:

- Google OAuth app may be in Testing mode, where offline refresh tokens can expire after 7 days.
- The current `gog` token has broad scopes, including Gmail/Contacts/Drive/Calendar/Sheets and write-capable Gmail scopes.
- The local token store/keyring may not be refreshing or persisting the expected refresh token cleanly.
- Codex Gmail and OpenClaw/gog use separate OAuth clients/token stores, so one can work while the other is broken.

## Recommended Future Fix

Do not build CRM runtime directly on a fragile OpenClaw Gmail token.

Preferred route:

1. Create or configure a minimal CRM/Mantis Google OAuth client.
2. Request only read-oriented scopes needed for CRM evidence:
   - Gmail read/search,
   - Contacts/People read,
   - no Gmail send/modify/settings unless a later outbound workflow is explicitly approved.
3. Move the OAuth app out of Testing mode or complete the relevant verification path if required.
4. Store refresh tokens in a durable keyring/token store and add a non-destructive health check.
5. If health check returns `invalid_grant`, alert Alejandro via Telegram with exact reauth action and keep CRM working via connected evidence packets/fallback.

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

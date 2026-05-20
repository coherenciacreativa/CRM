# CRM vNext - MailerLite Auth Stability Runbook

Date: 2026-05-21
Status: active runbook; CRM Keychain credential repaired on 2026-05-21

## Goal

Keep MailerLite available as a stable read-only evidence source for CRM vNext stitching, enrichment, and engagement snapshots.

This lane powers:

- subscriber identity lookup,
- email / phone / city / country recovery,
- group/tag context,
- subscriber status,
- engagement snapshot inputs for future heat scoring.

It must not mutate subscribers, groups, tags, automations, campaigns, CRM cards, Fact Store, or outbound channels unless a future explicitly approved write workflow exists.

## Current Credential Contract

- CRM Keychain service: `CRM-MailerLite`
- CRM Keychain account: `default`
- Known-good comparison source used on 2026-05-21: `bhakti-whatsapp-prod` / `MAILERLITE_API_KEY`
- API base: `https://connect.mailerlite.com/api`
- Required CRM command:

```bash
npm run crm:vnext:mailerlite-healthcheck -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_mailerlite_healthcheck_<date>.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_mailerlite_healthcheck_<date>.md \
  --fail-on-blocked
```

## Root Cause Found

During Yoga Golden Cohort source recovery, Mantis reported MailerLite as:

```text
HTTP 401: Unauthenticated.
```

Codex compared local credential routes without printing token values:

- `CRM-MailerLite/default` existed but returned `401`.
- `bhakti-whatsapp-prod/MAILERLITE_API_KEY` existed and returned `200` against MailerLite.
- The two credentials had different safe SHA-256 fingerprints, so CRM was using a stale API key while Bhakti was using a valid one.

Fix applied on 2026-05-21:

- copied the known-good local Keychain value from Bhakti into `CRM-MailerLite/default`;
- did not print, paste, or commit the token;
- verified CRM MailerLite groups/subscribers probes returned `200`;
- added `npm run crm:vnext:mailerlite-healthcheck` as the durable preflight.

## Healthcheck Behavior

The healthcheck verifies:

1. credential presence from CRM Keychain or local env fallback;
2. `GET /groups?limit=1`;
3. `GET /subscribers?limit=1`;
4. cursor pagination over subscribers with local count only.

It intentionally does not print:

- subscriber rows,
- emails,
- names,
- groups,
- fields,
- notes,
- API tokens,
- OAuth codes,
- credential values.

The JSON report may include a short non-reversible SHA-256 fingerprint prefix for credential drift diagnosis. This is not a token and must not be treated as permission to expose real secrets.

## Mantis Policy

For serious CRM stitching/source-recovery batches:

- Run `crm:vnext:mailerlite-healthcheck` before declaring MailerLite blocked.
- If the healthcheck returns `mailerlite_unauthenticated`, pause in `awaiting_human_unblock`.
- Do not close a final degraded evidence report unless Alejandro explicitly approves degraded mode.
- Use cursor pagination and local filtering for subscriber scans. Do not rely on MailerLite `search` as the only lookup path.
- Keep MailerLite reads compact: output selected evidence packets, not raw subscriber dumps.

## Repair Procedure

If CRM MailerLite fails again but another trusted local app has a working key:

1. Confirm the trusted source with a read-only `GET /groups?limit=1` or equivalent.
2. Copy the value locally from Keychain to `CRM-MailerLite/default` without printing it.
3. Re-run:

```bash
npm run crm:vnext:mailerlite-healthcheck -- --fail-on-blocked
```

Never paste MailerLite tokens into Telegram, Codex chat, reports, docs, shell history, or git.

If no local key is healthy, create or rotate a MailerLite API token in MailerLite, store it in Keychain, then re-run the healthcheck.

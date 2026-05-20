# Hito 65 - gog Auth Healthcheck v0

Date: 2026-05-21
Status: Implemented

## Why

CRM vNext source recovery depends on Google Workspace evidence lanes for Gmail, Drive, Docs, Sheets, Contacts, and People. During the Yoga Golden Cohort preflight, `gog` returned `invalid_grant` again for `saludoalsol@gmail.com`.

The immediate fix was to reauthorize the account, but the durable fix is to make auth health observable before Mantis starts a serious stitching batch.

## What Changed

Added:

- `scripts/crm-vnext-gog-healthcheck.mjs`
- `npm run crm:vnext:gog-healthcheck`
- `__tests__/crm-vnext-gog-healthcheck-script.spec.ts`

Updated:

- `docs/crm-vnext/gmail-openclaw-auth-stability-backlog.md`
- `docs/crm-vnext/operator-capabilities.md`
- `lib/crm/crm-vnext-operator-capabilities.ts`

## What The Check Does

The healthcheck verifies:

- token exchange with `gog auth list --check`;
- People profile endpoint;
- Gmail read-only search;
- Contacts read-only list;
- Drive document search;
- Docs metadata;
- Drive spreadsheet search;
- Sheets metadata.

It prints only service status, not personal content, document titles, contact names, email subjects, tokens, or credentials.

## Command

```bash
npm run crm:vnext:gog-healthcheck -- \
  --account saludoalsol@gmail.com \
  --out ~/Documents/Mantis-Reports/crm_vnext_gog_healthcheck_<date>.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_gog_healthcheck_<date>.md \
  --fail-on-blocked
```

## Safety

Read-only only:

- no Gmail sends or mutations;
- no Drive/Docs/Sheets writes;
- no Contacts writes;
- no credentials printed;
- no outbound.

If the check blocks, Mantis should pause source recovery and ask Alejandro for exact reauth/API unblock action before producing a final degraded batch report.

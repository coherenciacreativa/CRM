# Hito 66 - MailerLite Auth Healthcheck v0

Date: 2026-05-21
Status: implemented

## What Changed

CRM vNext now has a durable MailerLite source-health preflight:

```bash
npm run crm:vnext:mailerlite-healthcheck
```

It verifies the local CRM MailerLite credential and read-only API access without printing tokens or subscriber content.

## Why

Mantis source-recovery batches were correctly pausing because MailerLite returned:

```text
HTTP 401: Unauthenticated.
```

The root cause was not MailerLite itself. The CRM Keychain item was stale, while another local app, Bhakti WhatsApp, had a valid MailerLite key. CRM now uses the repaired Keychain item and has a repeatable check before future batches.

## Safety

- No subscriber rows printed.
- No MailerLite tokens printed.
- No subscriber/group/tag/automation/campaign mutations.
- No CRM cards or Fact Store writes.
- No outbound.

## Validation

After repair, the live CRM healthcheck passed:

- credential present,
- groups endpoint OK,
- subscribers endpoint OK,
- cursor pagination OK.

The expected full subscriber scan currently returns roughly the same shape Mantis observed earlier: 14 cursor pages and about 1,370 subscribers, depending on new signups/unsubscribes.

# Hito 52 - Engagement Snapshot Ledger v0

Date: 2026-05-15
Status: Implemented

## What Changed

CRM vNext can now persist read-only engagement previews into a local JSONL ledger and surface recent movement on the main dashboard.

Implemented:

- `lib/crm/crm-vnext-engagement-snapshot-ledger.js`
- `npm run crm:vnext:engagement-snapshot-ledger`
- `GET /api/crm-vnext/engagement-snapshots`
- `/crm-vnext` dashboard `Engagement Movement` panel
- operator capability entry for Mantis
- tests for snapshot build, append, duplicate skip, safety rejection, and API read

## Why It Matters

Before this hito, MailerLite engagement could be normalized and previewed, but the result was just a single report artifact. Now the CRM has a durable local memory of engagement movement.

This closes the loop between:

- automatic or operator-collected engagement sources,
- scoring preview,
- dashboard-level review,
- future policy decisions about what becomes durable card state.

## Boundary

This hito does not persist score changes into cards. It stores the preview as operational history only.

That keeps the system disciplined:

- observation is not mutation,
- warmth is not outreach permission,
- Mantis can inspect movement without changing CRM records,
- Alejandro can review high-signal shifts before future automation gets more authority.

## Safety

No outbound, no Fact Store writes, no card mutation, no live API calls, no credentials, no MailerLite/Instagram/ManyChat changes.

Committed writes require:

```bash
--write --approved-by <name>
```

The committed target is only:

```text
.crm-vnext/engagement-snapshots/ledger.jsonl
```

## Next Leverage

The next high-leverage steps are:

- expand engagement adapters beyond MailerLite into Gmail replies and Instagram/manual story engagement,
- generate a daily CRM movement brief from this ledger,
- later define a reviewed policy for promoting selected engagement state into person cards.

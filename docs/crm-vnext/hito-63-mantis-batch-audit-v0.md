# Hito 63 - Mantis Batch Audit v0

Date: 2026-05-18
Status: shipped locally

## Why This Exists

The first net-new IG-origin retry exposed an operator gap: Mantis produced a valid-looking JSON, but it only processed `@marcelarojas.bienestar` out of the 5 contacts in the prompt. Several high-value sources were blocked, and the report needed to be treated as a partial run, not a closed batch.

## What Shipped

Added `crm:vnext:mantis-batch-audit`, a read-only local gate that compares:

- expected contacts from a batch prompt JSON,
- reported contacts from a Mantis evidence-hunt JSON,
- blocked sources and exact unblock actions.

It outputs:

- coverage by contact,
- `runStatus`,
- actionable blockers,
- a copy-ready retry prompt for Mantis,
- and optional non-zero exit via `--fail-on-partial`.

## Current Real Batch

The audit for the May 18 net-new IG-origin batch classified Mantis' Marcela-only report as `partial_run`:

- expected contacts: 5,
- processed expected contacts: 1,
- missing expected contacts: 4,
- blocked sources: MailerLite, ManyChat, Google/gog, Instagram Messages UI, and Vercel historical logs.

Reports:

```text
~/Documents/Mantis-Reports/crm_vnext_net_new_ig_origin_batch_audit_2026-05-18.json
~/Documents/Mantis-Reports/crm_vnext_net_new_ig_origin_batch_audit_2026-05-18.md
```

## Safety

- no CRM writes,
- no Fact Store writes,
- no live APIs,
- no credentials,
- no outbound,
- no ManyChat LIVE.

## Next Step

Give the audit's retry prompt to Mantis. Mantis should rerun the missing contacts and preserve blockers as actionable unblock requests instead of closing the batch as complete.

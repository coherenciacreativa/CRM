# Hito 70: Signal Event Pipeline v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added the first local end-to-end CRM vNext engagement loop:

```text
MailerLite/Gmail/supplied events
  -> Signal Event Ledger normalization
  -> Signal Event Projection
  -> Engagement Signal Preview
  -> optional Engagement Snapshot Ledger
```

Command:

```bash
npm run crm:vnext:signal-event-pipeline -- --mailerlite-snapshot-file <json>
```

## Why It Matters

This turns the scoring infrastructure into something operational. Mantis no longer needs to manually chain separate commands just to answer:

> "Given these real signals, whose CRM card would become warmer and why?"

It also establishes the ingestion shape for future sources such as Shopify, payment providers, ClassBot, Bhakti WhatsApp, WhatsApp apps, and Instagram event captures.

## Current Scope

Supported inputs:

- MailerLite engagement snapshots,
- Gmail newsletter reply discoveries,
- existing engagement signal files,
- canonical signal event files.

Optional local writes:

- Signal Event Ledger with `--write-events --approved-by <name>`,
- Engagement Snapshot Ledger with `--write-snapshot --approved-by <name>`.

## Safety

The pipeline is local-only and dry-run by default.

It does not:

- mutate person cards,
- write Fact Store,
- send outbound messages,
- call live APIs,
- read credentials,
- mutate external systems,
- change actual scores.

It produces preview movement only.

## Validation

Automated coverage:

- MailerLite snapshot -> events -> projection -> preview.
- Gmail reply discovery -> approved local event/snapshot write.
- Future source events for Shopify and Bhakti WhatsApp through the same lane.
- Approval requirement for local ledger writes.

Operational validation should run this against a real Mantis report and review the generated preview before promoting any movement history.

# CRM vNext Engagement Snapshot Ledger

Date: 2026-05-15
Status: Implemented local ledger + read API + dashboard panel

## Purpose

`crm:vnext:engagement-snapshot-ledger` stores approved read-only engagement previews as local operating history.

This gives CRM vNext a memory of engagement movement without writing scores into person cards yet. The separation is intentional:

- adapters collect or normalize signals,
- `engagement-signal-preview` computes before/after movement,
- this ledger stores the reviewed preview as history,
- future policy can decide which movement should become durable card state.

## Local Command

List recent snapshots:

```bash
npm run crm:vnext:engagement-snapshot-ledger
```

Preview storing one engagement preview:

```bash
npm run crm:vnext:engagement-snapshot-ledger -- \
  --preview-file <engagement-preview.json>
```

Commit after explicit approval:

```bash
npm run crm:vnext:engagement-snapshot-ledger -- \
  --preview-file <engagement-preview.json> \
  --write \
  --approved-by Alejandro \
  --source-label "MailerLite engagement snapshot 2026-05-15"
```

Optional:

```bash
--ledger-path .crm-vnext/engagement-snapshots/ledger.jsonl
--limit 10
--movement-limit 12
--out ~/Documents/Mantis-Reports/crm_vnext_engagement_snapshot_ledger_write_2026-05-15.json
```

## API

```http
GET /api/crm-vnext/engagement-snapshots?limit=10&movementLimit=12
```

The API reads the local JSONL ledger and returns:

- snapshot count,
- latest captured timestamp,
- total signals/matched/unmatched counts,
- total warmed/cooled cards,
- review queue counts,
- recent movement rows for the dashboard.

## Dashboard

The main `/crm-vnext` dashboard now includes an `Engagement Movement` panel. It shows whether recent MailerLite/Gmail/Instagram/manual engagement previews are changing priority scores over time.

The panel is deliberately operational, not a final analytics product. It should answer:

- did we save any engagement snapshots,
- how many signals matched real cards,
- who moved recently,
- did anything require human review,
- are there unmatched signals that need stitching.

For a more operator-ready view, use:

```text
/crm-vnext/engagement-movement
GET /api/crm-vnext/engagement-movement-queue
npm run crm:vnext:engagement-movement-queue
```

That queue deduplicates recent movement by person and recommends safe internal actions such as `review_reply_context`, `review_warm_contact`, `keep_observing_email`, or `stitch_identity`.

## Safety

The ledger is local-only:

- no person-card mutation,
- no Fact Store write,
- no outbound,
- no live API calls,
- no credential read or refresh,
- no MailerLite/Instagram/ManyChat changes.

A stored movement is not permission to contact someone. It is internal review evidence.

## Operator Use

Recommended Mantis loop:

1. Gather engagement source read-only, e.g. MailerLite snapshot.
2. Normalize source into engagement signals.
3. Run `engagement-signal-preview`.
4. If the preview is useful and non-mutating, store it with this ledger.
5. Use the dashboard or `GET /api/crm-vnext/engagement-snapshots` to review movement history.

If a signal is unmatched, route it back to stitching before using it for scoring decisions.

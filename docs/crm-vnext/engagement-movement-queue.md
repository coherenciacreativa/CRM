# CRM vNext Engagement Movement Queue

Date: 2026-05-21
Status: Implemented local read-only queue

## Purpose

`engagement-movement-queue` turns stored engagement snapshot history into an operator queue for Mantis and Alejandro.

It answers:

- who moved recently,
- why the movement happened,
- which source family caused it,
- whether Mantis should keep observing, inspect a reply, review a warm contact, or route back to identity stitching.

This closes the loop from raw signals to an internal working surface without writing scores back into person cards.

## Browser Route

```text
/crm-vnext/engagement-movement
```

The page is local/read-only and shows:

- stored signal/snapshot counts,
- warmed/review rows,
- score delta per person,
- email/Instagram signal summaries,
- safe operator action per row, using `docs/crm-vnext/next-best-action-policy-v0.md`,
- unmatched signals that need stitching.

## API

```http
GET /api/crm-vnext/engagement-movement-queue?limit=25
```

Optional local-only query parameters:

```text
ledgerPath=<local engagement snapshot ledger>
cardStorePath=<local vNext card store>
legacyPath=<legacy person-cards-v1>
includeUnchanged=1
snapshotLimit=5
movementLimit=100
```

## CLI

```bash
npm run crm:vnext:engagement-movement-queue
```

Useful report form:

```bash
npm run crm:vnext:engagement-movement-queue -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_engagement_movement_queue.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_engagement_movement_queue.md
```

## Safety

- No person-card mutation.
- No Fact Store write.
- No score writeback.
- No live APIs.
- No credential reads.
- No outbound messages.

A warmed score is internal prioritization evidence. It is not permission to contact anyone.

## Operator Rule

Mantis should read this queue after approved engagement snapshots are stored. Rows with `review_reply_context`, `care_or_retention`, `review_social_context`, or `review_warm_contact` can become a decision brief, but any external message still requires explicit approval from Alejandro.

Important interpretation:

- ClassBot/yoga participation should normally mean care, retention, delivery, gratitude, or continuity.
- Newsletter replies should normally mean reply-context review.
- Passive MailerLite opens or light story views should normally remain observation.
- A warmed score is not permission to contact anyone.

Next surface:

```text
GET /api/crm-vnext/engagement-decision-brief
npm run crm:vnext:engagement-decision-brief
```

This converts the movement queue into a shorter no-send decision brief for Mantis/Alejandro.

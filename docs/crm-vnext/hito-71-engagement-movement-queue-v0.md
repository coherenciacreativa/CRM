# Hito 71 - Engagement Movement Queue v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added a read-only operator queue that turns stored engagement snapshot history into Mantis-ready rows.

New surfaces:

- `GET /api/crm-vnext/engagement-movement-queue`
- `/crm-vnext/engagement-movement`
- `npm run crm:vnext:engagement-movement-queue`
- `lib/crm/crm-vnext-engagement-movement-queue.ts`

## Why It Matters

CRM vNext now has a first operational bridge from living engagement signals to an actual review surface:

```text
MailerLite/Gmail/etc. -> Signal Event Ledger -> Projection -> Engagement Preview -> Snapshot Ledger -> Movement Queue
```

The queue tells Mantis who warmed, what source caused it, whether a reply matters, and whether the row should go back to identity stitching.

## Safety

The hito is read-only:

- no card writes,
- no Fact Store writes,
- no live API calls,
- no credential reads,
- no outbound,
- no automatic score mutation.

## Validation

Covered by `__tests__/crm-vnext-engagement-movement-queue.spec.ts`.

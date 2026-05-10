# Hito 31: Card Write Apply v0

Date: 2026-05-10

## What Changed

CRM vNext now has a guarded local write path after the approval packet.

New surfaces:

- `lib/crm/crm-vnext-card-write-apply.ts`
- `POST /api/crm-vnext/card-write-apply`
- `npm run crm:vnext:card-write-apply`
- docs `card-write-apply.md`

## Why It Matters

Before this hito, the system could gather evidence, resolve ambiguous email decisions, preview operations, and prepare approval packets, but it could not apply anything.

Now Mantis has a narrow, auditable lane:

```text
evidence -> approval packet -> explicit approval -> backup -> local vNext card store + provenance ledger
```

This is the first real bridge from "the system knows what should happen" to "the system can update a controlled CRM artifact".

## Guardrails

Commits require:

- `approvedBy`,
- explicit `approvalItemIds` or `applyAllReady=true`,
- no unresolved approval blockers,
- local backups before writes.

Still prohibited:

- outbound,
- Fact Store writes,
- automatic merges,
- live connector calls,
- credential reads/rotations,
- ManyChat LIVE edits.

## Eliana Smoke Pattern

The test fixture models Eliana:

- `@cadavid_eli`
- `Eliana Cadavid`
- `eli.cadavid@hotmail.com`
- `3104954266`
- lead-capture evidence from ManyChat/cache style traces

After an evidence decision confirms the email belongs to Eliana, the write path plans a local upsert into the vNext card store and records provenance.

## Verification

Run:

```bash
npm test -- --run __tests__/crm-vnext-card-write-apply.spec.ts __tests__/crm-vnext-card-write-apply-api.spec.ts
npm run build
npm run crm:vnext:readiness
```

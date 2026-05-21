# Hito 74 - Scoring Policy v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added a typed scoring policy layer for CRM vNext:

- `lib/crm/community-scoring-policy.ts`
- `docs/crm-vnext/scoring-policy-v0.md`

Also updated `lib/crm/community-scoring.ts` so the composite priority weights are imported from the explicit policy contract instead of living only inside the scoring formula.

## Why It Matters

This hito keeps CRM vNext from treating every "warm" signal as the same thing.

The CRM now has a clear policy distinction between:

- commercial warmth,
- community depth,
- relationship engagement,
- data confidence.

That distinction matters for Alejandro's concern:

```text
Active ClassBot/yoga student
  -> high community depth and yoga fit
  -> care/retention/continuity signal
  -> not automatically hotter than a thoughtful email reply

Thoughtful newsletter reply
  -> high relationship engagement
  -> possible commercial warmth only if the content shows intent
  -> review before any follow-up
```

## Historical Reuse Audit

The reusable core is not the older campaign automation itself. The reusable core is:

- the current scoring engine,
- the canonical Signal Event Ledger,
- Signal Event Projection,
- source adapters for MailerLite/Gmail/ClassBot,
- Instagram UI evidence and source-recovery helpers.

Older Instagram assistant playbooks, ManyChat migration notes, and RADAR-style heat-score notes remain useful reference material, but they are not the operating source of truth for vNext scoring.

## Safety

No live source calls and no external mutations:

- no outbound,
- no CRM card writes,
- no Fact Store writes,
- no score writeback,
- no ManyChat LIVE changes,
- no Instagram/Gmail/MailerLite credential work.

The policy is internal guidance plus typed constants. It does not contact anyone and does not change stored person-card scores.

## Validation

Covered by:

- `__tests__/community-scoring-policy.spec.ts`
- `__tests__/community-scoring.spec.ts`

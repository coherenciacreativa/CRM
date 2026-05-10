# Hito 20 - Evidence Review Decisions Ledger v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a local ledger for approved evidence-review decisions.

New surfaces:

- `lib/crm/crm-vnext-evidence-review-decisions.ts`
- `GET /api/crm-vnext/evidence-review-decisions`
- `POST /api/crm-vnext/evidence-review-decisions`
- `npm run crm:vnext:evidence-review-decisions`
- docs `evidence-review-decisions.md`
- operator capabilities wiring

## Why It Matters

The previous hito created questions. This hito records approved answers.

The architecture now separates four layers:

```text
evidence found
-> review question
-> approved decision ledger
-> future card write
```

That gives Mantis memory without giving it premature write authority.

## Mayerli / Ariana Model

The ledger can store:

```text
mayaariana@hotmail.com = keep_email_unassigned_family_or_companion
```

This means:

- the email remains visible as evidence,
- it should not be assigned to Mayerli as primary email,
- a future related-person candidate for Ariana can be prepared,
- no card is changed by the ledger.

## Guardrails

- Preview by default.
- Commit requires `approvedBy`.
- Writes only local JSONL decision ledger.
- No person-card mutation.
- No Fact Store write.
- No outbound channels.
- No live Gmail/Drive/MailerLite/Instagram/ManyChat calls.
- No credentials.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-evidence-review-decisions.spec.ts __tests__/crm-vnext-evidence-review-decisions-api.spec.ts __tests__/crm-vnext-evidence-review-packet.spec.ts
```

Operator wiring:

```bash
npm test -- --run __tests__/operator-capabilities.spec.ts __tests__/crm-vnext-evidence-review-decisions.spec.ts __tests__/crm-vnext-evidence-review-decisions-api.spec.ts
```

## Next Step

Completed in Hito 21: Card Apply Preview and Evidence Review Packet now read this ledger and adjust future review/preview output accordingly.

Still no canonical card writes until a later explicit write path is approved.

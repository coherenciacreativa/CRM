# Hito 19 - Evidence Review Packet v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a review-packet layer between evidence discovery and any future card write.

New surfaces:

- `lib/crm/crm-vnext-evidence-review-packet.ts`
- `POST /api/crm-vnext/evidence-review-packet`
- `npm run crm:vnext:evidence-review-packet`
- docs `evidence-review-packet.md`
- operator capabilities wiring

This layer turns ambiguous evidence into explicit decision questions.

## Why It Matters

The previous hito proved that Google Drive/Sheets can find scattered retreat data. This hito adds the next discipline:

```text
found evidence -> review question -> approved ownership -> later write
```

That prevents the CRM from wrongly attaching a family email to the wrong person.

## Real Mayerli / Ariana Behavior

For the Mayerli case, the packet now recognizes:

- subject: `Gladys Mayerli Garcia Ortegon`
- candidate phone: `3115381341`
- ambiguous emails: `mayariana@hotmail.com`, `mayaariana@hotmail.com`
- possible related people: `Ariana Catalina Torres Garcia`, `Jose Fidel Torres Delgado`

It recommends:

```text
keep_email_unassigned_family_or_companion
```

The packet can still offer:

- confirm the email belongs to Mayerli,
- keep it unassigned,
- prepare a related-person candidate,
- ask for more evidence,
- ignore the candidate.

No option executes a write.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-evidence-review-packet.spec.ts __tests__/crm-vnext-evidence-review-packet-api.spec.ts __tests__/crm-vnext-card-apply-preview.spec.ts
```

Operator wiring:

```bash
npm test -- --run __tests__/operator-capabilities.spec.ts __tests__/crm-vnext-evidence-review-packet.spec.ts __tests__/crm-vnext-evidence-review-packet-api.spec.ts
```

Real smoke with the Mayerli Drive evidence packet:

```json
{
  "reviewItems": 1,
  "emailOwnershipQuestions": 2,
  "ambiguousEmailCandidates": 2,
  "possibleRelatedPeople": 2,
  "operationsExecuted": 0
}
```

## Guardrails

- No card mutation.
- No Fact Store write.
- No merge execution.
- No outbound channels.
- No live connector calls from CRM.
- No credential reads.
- Decision options are not write approvals.

## Next Step

The next useful hito is a local approval ledger / reviewed-decision ledger. It should record Alejandro-approved identity decisions without mutating canonical cards yet, so later write paths can use explicit provenance instead of chat memory.

# Hito 14 - Card Apply Preview v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a read-only Card Apply Preview.

New pieces:

- pure helper: `lib/crm/crm-vnext-card-apply-preview.ts`,
- API: `POST /api/crm-vnext/card-apply-preview`,
- CLI: `npm run crm:vnext:card-apply-preview`,
- tests for helper and API,
- docs: `card-apply-preview.md`,
- operator-capabilities entry and recommended-flow step.

## Why It Matters

The previous hito decided whether card work should create, enrich, merge, defer, or ask for more identity.

This hito turns that decision into exact non-executed operations:

```text
policy decision -> exact preview operations -> approval review -> future write path
```

That makes the next real write implementation much safer, because the shape of the mutation is visible before mutation exists.

## Important Fix Found

The first real batch smoke exposed a parser issue: when Juan Jose and Mayerli were in adjacent sentences in one text block, the later Instagram handle could attach to the previous person clue.

This was fixed in Fact Intake:

- adjacent sentence clues now split when a new sentence starts with `@handle` or a proper-name-like token,
- regression test added,
- repeated batch now returns two separate decisions:
  - Juan Jose,
  - Mayerli.

## Real Batch Smoke

Input:

```text
Juan José Trujillo es estudiante de yoga, retiros, psicología, amigo/aliado/consultor.
@mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.
```

Output:

- 2 previews,
- 12 hypothetical operations,
- 0 executed operations,
- Juan Jose: `blocked_requires_review`, `stage_merge_review`,
- Mayerli: `deferred_review_packet`,
- restricted service operation for therapy context,
- all operations have `executed=false`.

## Guardrails

- No card mutation.
- No merge execution.
- No Fact Store write.
- No outbound channels.
- No live Gmail/MailerLite calls.
- No credential reads.
- No write command implemented.

## Verification

Focused tests:

- Card Apply Preview helper,
- Card Apply Preview API,
- Fact Intake parser regression,
- Operator capabilities.

Full verification should include:

```bash
npm test
npm run build
```

## Next Step

Review these previews with Alejandro/Mantis on a slightly larger real batch.

Only after the preview shape is trusted should we build **Card Apply Staging v0**, likely writing to a separate local staging ledger rather than canonical person cards.

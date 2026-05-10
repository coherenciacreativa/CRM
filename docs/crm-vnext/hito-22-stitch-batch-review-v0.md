# Hito 22 - Stitch Batch Review v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a read-only batch reviewer for multi-contact stitching.

New surfaces:

- `lib/crm/crm-vnext-stitch-batch-review.ts`
- `POST /api/crm-vnext/stitch-batch-review`
- `npm run crm:vnext:stitch-batch-review`
- docs `stitch-batch-review.md`
- operator capabilities wiring

## Why It Matters

This is the first surface that starts feeling like leverage instead of plumbing.

Mantis can now take a batch such as:

```text
Juan Jose is yoga/retreat/therapy.
@mayuyis2626 is Mayerli, yoga/retreats/family.
```

and return one review table with:

- what to create,
- what to enrich,
- what might need merge review,
- what is deferred,
- what evidence questions remain,
- which prior decisions were already applied.

Still no card writes happen.

## Real Behavior

The Juan + Mayerli test batch now produces:

- Juan Jose: `review_merge_or_create`, because MailerLite gives a strong email candidate but merge policy still requires review.
- Mayerli: `review_deferred_write`, with fuller name and phone from Drive evidence, email still missing, and family email decisions applied.
- `mayaariana@hotmail.com` is remembered as kept-unassigned if present in the ledger.
- `mayariana@hotmail.com` remains an open question until Alejandro/Mantis decides it.
- Batch evidence is filtered per contact before identity fields are proposed, so Juan does not inherit Mayerli's Instagram handle from a neighboring sentence or shared evidence packet.

## Guardrails

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No canonical merge.
- No outbound.
- No live connector calls.
- No credentials.
- Approval-ready means ready for a separate human card-write approval, not auto-apply.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-stitch-batch-review.spec.ts __tests__/crm-vnext-stitch-batch-review-api.spec.ts __tests__/operator-capabilities.spec.ts
```

Result:

```text
3 test files passed / 7 tests passed
```

Full verification:

```bash
npm test
npm run build
```

Result:

```text
72 test files passed / 224 tests passed
Next build compiled successfully
```

## Next Step

Completed in Hito 23: Card Write Approval Packet v0.

Batch items with no open evidence questions now become explicit approval items before any write implementation exists.

# Hito 21 - Decision-Aware Preview v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Card Apply Preview and Evidence Review Packet now consume the local Evidence Review Decisions ledger.

Updated surfaces:

- `lib/crm/crm-vnext-card-apply-preview.ts`
- `lib/crm/crm-vnext-evidence-review-packet.ts`
- `POST /api/crm-vnext/card-apply-preview`
- `POST /api/crm-vnext/evidence-review-packet`
- `npm run crm:vnext:card-apply-preview -- --decision-ledger-path <jsonl>`
- `npm run crm:vnext:evidence-review-packet -- --decision-ledger-path <jsonl>`
- docs `card-apply-preview.md`, `evidence-review-packet.md`, `evidence-review-decisions.md`
- operator capabilities wiring

## Why It Matters

The CRM can now remember reviewed ambiguity.

Before this hito:

```text
Mayerli evidence -> question about Ariana/family email -> stored decision
```

but the next run could still ask the same question again.

Now:

```text
Mayerli evidence -> stored decision ledger -> preview respects decision -> packet asks only unresolved questions
```

This is the first small piece of real compounding leverage for stitching: Mantis can search broadly, ask once, store the answer, and keep moving.

## Decision Effects

The preview exposes `identityResolution.evidenceDecisionSummary`:

- `confirmedSubjectEmails`
- `keptUnassignedEmails`
- `relatedPersonCandidateEmails`
- `needsMoreEvidenceEmails`
- `ignoredEmails`
- `appliedDecisionRecordIds`

If Alejandro confirms an email for the subject, the preview may show it as a future write candidate.

If Alejandro keeps an email unassigned as family/companion evidence, the preview keeps email missing and does not promote it into the proposed card draft.

Either way, all operations remain:

```json
{
  "wouldMutate": true,
  "executed": false
}
```

## Guardrails

- Read-only preview.
- No person-card mutation.
- No Fact Store write.
- No canonical merge.
- No outbound channels.
- No live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls.
- No credentials.
- A stored decision still is not card-write approval.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-card-apply-preview.spec.ts __tests__/crm-vnext-evidence-review-packet.spec.ts __tests__/crm-vnext-card-apply-preview-api.spec.ts __tests__/crm-vnext-evidence-review-packet-api.spec.ts
```

Result:

```text
4 test files passed / 13 tests passed
```

Full verification:

```bash
npm test
npm run build
```

Result:

```text
70 test files passed / 220 tests passed
Next build compiled successfully
```

## Next Step

The next high-leverage hito is a Stitch Batch Review v0:

- take several people/clues at once,
- gather MailerLite/local/Drive/Gmail/contact evidence packets,
- apply the decision ledger,
- rank proposed create/enrich/merge/defer actions,
- produce an approval-ready batch without writing cards.

That is the bridge between infrastructure and the first satisfying multi-card stitch.

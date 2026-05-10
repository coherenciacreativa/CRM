# Hito 33: Card Merge Review Resolver v0

Date: 2026-05-10

## What Changed

CRM vNext now has a guarded local resolver for staged merge-review records.

New surfaces:

- `POST /api/crm-vnext/card-merge-review-resolver`
- `npm run crm:vnext:card-merge-review-resolver`
- `lib/crm/crm-vnext-card-merge-review-resolver.ts`

The resolver reads the local vNext card store, inspects `mergeReviewQueue`, builds a proposed resolved card, and can commit selected reviewed merges with backup and ledger provenance.

## Why It Matters

Hito 32 deliberately staged Juan Jose Trujillo as a merge review instead of auto-merging him into `email:juanjotru@gmail.com`.

That was the right safety posture, but it left a queue item waiting for a controlled resolver. Hito 33 adds that resolver without weakening the guardrails:

```text
staged merge review -> dry-run resolver -> explicit approval -> backup -> local card-store merge -> ledger
```

This gives Mantis the missing operating move between "we found a good existing target" and "the canonical card is actually enriched."

## Approval Rules

A committed merge requires:

- `commit=true`,
- `approvedBy`,
- explicit `reviewIds` or `resolveAllReady=true`,
- no blocked review items,
- `ackRestrictedService=true` when any selected review contains restricted service context.

Dry-runs may show commit blockers without writing anything.

## Safety

Still prohibited:

- outbound messages,
- Fact Store writes,
- live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram API calls,
- credential reads or rotations,
- automatic merges,
- restricted-service merge without acknowledgement.

Committed writes are local-only and affect only:

- `.crm-vnext/person-card-store/person-cards-vnext.json`
- `.crm-vnext/card-merge-review-resolver/ledger.jsonl`
- `.crm-vnext/backups/card-merge-review-resolver/*`

## Verification

Passed focal tests:

```bash
npm test -- --run __tests__/crm-vnext-card-merge-review-resolver.spec.ts __tests__/crm-vnext-card-merge-review-resolver-api.spec.ts __tests__/operator-capabilities.spec.ts
```

The test suite verifies:

- dry-run preview does not write,
- restricted-service merge requires acknowledgement,
- commit without acknowledgement is blocked,
- committed fixture writes local store and ledger with backup,
- resolved queue item is removed,
- API responses do not leak local paths.

Real local dry-run against the current `.crm-vnext` store:

```bash
npm run crm:vnext:card-merge-review-resolver
```

Result:

- store cards: 734
- merge reviews: 1
- selected reviews: 1
- ready for human-approved merge: 1
- restricted service reviews: 1
- operations planned: 7
- operations executed: 0
- write files touched: 0
- staged review id: `merge_review_437313f33910fe21`
- target: `email:juanjotru@gmail.com`
- required blocker before commit: `restricted_service_ack_required`

The dry-run also shows that the staged Juan Jose draft still lacks phone/city fields, even though MailerLite live evidence found them earlier. That should be treated as a useful review signal before committing the merge: either accept the merge now and enrich contact fields in the next pass, or refresh the staged evidence from MailerLite first.

## Next Build Step

Decide whether to refresh Juan Jose's staged contact fields from MailerLite before committing, then resolve the merge only if Alejandro explicitly approves the restricted-service acknowledgement for this local card update.

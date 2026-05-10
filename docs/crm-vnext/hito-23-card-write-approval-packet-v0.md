# Hito 23 - Card Write Approval Packet v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has an explicit read-only approval packet before any future card write.

New surfaces:

- `lib/crm/crm-vnext-card-write-approval-packet.ts`
- `POST /api/crm-vnext/card-write-approval-packet`
- `npm run crm:vnext:card-write-approval-packet`
- docs `card-write-approval-packet.md`
- operator capabilities wiring

## Why It Matters

This is the missing human boundary between "we found the likely card action" and "we are allowed to write later".

For student/contact enrichment, Mantis can now receive a batch of clues, run the evidence pipeline, and return:

- which contacts are ready for explicit write approval,
- which contacts still need evidence decisions,
- which contacts need stronger identity,
- which approval scopes are involved.

Still no card writes happen.

## Real Behavior

For the current Juan Jose + Mayerli pattern:

- Juan Jose can become `ready_for_human_approval` once MailerLite evidence and service context are present, with explicit scopes for identity, merge policy, restricted therapy service context, and no outbound.
- Mayerli remains `blocked_open_evidence_questions` when a family/shared email candidate is still unresolved.
- Stored decisions such as keeping `mayaariana@hotmail.com` unassigned are applied and not asked again.
- Approval packets execute zero operations.

## Guardrails

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No canonical merge.
- No outbound.
- No live connector calls.
- No credentials.
- Approval means "eligible for a future reviewed card-write path", not immediate apply.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-card-write-approval-packet.spec.ts __tests__/crm-vnext-card-write-approval-packet-api.spec.ts
```

Result:

```text
2 test files passed / 4 tests passed
```

Full verification:

```bash
npm test
npm run build
```

Result:

```text
74 test files passed / 228 tests passed
Next build compiled successfully
```

Smoke:

```bash
npm run crm:vnext:card-write-approval-packet -- --decision-ledger-path /tmp/crm-vnext-evidence-review-decisions-smoke.jsonl --evidence-file /tmp/crm-vnext-mayerli-google-drive-evidence.json --text "<Juan Jose + Mayerli batch>"
```

Result:

```text
items=2
readyForHumanApproval=1
blockedOpenEvidenceQuestions=1
operationsPreviewed=11
operationsExecuted=0
```

## Next Step

Run the approval packet on real small batches of current students.

Once Alejandro approves the format and a few items, the next hito can implement the actual reviewed Card Write Path v0 that applies approved operations to canonical cards with provenance, backups, and rollback discipline.

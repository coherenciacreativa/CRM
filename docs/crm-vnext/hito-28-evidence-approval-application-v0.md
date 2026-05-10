# Hito 28 - Evidence Approval Application v0

Date: 2026-05-10
Status: implemented

## Why

By Hito 27 the CRM could find stronger evidence candidates and hold them for review. The next missing lever was operational:

```text
Alejandro answers a question -> Mantis records it -> the packet stops asking again
```

Without that, the system could find evidence but not progressively clear the review queue.

## What Changed

Added Evidence Approval Application:

- `lib/crm/crm-vnext-evidence-approval-application.ts`
- `POST /api/crm-vnext/evidence-approval-application`
- `npm run crm:vnext:evidence-approval-application`
- tests for module and API

The application:

1. builds the current card-write approval packet,
2. applies selected evidence decisions to the local decision ledger in dry-run or commit mode,
3. reruns the approval packet with those decisions applied,
4. reports before/after deltas and resolved questions.

## Example

Input decision:

```text
amaliadbg@hotmail.com=confirm_email_for_subject
```

Effect:

- stores evidence ownership provenance when committed,
- removes that email ownership question from future packets,
- may move the item from `blocked_open_evidence_questions` to `ready_for_human_approval`,
- still does not write or merge any person card.

## Realistic Smoke Cases

Mayerli/Ariana pattern:

```text
mayaariana@hotmail.com=keep_email_unassigned_family_or_companion
```

Result:

- open evidence questions drop from 1 to 0 in preview,
- the email remains evidence but is not assigned to Mayerli,
- no card mutation.

Amalia pattern:

```text
amaliadbg@hotmail.com=confirm_email_for_subject
```

Result:

- local decision ledger can record one confirmed primary-email decision,
- future approval packets no longer ask that same ownership question,
- card-write approval remains separate.

## Big Picture Notes Captured

Alejandro also raised three strategic signal lanes to keep in view:

- MailerLite campaign engagement: opens, clicks, recency, decay, groups, and article/topic interest should feed warmth and relationship scoring.
- Email replies: people who reply to `Notas de Alejandro` are high-value relationship signals and should eventually be computed from Gmail/read-only evidence.
- Instagram engagement: stable API ingestion remains a key future moment, including comments, likes, story views, new follows, and DMs where Meta permissions allow.

These are not part of this hito's implementation, but they stay in the scoring and channel roadmap.

## Safety

- No person-card writes.
- No Fact Store writes.
- No outbound messages.
- No live connector calls from the CRM API.
- No credential reads or refreshes.
- Decision ledger writes only happen with explicit commit and approver.

## Verification

Targeted:

```bash
npm test -- --run __tests__/crm-vnext-evidence-approval-application.spec.ts __tests__/crm-vnext-evidence-approval-application-api.spec.ts __tests__/crm-vnext-evidence-review-decisions.spec.ts __tests__/crm-vnext-card-write-approval-packet.spec.ts
```

Passed: 4 files / 12 tests.

Full verification:

```bash
npm test
npm run build
npm run crm:vnext:readiness
```

Passed:

- 79 test files / 251 tests
- Next.js production build
- readiness `status=ready`

## Next

Next useful hito: Approval Workbench / Review Queue v0.

That would give Mantis a compact batch of unresolved evidence questions with recommended defaults, so Alejandro can approve several identity decisions in one conversation instead of one by one.

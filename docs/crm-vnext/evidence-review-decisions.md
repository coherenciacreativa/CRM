# CRM vNext Evidence Review Decisions

Date: 2026-05-10
Status: v0 local approval ledger

## Purpose

Evidence Review Decisions stores Alejandro-approved answers to Evidence Review Packet questions.

It is the ledger between:

```text
review question -> approved decision -> future card write path
```

It still does not mutate person cards.

Card Apply Preview and Evidence Review Packet can now consume this ledger:

- confirmed emails become preview-only candidate updates,
- family/companion emails stay unassigned,
- resolved questions stop reappearing in review packets.

The ledger is memory, not action. It informs future proposals without executing writes.

## Surfaces

- API: `GET /api/crm-vnext/evidence-review-decisions`
- API: `POST /api/crm-vnext/evidence-review-decisions`
- CLI:

```bash
npm run crm:vnext:evidence-review-decisions
npm run crm:vnext:evidence-review-decisions -- --packet-file ./packet.json --select-email mayaariana@hotmail.com=keep_email_unassigned_family_or_companion
npm run crm:vnext:evidence-review-decisions -- --packet-file ./packet.json --select-email mayaariana@hotmail.com=keep_email_unassigned_family_or_companion --write --approved-by Alejandro
```

## Default Posture

Preview by default:

- builds or receives an evidence-review packet,
- validates selected options against real questions,
- returns what would be stored,
- writes nothing.

Commit requires:

```text
commit=true + approvedBy
```

or in CLI:

```bash
--write --approved-by Alejandro
```

## What It Stores

Each stored decision includes:

- subject,
- candidate email,
- selected option,
- approved by,
- decided at,
- evidence source ids,
- effect flags,
- proof that card mutation, Fact Store write, and outbound were not executed.

Effects include:

- `primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval`
- `keepEmailUnassigned`
- `createsRelatedPersonCandidate`
- `needsMoreEvidence`
- `ignoredCandidate`

Even when a decision confirms an email, card writing still needs a separate approval path.

## Mayerli / Ariana Example

For:

```text
mayaariana@hotmail.com=keep_email_unassigned_family_or_companion
```

the ledger records:

```json
{
  "candidateEmail": "mayaariana@hotmail.com",
  "selectedOptionId": "keep_email_unassigned_family_or_companion",
  "effect": {
    "keepEmailUnassigned": true,
    "cardWriteStillRequiresApproval": true
  }
}
```

This means future card writes should not assign that email to Mayerli unless a later explicit decision changes the provenance.

When the same evidence appears again, Evidence Review Packet should not ask this email-ownership question again. Card Apply Preview should show the email under `evidenceDecisionSummary.keptUnassignedEmails` and keep Mayerli's email field missing.

## Safety

- Local ledger only.
- No person-card mutation.
- No Fact Store write.
- No merge execution.
- No outbound messages.
- No live connector calls.
- No credential reads.
- Stored decision is provenance, not automatic apply permission.

## Operator Rule

Use this only after Alejandro/Mantis has selected an option from Evidence Review Packet.

Do not infer approval from the recommended option. A recommendation is not a decision.

When Mantis needs to see the impact of selected decisions immediately, use `evidence-approval-application`. It can preview or commit the selected evidence decisions, then rerun the card-write approval packet so the operator can see which questions were resolved and which items are ready for a separate card-write approval.

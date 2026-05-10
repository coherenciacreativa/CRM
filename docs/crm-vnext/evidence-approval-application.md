# CRM vNext Evidence Approval Application

Date: 2026-05-10
Status: v0 local decision application

## Purpose

Evidence Approval Application is the bridge between:

```text
Alejandro confirms an evidence decision
-> local evidence decision ledger
-> rerun card-write approval packet
```

It answers:

```text
If we record this approved evidence decision, what stops being blocked?
```

It does not write person cards.

## Surfaces

- API: `POST /api/crm-vnext/evidence-approval-application`
- CLI:

```bash
npm run crm:vnext:evidence-approval-application -- \
  --text "CRM: Amalia de Bedud es estudiante de yoga..." \
  --select-email amaliadbg@hotmail.com=confirm_email_for_subject

npm run crm:vnext:evidence-approval-application -- \
  --text-file ./batch.txt \
  --evidence-file ./evidence.json \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl \
  --select-email natis1000@hotmail.com=confirm_email_for_subject \
  --write \
  --approved-by Alejandro
```

## What It Produces

The report includes:

- decision append preview or commit result,
- before approval-packet summary,
- after approval-packet summary,
- resolved evidence questions,
- items that became ready for human card-write approval,
- proof that no card operations executed.

Useful delta:

```json
{
  "openEvidenceQuestions": -1,
  "resolvedEvidenceQuestions": 1,
  "newlyReadyForHumanApproval": 1
}
```

## Decision Options

Accepted evidence-review options:

- `confirm_email_for_subject`
- `keep_email_unassigned_family_or_companion`
- `create_related_person_candidate`
- `ask_for_more_evidence`
- `ignore_candidate`

## Safety Boundary

Dry-run is default.

`--write` commits only to the local evidence-review decision ledger and requires `--approved-by`.

Even after a confirmed email decision, the system still requires a separate card-write approval path before mutating canonical person cards.

## Safety

- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp calls.
- No credential reads or refreshes.
- Local paths redacted.

## Operator Rule

Use this after Alejandro answers evidence ownership questions.

Examples:

```text
natis1000@hotmail.com belongs to Natalia Cardenas De Bedout.
luis.e.lopera@gmail.com belongs to Luis Enrique Lopera.
mayaariana@hotmail.com should stay family/companion evidence for Mayerli.
```

Then rerun the approval packet. Items with no remaining evidence questions can move to human card-write approval.

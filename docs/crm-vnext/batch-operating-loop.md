# CRM vNext Batch Operating Loop

Date: 2026-05-11
Status: Implemented read-only local/API contract

## Purpose

`POST /api/crm-vnext/batch-operating-loop` is the stable operator surface for a phrase like:

```text
Mantis, probemos un batch nuevo.
```

It does not replace the lower-level CRM vNext layers. It composes them into one decision map:

- unresolved evidence questions,
- blocked identity cases,
- approval-ready card-write candidates,
- dry-run local write preview.

When the request starts with Mantis in natural language, first use
[`mantis-natural-batch-protocol.md`](./mantis-natural-batch-protocol.md) so
Mantis can produce the contact-keyed evidence JSON that this loop consumes.

## Local Command

```bash
npm run crm:vnext:batch-operating-loop -- \
  --text-file <batch-text.txt> \
  --evidence-file <evidence-sources.json> \
  --source-kind instagram_signal \
  --reporter Mantis \
  --channel codex \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl
```

Optional:

```bash
--include-expanded-sources
--out tmp/crm-vnext/batch-operating-loop.json
--fail-on-open-work
```

## Output Queues

`evidenceQuestionQueue`

Questions Alejandro should answer before an email or similar evidence is assigned to a subject.

`blockedIdentityQueue`

Contacts that need more identity evidence before card-write approval. Each item includes:

- priority,
- missing identity fields,
- recommended read-only lanes,
- a copy-ready `operatorPrompt` for Mantis.

`readyApprovalItems`

Items ready for explicit human card-write approval.

`readyWritePreview`

Dry-run plan only. It shows what would be eligible after approval, but it never writes.

## Safety

This loop is read-only:

- no person-card mutation,
- no Fact Store write,
- no outbound messages,
- no live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls,
- no credential reads or changes.

The loop may read the local vNext card store when present and falls back to legacy Person Cards V1. It may also consume supplied `evidenceSources` gathered read-only by Mantis or another helper.

## Operator Rule

If the batch has open evidence or identity work, Mantis should work those queues first. If the batch has ready approvals, Mantis should ask Alejandro for explicit approval before any committed local write. A dry-run preview is never permission to mutate records.

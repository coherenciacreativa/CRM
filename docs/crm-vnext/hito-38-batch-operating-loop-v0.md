# Hito 38: Batch Operating Loop v0

Date: 2026-05-11

## What Changed

CRM vNext now has a read-only batch operating loop for Mantis.

Instead of manually chaining:

```text
Evidence Approval Workbench -> Card Write Approval Packet -> Card Write Apply dry-run
```

Mantis can now call one surface:

```bash
npm run crm:vnext:batch-operating-loop -- \
  --text-file <batch-text.txt> \
  --evidence-file <evidence-sources.json> \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl
```

or:

```text
POST /api/crm-vnext/batch-operating-loop
```

## Why It Matters

This is the first stable bridge between Alejandro's natural operating style and the CRM write pipeline.

The intended future interaction is:

```text
Alejandro: Mantis, probemos un batch nuevo.
Mantis: gathers read-only evidence.
CRM vNext: returns one operating loop.
Mantis: resolves evidence/identity queues or asks Alejandro only for precise decisions.
CRM vNext: applies local writes only after explicit approval.
```

## New Queues

- `evidenceQuestionQueue`: human evidence ownership questions.
- `blockedIdentityQueue`: contacts that need more identity evidence, with recommended search lanes.
- `readyApprovalItems`: candidates ready for explicit card-write approval.
- `readyWritePreview`: dry-run plan for what a later write could do.

## Safety

No cards were mutated by this hito.

No Fact Store write happened.

No MailerLite, Instagram, ManyChat, Gmail, Google Drive, Contacts, WhatsApp, Telegram, or credential mutation happened.

The API and CLI are read-only by default. The CLI can write a local report only with `--out`.

## Validation On Juana/IG Batch

Ran the loop against the existing actionable Juana/IG retreat import:

```bash
npm run crm:vnext:batch-operating-loop -- \
  --text-file tmp/crm-vnext/juana_ig_retreat_actionable_import.txt \
  --evidence-file tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --source-kind instagram_signal \
  --reporter Mantis \
  --channel codex \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl
```

Result:

- 2 items evaluated.
- 0 open evidence questions.
- 1 ready approval/write-preview item: Gulnara.
- 1 blocked identity item: Viviana, missing phone, with suggested read-only lanes across Contacts, MailerLite cursor scan, Gmail, Drive retreat tables, lead-capture traces, local CSV exports, and Instagram/ManyChat archive.
- 0 operations executed.

## Next

Use this loop on the Juana/IG retreat batch and future batches. The main operator behavior to validate is whether Mantis can take `blockedIdentityQueue.operatorPrompt`, search read-only in the right lanes, and return compatible `evidenceSources` without Alejandro writing sophisticated prompts.

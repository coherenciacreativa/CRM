# Hito 11 - Connected Evidence Packets v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Deep Local Stitching can now ingest selected read-only evidence packets from connected investigations.

This is the bridge for sources like:

- Gmail search results,
- contact-list entries,
- manually exported contact records,
- future connector adapters.

The CRM app receives the evidence as structured input instead of holding live connector credentials.

## Why It Matters

Alejandro wants Mantis/Codex to proactively search scattered community information, including Gmail and contacts, while the CRM remains disciplined.

This hito creates the discipline:

```text
connector/export search -> selected evidence packet -> stitching review -> proposal -> no mutation without approval
```

## API Shape

`POST /api/crm-vnext/deep-local-stitching` now accepts:

```json
{
  "text": "CRM: @mayuyis2626 es Mayerli...",
  "evidenceSources": [
    {
      "sourceKind": "gmail_export",
      "sourceId": "gmail:thread:example",
      "subject": "Retiro y clases de yoga",
      "snippet": "Mayerli pregunta por el retiro y confirma interés en yoga."
    }
  ]
}
```

## CLI

```bash
npm run crm:vnext:deep-local-stitching -- --evidence-file ./evidence.json --text "CRM: @mayuyis2626 es Mayerli."
```

The JSON file can be either an array of evidence packet objects or an object with `evidenceSources`.

## UI

`/crm-vnext/deep-local-stitching` now includes a `Connected Evidence JSON` field for testing or operator use.

## Guardrails

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No live Gmail/Contacts call from the CRM app itself.
- No credential reads.
- Local paths are redacted.
- Evidence snippets are review context, not final truth.

## Follow-On Implemented

Build a small Gmail search helper for Mantis that takes a person clue, performs a read-only Gmail query, and emits a compact `evidenceSources` JSON packet for this endpoint.

Implemented as:

- `docs/crm-vnext/gmail-evidence-helper.md`
- `docs/crm-vnext/hito-12-gmail-evidence-helper-v0.md`
- `POST /api/crm-vnext/gmail-evidence-helper`
- `npm run crm:vnext:gmail-evidence`

Keep a separate infrastructure backlog item for OpenClaw/gog auth stability:

- `docs/crm-vnext/gmail-openclaw-auth-stability-backlog.md`
- Do not block CRM card/evidence work on that fix.
- Use connected evidence packets as the fallback-safe contract while OpenClaw Gmail auth is stabilized.

## Verification

- Focused tests pass for connected evidence packet normalization, API ingestion, and operator capabilities.
- Synthetic API smoke with one Gmail packet and one contacts packet returned `defer_new_card_creation`.
- Read-only Gmail connector smoke for Mayerli found useful evidence, then passed only redacted snippets into the CRM endpoint:
  - Zoom/Yoga Colombia attendance evidence,
  - payment-notification evidence with amount redacted.
- The CRM app did not call Gmail directly and did not receive connector credentials.
- Local paths remained redacted.

Smoke summary:

```json
{
  "packets": 2,
  "sourceKinds": {
    "gmail_export": 2
  },
  "newCardCreationsDeferred": 1,
  "gmailHits": [
    {
      "confidence": "strong",
      "signals": ["supports_yoga_context", "email_thread_context"]
    },
    {
      "confidence": "medium",
      "signals": ["email_thread_context"]
    }
  ]
}
```

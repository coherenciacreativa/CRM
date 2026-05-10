# Hito 10 - Evidence Source Expansion v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Deep Local Stitching can now search a wider local evidence perimeter, not only memory.

New source families:

- local CSVs,
- retreat/registration tables in text or CSV form,
- contact exports,
- downloaded files,
- existing memory sources.

## Why It Matters

Alejandro confirmed that contact evidence may be scattered across email, contact lists, retreat tables, downloaded CSVs, and local files.

This hito moves the CRM toward the desired operating posture:

```text
Mantis receives a clue -> searches broadly -> gathers evidence -> proposes stitching -> waits before mutating cards.
```

## New Behavior

`POST /api/crm-vnext/deep-local-stitching` accepts:

```json
{
  "text": "CRM: @mayuyis2626 es Mayerli...",
  "includeExpandedSources": true
}
```

The CLI accepts:

```bash
npm run crm:vnext:deep-local-stitching -- --include-expanded-sources --text "CRM: @mayuyis2626 es Mayerli."
```

The browser route `/crm-vnext/deep-local-stitching` includes an expanded-source toggle.

## Guardrails

- Still read-only.
- Still no card mutation.
- Still no Fact Store write.
- Still no outbound.
- Still no Instagram/MailerLite/ManyChat/WhatsApp/Telegram/Gmail live calls.
- Still no credential reads.
- Local paths remain redacted.

## Known Limits

- Excel `.xlsx` attendee tables are discovered as a real need but are not parsed by this v0 unless exported to CSV or wired through a table parser.
- Gmail and contact-list connector search are authorized conceptually by Alejandro, but still need separate read-only adapters.

## Verification Target

Completed verification:

- Unit tests cover CSV/contact/retreat-table evidence.
- API/UI/CLI expose expanded search safely.
- Real Mayerli smoke with `includeExpandedSources=true` scanned memory plus expanded local evidence and still returned `defer_new_card_creation`.
- Expanded smoke included source families such as `contacts_export`, `retreat_table`, `local_csv`, and `downloaded_file`.
- API output did not expose absolute local paths.

Smoke summary:

```json
{
  "filesScanned": 2500,
  "roots": 6,
  "newCardCreationsDeferred": 1,
  "sourceKinds": {
    "contacts_export": 38,
    "retreat_table": 21,
    "local_csv": 34
  }
}
```

# Hito 16 - Contact Field Resolution v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now separates two states that were previously mixed together:

```text
identity enriched
contact fields still missing
```

Deep Local Stitching now returns a clue-level `identitySummary` with:

- full-name candidates,
- email candidates,
- phone candidates,
- Instagram handles,
- present identity fields,
- missing contact fields,
- source kinds that contributed identity signals.

Card Apply Preview exposes the same information as `identityResolution` on each preview item.

Card Write / Merge Policy now adds a specific next evidence action when email or phone is missing:

```text
Run a contact-field hunt for missing email/phone across MailerLite read-only export,
macOS Contacts, Zoom registration/participant reports, and downloaded CSV/XLSX files.
```

## Real Mayerli Result

For:

```text
@mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.
```

The preview now says:

```json
{
  "targetPersonId": "ig:mayuyis2626",
  "displayName": "Gladys Mayerli Garcia Ortegon",
  "identityResolution": {
    "fullNameCandidates": ["Gladys Mayerli Garcia Ortegon"],
    "emailCandidates": [],
    "phoneCandidates": [],
    "instagramHandles": ["mayuyis2626"],
    "missingContactFields": ["email", "phone"]
  }
}
```

No operations execute.

## Read-Only Search Performed

Sources checked in this pass:

- Gmail exact searches for the full name and handle,
- local Zoom chat download,
- local Zoom registration CSV,
- local retreat scholarship CSV,
- local retreat spreadsheet `inscritos retiro de julio.xlsx`,
- local MailerLite bridge previously checked.

Findings:

- full name found,
- prior Zoom/yoga evidence found,
- prior payment evidence found,
- email not confirmed,
- phone not confirmed.

Blocked/limited route:

- macOS Contacts read via AppleScript appeared to require local privacy permission and did not return safely in this session.

## Guardrails

- No card mutation.
- No merge execution.
- No Fact Store write.
- No outbound channels.
- No live Gmail/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls from CRM.
- No credential reads.
- No exact payment amounts are needed in CRM review packets.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-deep-local-stitching.spec.ts __tests__/crm-vnext-card-write-merge-policy.spec.ts __tests__/crm-vnext-card-apply-preview.spec.ts
```

Real smoke:

- Mayerli batch with expanded local sources,
- selected Gmail evidence packets,
- `identityResolution.missingContactFields = ["email", "phone"]`,
- `operationsExecuted = 0`.

## Next Step

Before writing or merging Mayerli, Mantis should exhaust the contact-field hunt:

1. MailerLite live UI/export read-only if already authenticated.
2. macOS Contacts after Alejandro grants permission.
3. Zoom participant/registration reports if available for Yoga Colombia sessions.
4. Any downloaded CSV/XLSX files likely to contain retreat attendees or class rosters.

If these do not produce email or phone, ask Alejandro/Juana for the missing contact fields rather than creating a fully approved card.

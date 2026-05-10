# CRM vNext Google Drive Evidence Helper

Date: 2026-05-10
Status: v0 read-only evidence helper

## Purpose

Google Drive Evidence Helper turns CRM person clues into safe Drive/Docs/Sheets search plans and converts supplied read-only rows into evidence packets for Deep Local Stitching.

It is for the scattered-data phase where retreat rosters, program interest sheets, old forms, and Google Docs may hold identity evidence that is not yet in the CRM:

```text
CRM clue -> Drive/Docs/Sheets read-only search -> evidence packet -> Deep Local Stitching -> Card Apply Preview
```

The CRM does not call live Google Drive from this API and does not own Google credentials. Mantis or Codex can search Drive read-only, then supply selected rows.

## Surfaces

- API: `POST /api/crm-vnext/google-drive-evidence-helper`
- CLI:

```bash
npm run crm:vnext:google-drive-evidence -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:google-drive-evidence -- --search-results-file ./drive-results.json --text "CRM: @mayuyis2626 es Mayerli."
```

## Operating Modes

Planning only:

- receives a CRM report,
- runs Identity Stitching Research locally,
- emits suggested Drive/Docs/Sheets queries,
- returns no evidence packets until results are supplied.

Supplied results:

- receives connector/export rows through `googleDriveSearchResults`,
- matches them against identity clues,
- emits `evidenceSources` packets with `sourceKind: google_drive_export` or `retreat_table`,
- carries name, email candidate, phone, city/country, sheet title, row number, and context when present.

## Family Email Guardrail

Some retreat tables may contain one shared family email. For Mayerli, Drive/Sheets evidence surfaced:

- `mayariana@hotmail.com`
- `mayaariana@hotmail.com`

Because Alejandro remembers this may belong to Ariana, not Mayerli, the helper flags those rows as:

```text
family_or_companion_email_review
```

In that case:

- the email remains visible as an evidence candidate,
- `evidenceSource.email` is set to `null`,
- Card Apply Preview does not assign it as Mayerli's primary email,
- `missingContactFields` still includes `email`.

This is the desired posture: use the clue, do not pretend ownership is confirmed.

## API Shape

```json
{
  "text": "CRM: @mayuyis2626 es Mayerli...",
  "sourceKind": "alejandro_conversation",
  "reporter": "Alejandro",
  "channel": "codex",
  "googleDriveSearchResults": [
    {
      "id": "sheet-id",
      "spreadsheetTitle": "Retiros 2023",
      "sheetName": "Inscripciones",
      "rowNumber": 12,
      "name": "Mayerli Garcia",
      "email": "mayariana@hotmail.com",
      "phone": "3115381341",
      "relationshipContext": "Retiro familiar; email puede ser de Ariana.",
      "emailOwnership": "family_or_companion"
    }
  ]
}
```

The CLI also accepts a wrapped file:

```json
{
  "googleDriveSearchResults": []
}
```

## Safety

- Read-only.
- No Google Drive create/update/move/share/delete.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No credential read or print.
- API does not call live Google Drive.

## Operator Rule

Use this before accepting "create new card" when Alejandro believes a person has attended retreats, programs, or classes that may live in Drive tables.

Mantis should search Drive read-only, supply selected rows, then let Deep Local Stitching and Card Apply Preview decide whether the evidence is enough for a reviewed create/enrich packet.

If the Drive row contains a family/shared email, run Evidence Review Packet after Card Apply Preview so the email becomes a decision question, not an accidental primary-email write.

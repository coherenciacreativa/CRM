# Hito 18 - Google Drive / Sheets Evidence Helper v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a safe Google Drive/Docs/Sheets evidence lane.

New surfaces:

- `POST /api/crm-vnext/google-drive-evidence-helper`
- `npm run crm:vnext:google-drive-evidence`
- `google_drive_export` / `retreat_table` evidence packets
- Deep Local Stitching support for Google Drive evidence and family-email review signals
- Card Apply Preview protection so ambiguous family emails are not assigned automatically

This keeps live Drive auth outside the CRM runtime while still letting Mantis use Drive as a serious identity source.

## Real Mayerli Finding

Read-only Drive/Sheets evidence found rows for Mayerli across retreat/program tables:

- `Mayerli Garcia` in `Retiros 2023`
- `Gladys Mayerli Garcia O.` in `Programas Coherencia Creativa`
- `Gladys Mayerli Garcia Ortegon` in `RETIRO 25 Y 26 DE JUNIO`

The evidence supports:

- fuller name: `Gladys Mayerli Garcia Ortegon`
- phone candidate: `3115381341`
- retreat/program context

It also surfaced email candidates:

- `mayariana@hotmail.com`
- `mayaariana@hotmail.com`

Because Alejandro remembered this may be Ariana's email, the system keeps those emails review-only. They appear as candidates but are not assigned to Mayerli.

## Smoke Result

Google Drive Evidence Helper smoke:

```json
{
  "driveResultsRead": 3,
  "driveResultsMatched": 3,
  "evidenceSources": 3,
  "familyOrCompanionEmailReview": 3
}
```

Card Apply Preview smoke:

```json
{
  "displayName": "Gladys Mayerli Garcia Ortegon",
  "emailCandidates": ["mayariana@hotmail.com", "mayaariana@hotmail.com"],
  "missingContactFields": ["email"],
  "proposedEmail": null,
  "proposedPhone": "3115381341"
}
```

No operation executed.

## Guardrails

- No Google Drive mutation.
- No person-card mutation.
- No Fact Store write.
- No outbound channels.
- No live Drive call from the CRM API.
- No credential read/print/rotation.
- Ambiguous family or companion emails stay review-only.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-google-drive-evidence-helper.spec.ts __tests__/crm-vnext-google-drive-evidence-helper-api.spec.ts __tests__/crm-vnext-card-apply-preview.spec.ts __tests__/operator-capabilities.spec.ts
```

Additional focused tests after extraction cleanup:

```bash
npm test -- --run __tests__/crm-vnext-deep-local-stitching.spec.ts __tests__/crm-vnext-card-apply-preview.spec.ts __tests__/crm-vnext-google-drive-evidence-helper.spec.ts
```

## Next Step

Use this lane as the default when Mantis suspects retreat/program evidence is in Drive. For Mayerli, the next unresolved field is not "find any email"; it is "confirm whether the Ariana-looking email belongs to Mayerli or to Ariana/family."

# Hito 56: Contact Key Preservation v0

Date: 2026-05-15
Status: implemented

## Why

The high-potential stitching batch exposed a subtle but important identity risk: a contact-keyed report can use an email as the stable target key. If the importer treats that key as a display label, underscores can be converted into spaces and a safe email bridge can become an unsafe identity suggestion.

Concrete case:

- Correct target: `email:r_mart803@hotmail.com`
- Unsafe degradation to prevent: `email:r mart803@hotmail.com` or `mart803@hotmail.com`

That kind of bug would be especially dangerous in CRM vNext because the next step after import is often a card write preview.

## What Changed

- Added explicit parsing for `email:` contact keys.
- Preserved exact email contact keys, including underscores and punctuation.
- Added explicit parsing for `ig:` contact keys.
- Cleaned mixed labels such as `Rocío Martínez Jaime / @maryamtzj` into a human display name without losing the underlying Instagram handle.
- Added current-card identity fallbacks for contact-keyed reports that already carry a local card snapshot.

## Safety

- The importer remains read-only.
- No CRM cards were written by this hito.
- No Fact Store writes.
- No live connector calls.
- No outbound messages.

## Validation

Regression coverage now includes a contact-keyed report with:

- `email:r_mart803@hotmail.com`
- local card email `r_mart803@hotmail.com`
- Instagram handle `maryamtzj`
- country `México`

The test asserts that the exact email survives the import and that the degraded `email:r mart803@hotmail.com` text never appears.

# Hito 50 - Instagram UI Location Capture v0

Date: 2026-05-14

## Why

Alejandro noticed a gap in the authenticated Instagram Messages UI lane: Mantis can find the right thread and still miss location clues if they appear as normal conversation instead of profile-like fields.

Gabriel is the model case: Alejandro saw directly in Instagram that Gabriel said he was from Iquique, in northern Chile. That should not be lost just because the JSON did not include explicit `city` and `country` fields.

## What Changed

- The IG-origin batch prompt now tells Mantis to actively capture city/country from self-location phrases in the DM body.
- The Instagram DM UI evidence converter accepts `locationText`, `locationEvidence`, `visibleLocationText`, `locationSnippet`, `threadLocation`, and `location`.
- The converter can infer structured location from compact self-location text such as:
  - `soy de Iquique, Chile`
  - `vivo en Bogota`
  - `dijo que es de Iquique, en el norte de Chile`
- The location gazetteer now includes Iquique, Chile.
- Tests guard the important boundary: event/program locations such as `el retiro seria en Subachoque` are not promoted as the person's city.

## Operator Rule

When Mantis uses Instagram Messages UI for CRM vNext stitching, she should inspect the compact visible thread for location clues, not only email/phone/handle. If a person self-locates, emit:

```json
{
  "city": "Iquique",
  "country": "Chile",
  "locationEvidence": "dijo que es de Iquique, en el norte de Chile"
}
```

If the location belongs to a retreat, class, event, venue, or modality, keep it in `threadContext` or `preferences`; do not assign it as the contact's city.

## Safety

This does not authorize broader Instagram harvesting. It only improves read-only, authenticated, contact-scoped UI observations. No outbound messages, reactions, follows, credential work, card writes, Fact Store writes, ManyChat LIVE changes, or permission changes.

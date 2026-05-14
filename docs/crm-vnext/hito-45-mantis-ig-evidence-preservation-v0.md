# Hito 45 - Mantis IG Evidence Preservation v0

Date: 2026-05-14
Status: shipped locally, read-only workflow validated

## Why This Matters

The Instagram-origin batch from Mantis proved that CRM vNext needs to preserve more than final identity fields. A UI evidence hunt can contain useful relationship context: how someone arrived, what they said during onboarding, city/country clues, or why a candidate must remain review-only.

This hito closes that lane without writing cards automatically.

## What Changed

- `crm:vnext:mantis-evidence-import` now preserves `evidenceRecords` from contact-keyed Mantis reports.
- Evidence records are converted into connected evidence sources such as:
  - `instagram_dm_ui_export`
  - `lead_capture_export`
  - `mailerlite_export`
  - `local_fixture`
- The importer keeps richer fields from matches and records: type, confidence, search term, matched display name, matched Instagram handle, candidate, reason, finding, and compact attributes.
- `instagram_dm_ui_export` can contribute identity fields when the evidence explicitly supports them.
- `lead_capture_export` remains useful as context, but it does not broadly promote identity fields from arbitrary snippets.
- Instagram handle extraction now rejects numeric-only candidates, preventing provenance dates such as `2026-05-13...` from becoming false handles.
- Structured name parsing now handles pipe-separated evidence packets cleanly.

## Real Batch Outcome

Input:

```bash
/Users/alejandrogomez/Documents/Mantis-Reports/crm_vnext_instagram_dm_ui_stitching_evidence_2026-05-14_0802_KST.json
```

Importer result:

- 8 contacts selected.
- 35 evidence sources preserved.
- 19 `instagram_dm_ui_export` sources.
- 7 `lead_capture_export` sources.
- 7 `mailerlite_export` sources.
- 2 `local_fixture` sources.
- 0 writes.
- 0 outbound actions.

Batch loop dry-run:

- 8 items processed.
- 8 ready write previews.
- 0 evidence questions.
- 0 identity blockers.
- 0 operations executed.

Decision:

Do not commit this whole batch blindly. Most card fields were already present from previous approved writes. The new value is mainly context evidence, so the next high-leverage step is a context/fact promotion lane rather than duplicate card writes.

## Important Regression Fixed

Edwin Velasquez had an IG UI observation where the email appeared in Instagram Messages search, but no handle was visible. Before this hito, the preview could mistakenly infer `2026` from a timestamp-like source id as an Instagram handle candidate.

That is now blocked by tests:

```bash
npm test -- crm-vnext-card-apply-preview.spec.ts
npm test -- crm-vnext-mantis-evidence-import-script.spec.ts
```

## Next Logical Hito

Build a reviewed context/fact promotion lane:

```text
Mantis contact-keyed evidence
-> evidenceSources with rich context
-> proposed card facts / relationship notes
-> human approval
-> local card evidence/facts write
```

This is what will let CRM remember details like "arrived through IG onboarding", "connected with the welcome message", "has prior Kamadhenu context", or "handle exact account has Guatemala in bio" without forcing those observations into simple identity fields.


# CRM vNext Mantis Evidence Import

Date: 2026-05-10
Status: v0 read-only CLI

## Purpose

Mantis Evidence Import turns a Mantis read-only investigation report into the two artifacts CRM vNext already understands:

- CRM fact text,
- `evidenceSources` packets.

This is the bridge from natural operator work to the guarded card pipeline.

For natural-language Mantis requests such as "probemos otro batch", use
[`mantis-natural-batch-protocol.md`](./mantis-natural-batch-protocol.md) as the
canonical evidence-hunt contract before running this importer.

## CLI

```bash
npm run crm:vnext:mantis-evidence-import -- \
  --report-file ~/Documents/Mantis-Reports/juana_ig_retreat_evidence_hunt_2026-05-10.json \
  --handles @gulnarapaola,@lavivirozo \
  --min-confidence high \
  --out tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --text-out tmp/crm-vnext/juana_ig_retreat_actionable_import.txt
```

The importer accepts both Mantis evidence hunt shapes:

- legacy `results[]` reports keyed by Instagram handle,
- contact-keyed CRM vNext reports with `contacts.{contact_key}` and `strongMatches` / `weakMatches`.
- single-subject email ownership hunts with `subject`, `matches_confirmados`, `candidates_review_only`, `rejected_collisions`, `negative_findings`, and `recomendacion_final`.
- Instagram Messages UI auth-rerun/complement-retry reports, including `recoveredHandle`, `threadDisplayName`, `compactContext`, discarded candidates, and explicit `locationEvidence` such as self-location city/country.

For contact-keyed reports, the importer converts each contact into safe CRM fact text plus connected evidence packets. It preserves review-only family/companion emails as evidence context instead of treating them as primary identity approval.

Contact-keyed reports can also include `evidenceRecords`. The importer preserves those records as connected evidence so useful operator context does not disappear after stitching. This is especially important for Instagram-origin batches where Mantis may find:

- an Instagram Messages UI email-to-handle bridge,
- an IG UI email hit without a recoverable handle,
- a lead-capture/onboarding snapshot,
- compact city/country/context clues,
- rejected or weak candidates that should stay review-only.

The import remains read-only. Preserved context is not card-write approval by itself.

For email ownership hunts, the importer can now preserve a negative conclusion such as `keep_family_email_unassigned`: confirmed phone/identity evidence stays usable, family/shared email candidates remain review-only, rejected family-member emails become collision evidence, and the generated text explicitly says that no primary email is safe to assign. This is useful when Mantis searches Gmail, Drive, Contacts, MailerLite, and local reports and concludes that the clean next action is to ask the person directly.

The generated JSON can be passed as `--evidence-file` to:

- Evidence Approval Workbench,
- Evidence Review Decisions,
- Card Write Approval Packet,
- Stitch Batch Review.

The generated text can be passed as `--text-file`.

## Safety

- No card writes.
- No Fact Store writes.
- No outbound messages.
- No live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram calls.
- No credential reads.
- Local paths from Mantis evidence are not copied into the import packet.

## Operator Pattern

Use this when Mantis has already investigated outside the CRM runtime and produced a selected evidence report.

```text
Mantis evidence hunt JSON
-> Mantis Evidence Import
-> Evidence Approval Workbench
-> Evidence Review Decisions
-> Card Write Approval Packet
-> Card Write Apply
```

This keeps the system flexible: Mantis can search in Gmail, Drive, Contacts, MailerLite exports, local files, or Chrome, but CRM still receives evidence through one standard contract.

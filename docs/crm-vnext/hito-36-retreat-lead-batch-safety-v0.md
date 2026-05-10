# Hito 36: Retreat Lead Batch Safety v0

Date: 2026-05-10

## What Happened

CRM vNext ran the first autonomous read-only batch against Juana's Instagram retreat report:

- source: `/Users/alejandrogomez/.openclaw-lakshmi/workspace/reports/crm-juana/reporte-juana-ig-retiro.md`
- source kind: `instagram_signal`
- reporter: `Juana`
- channel: `telegram_crm`
- command: `npm run crm:vnext:stitch-batch-review -- --text-file /Users/alejandrogomez/.openclaw-lakshmi/workspace/reports/crm-juana/reporte-juana-ig-retiro.md --source-kind instagram_signal --reporter Juana --channel telegram_crm --include-expanded-sources --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl`

The first run exposed two safety bugs before any write path:

- timestamps such as `2026-03-09 06:24` were being considered phone candidates;
- Instagram conversations around a retreat could be promoted as retreat attendance instead of retreat interest.

Both issues are now guarded in the parser and stitching layer.

## Result

The corrected batch is still fully read-only and produced:

- items reviewed: 15
- approval-ready enrich previews: 12
- review-needed items: 3
- operations previewed: 23
- operations executed: 0
- open evidence questions: 0
- card mutation ready: false

The batch now treats IG retreat rows as lead/prospect evidence unless there is explicit attendance or purchase language.

Examples from the corrected output:

- `ig:luzestellariatizabal`: retreat `prospect`, status `interested`, no phone inferred from timestamp, review needed before card creation.
- `ig:nellycruz1411`: existing IG card can be enriched with retreat `prospect`, status `interested`.
- `ig:irelasantos`: existing IG card can be enriched with retreat `prospect`, status `interested`.
- `ig:dmbc01`: existing IG card can be enriched with retreat `prospect`, status `interested`.

## Safety Guard Added

Phone extraction now rejects date-like and timestamp-like numeric strings in:

- Fact Intake
- Deep Local Stitching

Retreat service mapping now distinguishes:

- `retreat_attendance` -> attendee / historical or recurring attendee
- `expressed_interest` + retreat product -> prospect / interested
- retreat purchase language -> buyer or attendee / reported purchase or registration

This keeps the system from overstating community history while still preserving useful sales/community signals.

## Verification

Focused tests:

```bash
npx vitest run __tests__/crm-vnext-fact-intake.spec.ts __tests__/crm-vnext-multi-service-card-proposal.spec.ts __tests__/crm-vnext-deep-local-stitching.spec.ts
npx vitest run __tests__/crm-vnext-stitch-batch-review.spec.ts __tests__/crm-vnext-stitch-batch-review-api.spec.ts __tests__/crm-vnext-card-write-approval-packet.spec.ts
```

Result:

- 6 test files passed
- 33 tests passed

The corrected Juana batch was rerun through Stitch Batch Review and returned no timestamp-derived phones.

## Operator Meaning

Mantis can now use Juana-style Telegram/Instagram retreat reports as a safe source of batch CRM clues:

```text
Juana/IG report -> Stitch Batch Review -> evidence hunt for missing email/phone -> approval packet -> controlled card write
```

The next best autonomous step is not to ask Alejandro about every lead yet. It is to have Mantis gather read-only evidence for the 15 handles across MailerLite, Gmail/Chrome, Google Drive/Sheets, Contacts, and local CSV/XLSX files, then return a smaller review packet with stronger identity candidates.

## Safety

No card store mutation happened.

No Fact Store write happened.

No MailerLite, Instagram, ManyChat, Gmail, Google Drive, WhatsApp, or credential mutation happened.

The only Telegram action in this hito was coordination with Alejandro/Mantis in the CRM group.

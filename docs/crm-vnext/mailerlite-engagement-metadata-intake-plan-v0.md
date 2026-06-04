# MailerLite Engagement Metadata Intake Plan v0

Status: planning complete

Created: 2026-06-04

Scope: CRM Core only, no-write, no-live-execution plan.

This document defines the safest next MailerLite engagement metadata intake
route after source health was confirmed. It does not authorize running live
engagement intake, inspecting raw subscriber rows, writing CRM state, writing
ledgers, changing scoring, mutating MailerLite, or sending outreach.

## 1. Source-Health Baseline

The current baseline is the completed CRM Core MailerLite read-only source
health result recorded in `docs/crm-vnext/crm-core-next-action.md`.

- `source_health_state`: `healthy`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_final_cursor_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_final_cursor_2026-06-03.md`
- Groups probe: succeeded.
- Subscribers probe: succeeded.
- Subscriber cursor scan: succeeded.
- Cursor result: scan exhausted before cap.
- Pages scanned: 14.
- Subscribers scanned: 1373.
- Redaction: credential metadata was absent from terminal output, Markdown
  receipt, and JSON receipt.
- Writes: no MailerLite writes, no CRM writes, no card writes, no ledger writes,
  no Fact Store writes, no scoring writes, and no outbound actions.

This confirms MailerLite connectivity and pagination at the source-health level.
It does not authorize engagement metadata intake or subscriber-level output.

## 2. Candidate Intake Route

Safest existing command:

```sh
npm run crm:vnext:mailerlite-engagement-signals -- --snapshot-file <approved-snapshot-path>
```

Candidate script:

- `scripts/crm-vnext-mailerlite-engagement-signals.mjs`

Core adapter:

- `lib/crm/crm-vnext-mailerlite-engagement-signals.js`

Focused test:

- `__tests__/crm-vnext-mailerlite-engagement-signals.spec.ts`

Route classification:

- `source_access_mode`: supplied local snapshot/export.
- `live_read`: no, for this command route.
- `credential_use`: none expected for the local adapter route.
- `mutation_behavior`: no MailerLite mutation and no CRM state mutation.
- `input_requirement`: approved or supplied MailerLite engagement snapshot/export
  metadata file.
- `raw_output_risk`: present if the command is run normally, because adapter
  output can include signal arrays, skipped-record details, identity anchors,
  group/tag/segment context, and campaign activity context.
- `receipt_safety`: acceptable only if future execution keeps chat output to
  aggregate counts and writes redacted receipts that exclude raw rows and bulk
  subscriber-level detail.

The current safest route is therefore not a live MailerLite read. It is a
local, no-write adapter route using a supplied or explicitly approved
snapshot/export artifact, with a redacted receipt boundary around the adapter's
normal output.

## 3. Safe Fields

The following field families are safe to evaluate for availability, freshness,
and aggregate counts when the execution boundary is explicitly approved:

- Opens.
- Repeated opens.
- Clicks.
- Repeated clicks.
- Subscriber status.
- Suppression.
- Bounce.
- Complaint.
- Campaign context.
- Identity anchors.

Identity anchors may include email, person id, Instagram handle, phone, and
other locally recognized identity fields. They are allowed as matching inputs
for local processing, but they must not be printed in bulk or treated as
permission to contact.

## 4. Sensitive Fields And Forbidden Outputs

The intake plan forbids printing or emitting these surfaces in chat or standard
receipts:

- Raw subscriber rows.
- Subscriber lists.
- Private emails in bulk.
- Private URLs.
- Campaign bodies.
- Raw payloads.
- Tokens.
- Headers.
- Environment values.
- Secrets.
- Credential metadata.
- Private message or reply content.

Future execution must not expose raw response objects, raw snapshot rows, full
subscriber records, campaign bodies, tracking URLs, unsubscribe URLs, or private
content. If any command path cannot preserve this boundary, the run must stop.

## 5. Redaction Requirements

Chat output may include aggregate counts only:

- Number of records inspected.
- Number of records with usable identity anchors.
- Number of records skipped for missing identity.
- Field availability by field family.
- Freshness windows or latest timestamp ranges.
- Aggregate counts by engagement family.
- Aggregate counts by suppression/bounce/complaint family.
- Whether the output can feed local dry-run adapters.
- Blocker classes.

Receipt paths should live under:

- `/Users/alejandrogomez/Documents/Mantis-Reports`

Future execution receipts should use names like:

- `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_metadata_intake_2026-06-04.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_metadata_intake_2026-06-04.md`

The Markdown and JSON receipts should contain field availability, freshness,
aggregate counts, route, blocker classes, and safety flags only. They must not
include raw rows, subscriber lists, bulk private emails, private URLs, campaign
bodies, raw payloads, credentials, tokens, headers, environment values, or
secrets unless Alejandro explicitly approves a different artifact boundary
later.

## 6. Dry-Run Adapter Path

The future no-write path should be:

1. Confirm the source artifact is explicitly supplied or approved for this
   execution boundary.
2. Confirm the artifact can be processed without printing raw rows.
3. Run a local metadata availability and freshness pass that produces redacted
   aggregate receipts.
4. If approved, run the local MailerLite engagement signal adapter against the
   supplied snapshot/export artifact.
5. Treat adapter output as local dry-run material only.
6. Summarize only aggregate signal counts and blocker classes in chat.

The dry-run adapter path must not write:

- Signal Event Ledger.
- Engagement Snapshot Ledger.
- Person cards.
- Fact Store.
- Scoring.
- CRM writes of any kind.

Any later use of the adapter output for `crm:vnext:engagement-signal-preview`
or `crm:vnext:signal-event-pipeline` must stay dry-run unless Alejandro
explicitly approves a separate write boundary.

## 7. Interpretation Rules

- Single opens are weak evidence.
- Repeated opens are pattern evidence, not intent by themselves.
- Clicks are stronger topic or product interest signals than opens.
- Repeated clicks are stronger than one-off clicks.
- Suppression, bounce, complaint, and unsubscribe indicators outrank warmth.
- Email engagement is not permission to contact.
- Campaign context can describe topic resonance, but campaign bodies and private
  URLs must stay out of receipts.
- Identity confidence controls downstream use. Ambiguous or missing identity
  must remain review-only or skipped.

## 8. Proposed First Execution Shape

Lowest useful scope:

- Use a supplied or explicitly approved local MailerLite engagement
  snapshot/export metadata artifact.
- Do not call the MailerLite API.
- Do not open MailerLite UI.
- Do not inspect credentials.
- Do not print raw rows.
- Produce redacted aggregate receipts only.

Recommended caps:

- Limit chat output to aggregate counts and blocker classes.
- Limit receipt output to aggregate field availability, freshness, and safety
  flags.
- Treat any subscriber-level signal array as local-only dry-run output that must
  not be pasted into chat or broad reports.
- Stop rather than broadening scope if the artifact is missing, stale, malformed,
  or requires raw row inspection.

Future receipt names:

- `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_metadata_intake_2026-06-04.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_metadata_intake_2026-06-04.md`

Validation commands for the planning boundary:

```sh
git diff --check
node --check scripts/crm-vnext-mailerlite-engagement-signals.mjs
npx vitest run __tests__/crm-vnext-mailerlite-engagement-signals.spec.ts
```

Stop conditions:

- The run would require a live MailerLite API call.
- The run would require MailerLite UI.
- The run would require Gmail, Instagram, Shopify, or Launch OS context.
- The run would require reading, printing, refreshing, rotating, modifying,
  exporting, or exposing credentials.
- The run would print raw rows, subscriber lists, private emails in bulk,
  private URLs, campaign bodies, raw payloads, tokens, headers, environment
  values, secrets, or private content.
- The run would write cards, ledgers, Fact Store, Signal Event Ledger,
  Engagement Snapshot Ledger, scoring, CRM state, MailerLite, or outbound
  channels.
- The source artifact is absent, ambiguous, stale, or not explicitly approved.

## 9. Still Forbidden After A Green Result

Even after a green no-write engagement metadata intake result, CRM Core still
may not:

- Write Signal Event Ledger.
- Write Engagement Snapshot Ledger.
- Write person cards.
- Write Fact Store.
- Write scoring.
- Mutate MailerLite.
- Mutate subscribers, groups, tags, segments, workflows, campaigns, sends, or
  audiences.
- Send outreach.
- Treat email engagement as permission to contact.
- Advance Launch OS functionality.

The next safest step is an approval packet for the first no-write execution
boundary. That packet should name the exact input route, redaction guarantees,
receipt paths, validation commands, stop conditions, and approval phrase before
any engagement metadata intake is run.

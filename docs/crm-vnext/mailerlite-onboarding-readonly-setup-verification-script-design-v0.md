# MailerLite Onboarding Read-Only Setup Verification Script Design v0

Date: 2026-07-06
Status: designed and fixture-tested only; live MailerLite setup verification not run

## Purpose

Create a redaction-safe setup verification route for the MailerLite onboarding
lane so CRM Core can later verify setup/config metadata needed for the
controlled welcome flow without leaking sensitive identifiers or private
subscriber data.

The route is safe-by-default, fixture-first, and no-write. This design does not
authorize live MailerLite reads or any MailerLite mutation.

## Why The Existing Route Was Blocked

The prior controlled no-write payload preview proved the private handoff to a
MailerLite payload shape, but it left setup facts unresolved:

- group mapping required setup inventory;
- automation mapping required setup inventory;
- most custom field mappings required setup inventory;
- trigger and retrigger behavior were not verified;
- suppression and idempotency were not verified by a MailerLite read.

Existing read routes were not specific enough for onboarding setup verification
because they either checked broader source health, handled private engagement
artifacts, or risked returning raw subscriber/source details. A dedicated guard
is needed before any live setup/config check.

## Scope In This Task

This task implements only:

- fixture/mock behavior;
- redacted JSON and Markdown receipt generation;
- live-mode blocking unless a future explicit approval flag is supplied;
- output-path safety checks;
- redaction tests for IDs, emails, tokens, raw payload markers, and private
  values;
- documentation and command inventory updates.

This task does not call MailerLite APIs, use MailerLite UI, read credentials,
read subscriber rows, inspect private artifacts, write Mantis-Reports, write
private source artifacts, mutate MailerLite, or write CRM/source state.

## Command

```bash
npm run crm:vnext:mailerlite-setup-readonly-verification -- \
  --fixture-file <synthetic-fixture-path> \
  --redacted-receipt-json <outside-repo-json-path> \
  --redacted-receipt-md <outside-repo-md-path>
```

The npm script resolves to:

```bash
node scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs
```

## Future Live-Read Approval Boundary

Future live read-only setup verification is blocked unless Alejandro gives this
exact approval phrase:

```text
I approve one CRM Core MailerLite read-only setup verification run using the redaction-safe setup verification command only. Use existing internal credentials without printing or inspecting them. Query only setup/config metadata needed for onboarding readiness. Do not read subscriber rows, do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings, do not print raw emails, IDs, tokens, headers, env values, credentials, raw payloads, or private subscriber content, write private setup refs only to the approved private artifact path, and write only redacted aggregate receipts.
```

Future live mode must require:

- `--allow-live-readonly-setup-verification`;
- a private artifact path under
  `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`;
- redacted JSON and Markdown receipt paths;
- no source mutation and no CRM/source writes.

## Forbidden Outputs

The command must never print to stdout/stderr or write to redacted receipts:

- raw emails;
- raw subscriber rows;
- subscriber IDs;
- group IDs;
- automation IDs;
- field IDs if exposed by API;
- API keys;
- tokens;
- cookies;
- headers;
- env values;
- credential source, length, or fingerprint;
- raw API payloads;
- private subscriber content;
- private artifact contents;
- raw names;
- raw phones;
- raw city/country tied to identity;
- DM/message text;
- screenshots.

Allowed receipt content is limited to aggregate counts, non-secret labels,
status values, presence/absence, match/unmatched counts, mapping status counts,
blocker classes, mutation readiness, closed gates, and output path labels.

## Redaction Model

The fixture route builds a compact setup-readiness report from synthetic setup
metadata and emits only:

- counts of observed setup objects;
- expected non-secret labels;
- mapping statuses;
- blocker classes;
- closed gates;
- next safe step.

IDs and raw fixture payloads are intentionally omitted from the report. Tests
seed fake IDs and fake email strings and assert they never appear in stdout,
JSON receipts, or Markdown receipts.

## Private Artifact Model

No real private artifact is created in this task.

Future live mode may need private setup references for later no-write mutation
review. If so, raw setup IDs must be written only to a private artifact under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/
```

Those private refs must never be committed, pasted into chat, written to
Mantis-Reports, or stored in tracked docs.

## Redacted Receipt Model

Redacted receipts may be written to approved source/operator receipt locations,
including `/Users/alejandrogomez/Documents/Mantis-Reports/` only after a future
approved live run. Tests use `/tmp` only and do not write real Mantis-Reports or
private source artifacts.

Receipt fields include:

- source family;
- command;
- source counts;
- requested non-secret labels;
- group mapping status;
- automation mapping status;
- field mapping status counts;
- trigger behavior status;
- retrigger behavior status;
- suppression status;
- mutation readiness;
- blocker classes;
- closed gates;
- next safe step.

## Field, Group, And Automation Mapping Model

The command classifies:

- `group_mapping_status`:
  `confirmed_current_existing_label`, `historical_prefill_only`,
  `missing_or_not_found`, `ambiguous`, `not_verified`.
- `automation_mapping_status`:
  `confirmed_current_existing_label`, `historical_prefill_only`,
  `missing_or_not_found`, `ambiguous`, `not_verified`.
- `field_mapping_status_counts`:
  `confirmed_existing_field`, `historical_prefill_only`,
  `requires_setup_inventory`, `missing_or_not_found`, `ambiguous`,
  `not_verified`.

Confirmed mapping means a non-secret expected label matched exactly one current
setup object in the fixture. It does not imply any subscriber mutation.

## Trigger And Retrigger Uncertainty Model

Trigger behavior is reported as:

- `confirmed_group_trigger`;
- `unknown_requires_behavior_check`;
- `not_verified`;
- `blocked`.

Retrigger behavior is reported as:

- `confirmed`;
- `unknown_blocks_mutation`;
- `not_verified`;
- `blocked`.

Unknown retrigger behavior blocks mutation because adding a person to a group
could fail to start onboarding, duplicate onboarding, or behave differently than
expected. This task only proves the classifier, not live behavior.

## Suppression And Idempotency Limitation

Suppression is reported as:

- `aggregate_verified_no_private_rows`;
- `not_verified_no_subscriber_read`;
- `unknown_blocks_mutation`;
- `blocked`.

The fixture route does not read subscribers. Therefore suppression and
idempotency stay blocked unless a synthetic aggregate-only fixture explicitly
proves the safe aggregate condition. Future live verification must avoid
subscriber rows unless separately approved.

## Why Mutation Remains Blocked

Mutation remains blocked until live read-only setup verification proves the
needed setup facts without leaking private content:

- the target group exists and is unambiguous;
- the target automation exists and is unambiguous;
- custom fields exist or are explicitly handled;
- trigger behavior is confirmed;
- retrigger behavior is confirmed;
- suppression and idempotency are safe at an aggregate/no-private-row level;
- all private refs, if needed, remain outside the repo.

## Test Coverage Summary

The fixture test suite covers:

- successful fixture mode with redacted JSON and Markdown receipts;
- stdout/stderr redaction;
- JSON receipt redaction;
- Markdown receipt redaction;
- field mapping status counts;
- group mapping status;
- automation mapping status;
- trigger behavior remaining unknown unless confirmed;
- retrigger behavior blocking mutation when unknown;
- suppression remaining not verified unless aggregate-only evidence exists;
- mutation readiness remaining blocked unless safe facts are confirmed;
- live mode blocking without explicit approval flag;
- repo output path rejection;
- Mantis-Reports redacted receipt path allowance without writing there;
- future live private artifact root enforcement;
- `/tmp`-only fixture writes;
- package JSON validity.

## Stop Conditions

Stop before any live run if:

- the exact live-read approval phrase is absent;
- output paths are inside the repo;
- private artifact path is outside the approved MailerLite private artifact root;
- any command would print or retain IDs, emails, raw payloads, tokens, headers,
  env values, credentials, private subscriber content, or private artifact
  contents;
- any route would read subscriber rows;
- any route might mutate MailerLite or CRM/source state.

## Closed Gates

- MailerLite API not called.
- MailerLite UI not used.
- Credentials not inspected or printed.
- Subscriber rows not read or printed.
- Private artifacts not read or written.
- Mantis-Reports not written by tests.
- CRM/source state not written.
- MailerLite subscribers, groups, fields, automations, campaigns, segments,
  forms, webhooks, and account settings not mutated.
- Gmail, Instagram, Meta Business Suite, DMs, welcome audio, candidate queues,
  Launch OS, Mantis memory, and `/Users/alejandrogomez/CRM` not used.

## Recommended Next Step

Central integration of this script/design, then a separate Alejandro approval
for one live read-only MailerLite setup verification run using the redaction-safe
command.

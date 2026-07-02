# MailerLite Onboarding Setup Inventory Packet v0

Date: 2026-06-29
Status: lane-local no-run design

## Purpose

Define the exact no-secret MailerLite onboarding setup inventory packet
Alejandro can answer before any no-write payload preparation or MailerLite API
mutation.

This document does not authorize MailerLite API calls, MailerLite UI access,
subscriber mutation, group assignment, field creation, automation mutation,
campaign send, Gmail access, Instagram access, Meta Business Suite access, DMs,
welcome audio, candidate queue generation, CRM/source writes, private artifact
inspection, Launch OS work, or use of `/Users/alejandrogomez/CRM`.

## Current Lane Status

- `workstream_id`: `mailerlite-onboarding`
- `branch`: `codex/crm-core-mailerlite-onboarding`
- `worktree`: `/Users/alejandrogomez/CRM-core-mailerlite`
- `current_seed`: `crm_core_mailerlite_onboarding_setup_inventory_awaiting_approval_v0`
- `execution_status`: no execution has occurred.
- `api_called`: false
- `mailerlite_ui_used`: false
- `private_artifacts_inspected`: false
- `crm_or_source_write_performed`: false

## Setup Inventory Packet

The setup inventory packet must be answered only with non-secret facts:

- `yes`;
- `no`;
- `unknown`;
- redacted/non-secret labels.

The packet must not include API keys, tokens, subscriber IDs, sensitive group
IDs, sensitive automation IDs, dashboard screenshots, credentials, headers,
cookies, env values, authorization codes, secrets, emails, names, phone
numbers, private subscriber content, or private artifact contents.

## Fact Categories

### Confirmed Facts

Confirmed facts are values Alejandro explicitly provides or facts already
present in approved CRM Core docs.

Each confirmed fact should record:

- `fact_id`;
- `fact_family`;
- `value`: `yes`, `no`, `unknown`, or non-secret label;
- `source`: `alejandro_supplied` or `approved_crm_core_doc`;
- `blocks_payload_preparation`: true/false;
- `blocks_mutation`: true/false.

### Assumptions

Assumptions are planning placeholders only. They never authorize MailerLite
mutation.

Each assumption should record:

- `assumption_label`;
- `reason`;
- `risk_if_wrong`;
- `decision_needed`;
- `blocks_mutation`: true/false.

Default assumptions:

- onboarding likely uses a group-triggered automation;
- group membership may or may not retrigger automation;
- existing subscribers require non-destructive handling;
- suppression/status safety outranks onboarding intent;
- fields can be mapped only if they already exist or are separately approved
  for creation.

### Open Decisions

Each open decision should record:

- `decision_id`;
- `decision_question`;
- `current_state`: `open`;
- `allowed_answers`: `yes`, `no`, `unknown`, or non-secret label;
- `blocking_level`: `blocks_mutation`, `blocks_payload`, or `advisory`;
- `future_approval_needed`.

### Future Approval Gates

The setup inventory packet grants no future action by itself.

Separate future gates:

1. No-secret setup inventory collection.
2. No-write payload packet preparation.
3. Optional no-write API healthcheck, if separately approved.
4. Packet-specific MailerLite mutation approval.
5. Any CRM write packet approval, outside this lane.

No gate can be inferred from another gate.

## Setup Inventory Checklist

### Group / Automation Setup

Ask:

- Does an existing onboarding group exist?
- What is the redacted group label?
- Should group ID be treated as sensitive and excluded from chat/receipts?
- Does adding a subscriber to the group trigger automation?
- Is the automation active?
- What is the redacted automation label?
- Should automation ID be treated as sensitive and excluded from chat/receipts?
- Does re-adding an existing subscriber retrigger automation?
- Are suppression rules known?
- Which subscriber statuses block onboarding?

Allowed answers:

- `yes`;
- `no`;
- `unknown`;
- non-secret group label;
- non-secret automation label;
- redacted status category.

### Field Mapping

For each field below, ask whether the field already exists using `yes`, `no`,
or `unknown`:

- `email`
- `name`
- `last_name`
- `country`
- `city`
- `phone`
- Instagram handle or Instagram private label field
- `source_channel`
- `source_context`
- `onboarding_started_at`
- CRM Core private anchor label field
- `consent_or_context`
- `language`
- `timezone`
- tags or custom fields that should be used instead

For each field, record:

- `field_label`;
- `exists`: `yes`, `no`, or `unknown`;
- `required_for_payload`: true/false;
- `safe_for_mailerlite`: `yes`, `no`, or `unknown`;
- `creation_approval_required`: true/false;
- `mapping_status`:
  - `confirmed_existing_field`;
  - `mapping_pending`;
  - `requires_setup_inventory`;
  - `requires_explicit_field_creation_approval`;
  - `blocked_sensitive_content`.

Rules:

- Do not create fields.
- Do not verify fields through API or UI.
- Do not store private anchors as raw exposed values unless separately approved.
- Do not store DM content or raw message bodies in MailerLite fields.

### Onboarding Policy

Ask whether CRM Core should block onboarding if:

- email evidence source is ambiguous;
- consent/context is unclear;
- identity confidence is not confirmed or likely;
- person is already in onboarding group;
- group-trigger behavior is unknown.

Ask whether CRM Core should ever onboard from:

- story views alone;
- Instagram follow alone;
- email engagement alone.

Recommended default:

- block ambiguous email evidence;
- block unclear consent/context;
- block identity confidence below likely;
- block already-in-group if retrigger behavior is unknown;
- block unknown group-trigger behavior;
- do not onboard from story views alone;
- do not onboard from Instagram follow alone;
- do not onboard from email engagement alone.

### Future Operation Preference

Ask preferred future operation:

- `subscriber_upsert`
- `subscriber_add_to_group`
- `subscriber_upsert_then_add_to_group`
- `unknown`

Ask whether future mutation approval should require:

- final idempotency check immediately before execution;
- redacted packet preview first;
- one-packet-only approval, not standing authorization.

Recommended default:

- final idempotency check required;
- redacted packet preview required;
- one-packet-only approval required.

## Receipt Model

Redacted inventory receipts may include:

- `inventoryStatus`
- `groupLabelStatus`
- `automationLabelStatus`
- `groupTriggerStatus`
- `automationActiveStatus`
- `fieldMappingStatusCounts`
- `suppressionRulesStatus`
- `blockingStatuses`
- `preferredFutureOperation`
- `idempotencyRequired`
- `packetPreviewRequired`
- `onePacketOnlyApprovalRequired`
- `blockers`
- `recommendedNextStep`

Receipts must not include:

- API keys;
- tokens;
- subscriber IDs;
- group IDs if sensitive;
- automation IDs if sensitive;
- dashboard screenshots;
- credentials;
- headers;
- cookies;
- env values;
- authorization codes;
- secrets;
- emails;
- names;
- phone numbers;
- private subscriber content;
- private artifact contents.

Suggested inventory status values:

- `not_collected`;
- `partial_blocked`;
- `partial_ready_for_questions`;
- `complete_for_no_write_payload`;
- `complete_for_mutation_review`.

## Decision Rules

If group, automation, and field mapping are sufficiently known, recommend:

```text
crm_core_mailerlite_onboarding_no_write_payload_packet_awaiting_approval_v0
```

If group, automation, or field mapping is too unknown, recommend:

```text
crm_core_mailerlite_onboarding_setup_decision_packet_v0
```

If MailerLite setup appears missing, recommend:

```text
crm_core_mailerlite_onboarding_setup_decision_packet_v0
```

Decision output categories:

- `blocked_missing_inventory`;
- `blocked_unknown_group_or_automation`;
- `blocked_field_mapping`;
- `blocked_suppression_policy`;
- `ready_for_no_write_payload_only`;
- `ready_for_setup_decision_packet`;
- `not_allowed`.

## Idempotency Expectations

- Never prepare an onboarding payload without a future approved email evidence
  packet.
- Never onboard the same private email evidence twice.
- Never add to onboarding group twice if group membership already exists and
  retrigger behavior is unknown.
- If subscriber status is unsubscribed, bounced, complained, junk, or unknown,
  block unless separately approved.
- If idempotency status is unknown, block.
- Inventory packets should be versioned and superseded, not overwritten.
- If any secret or private subscriber value appears in an inventory draft, stop,
  redact, and treat the draft as invalid.

## Future Approval Language

### Setup Inventory Collection

Required approval phrase:

```text
I approve CRM Core to collect a no-secret MailerLite onboarding setup inventory. I will provide only non-secret group labels, field labels, automation labels, and yes/no/unknown setup facts; do not ask for or record API keys, tokens, subscriber IDs, group IDs I consider sensitive, private dashboard screenshots, credentials, headers, cookies, env values, authorization codes, secrets, or private subscriber content.
```

### No-Write Payload Packet

Required approval phrase:

```text
I approve CRM Core to prepare a no-write MailerLite onboarding payload from approved private email-handoff evidence. Do not call the MailerLite API, do not mutate subscribers or groups, do not print emails or private identities, and write only redacted aggregate receipts.
```

### MailerLite Mutation

Required approval phrase:

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved field mapping and onboarding group, perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not print private identities, and write only redacted aggregate receipts.
```

Mutation approval is packet-specific. It does not authorize broad imports,
automation edits, campaign sends, CRM writes, or future repeated mutations.

## Closed Gates

- no MailerLite API calls;
- no MailerLite UI;
- no subscriber mutation;
- no group assignment;
- no field creation;
- no automation mutation;
- no campaign send;
- no Gmail;
- no Instagram;
- no Meta Business Suite;
- no UI, Computer Use, or `@Chrome`;
- no DMs;
- no welcome audio;
- no candidate queue;
- no CRM writes;
- no source mutation;
- no private artifact inspection;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

The MailerLite onboarding lane now has a dedicated no-secret setup inventory
packet design. No central file change is required to accept this lane-local
artifact. Integration may later record that setup inventory collection remains
unexecuted and requires the exact setup inventory approval phrase.

## Next Safe Step

Ask Alejandro for the exact no-secret setup inventory collection approval
phrase. If approved, collect only non-secret group labels, field labels,
automation labels, and yes/no/unknown setup facts. If approval is not given,
keep the lane parked at no-run design.

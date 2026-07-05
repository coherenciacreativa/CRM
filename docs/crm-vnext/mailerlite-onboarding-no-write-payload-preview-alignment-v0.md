# MailerLite Onboarding No-Write Payload Preview Alignment v0

Date: 2026-07-05
Status: lane-local no-run design

Task id: `crm_core_mailerlite_no_write_payload_preview_alignment_v0`

## Purpose

Define the future no-write MailerLite onboarding payload preview boundary for
the Controlled Welcome Flow Proof.

This artifact connects approved private email handoff evidence to a safe
MailerLite preview schema without calling MailerLite, opening MailerLite UI,
preparing a real private payload, mutating subscribers, assigning groups,
creating fields, editing automations, sending campaigns, writing CRM/source
state, generating candidate queues, opening DMs, using Gmail, using Instagram,
or collecting facts from Alejandro.

## Relationship To Controlled Welcome Flow Proof Plan

This design is Track D support for MailerLite no-write onboarding preview.

The proof sequence remains:

```text
controlled new-follower evidence
-> controlled candidate queue and sandbox send approval
-> controlled welcome audio send, if separately approved later
-> reply monitoring and email handoff, if separately approved later
-> MailerLite no-write payload preview, if separately approved later
-> MailerLite mutation, only if separately approved later
-> CRM enrichment preview/write packet, separately
```

This artifact does not mark MailerLite onboarding execution, MailerLite
mutation, CRM enrichment, or CRM writes complete.

## Relationship To Reply Monitoring And Email Handoff Boundary

The reply monitoring and email handoff boundary defines a future private
evidence step that may classify whether email/name/city/country/phone evidence
exists.

This MailerLite preview may start only after a separate approved private email
handoff evidence packet exists. A reply, DM, welcome send, candidate queue,
Instagram follow, story view, or email engagement record is not enough by
itself.

Future approved handoff evidence may provide availability and confidence for:

```yaml
email_candidate_present: true | false | unknown
name_candidate_present: true | false | unknown
city_candidate_present: true | false | unknown
country_candidate_present: true | false | unknown
phone_candidate_present: true | false | unknown
confidence: high | medium | low | ambiguous
human_review_required: true | false
```

The preview must not print actual values in chat, tracked docs, or redacted
receipts.

## Relationship To Setup Inventory And Answer Intake

This design depends on the MailerLite onboarding setup inventory packet,
questionnaire, and answer-intake packet.

Known lane posture:

- active onboarding v1 stays live and untouched;
- v2 should be designed, drafted, seed-tested, and separately approved before
  use;
- local history has prefilled several setup assumptions;
- setup inventory collection is still unexecuted;
- read-only API setup verification is still unexecuted and requires exact
  future approval;
- MailerLite mutation remains unapproved.

If group, automation, field, suppression, or idempotency facts are unknown, the
future preview may produce blockers but must not proceed toward mutation.

## No-Run Status

This artifact is design-only.

It does not:

- inspect private email handoff evidence;
- prepare a real private payload;
- call MailerLite APIs;
- open MailerLite UI;
- use Gmail;
- use Instagram;
- use Meta Business Suite;
- open DMs;
- send welcome audio;
- generate candidate queues;
- mutate MailerLite;
- write CRM/source state;
- create source/operator receipts;
- collect facts from Alejandro.

## No-Write Payload Preview Boundary

A future no-write payload preview is a private local dry-run representation of
what CRM Core would send to MailerLite if a later packet-specific mutation were
approved.

The preview may classify:

- whether approved private evidence is sufficient;
- which MailerLite fields would be mapped;
- which group/automation assumptions are known;
- whether idempotency blocks the operation;
- whether suppression/status blocks the operation;
- whether existing subscriber handling is known;
- whether final mutation is blocked, eligible for a later approval packet, or
  not allowed.

The preview must not:

- call MailerLite;
- verify subscriber state live unless separately approved;
- assign groups;
- create or update fields;
- enroll automations;
- send campaigns;
- print private values;
- become an import file;
- become an API payload for real execution;
- authorize any CRM enrichment or source write.

## Input Evidence Requirements

Future no-write payload preview requires an explicitly approved private
evidence packet that includes, at minimum:

- approved evidence packet id;
- evidence source class;
- private email evidence anchor;
- private person/source anchor if available;
- evidence observed date or approved evidence timestamp;
- consent/context label;
- identity confidence category;
- suppression/safety status;
- human review status;
- approved redacted receipt label.

Blocking conditions:

- missing email evidence;
- email candidate absent or unknown;
- ambiguous identity;
- human review required and unresolved;
- consent/context unclear;
- suppression/safety blocked;
- evidence packet not explicitly approved for MailerLite preview;
- private values would need to be printed in chat.

## Email Handoff Evidence Requirements

For the future MailerLite preview, email handoff evidence must be private and
approved. The preview may use private values internally only if the exact future
approval allows it, but it must display and receipt only redacted counts,
statuses, labels, and blockers.

Allowed future internal evidence classes:

- `approved_private_email_handoff`;
- `approved_manual_email_evidence`;
- `approved_reply_handoff_evidence`;
- `approved_gmail_or_email_handoff`, if a later Gmail/email lane is approved.

Disallowed evidence classes:

- story views alone;
- Instagram follow alone;
- email engagement alone;
- unapproved DM content;
- unapproved Gmail content;
- raw subscriber rows;
- CRM lead records without a separate CRM approval boundary.

## Payload Preview Schema

Future private preview artifacts may use this schema. This task does not create
such an artifact.

```yaml
previewPacketId: string
previewStatus: ready_for_review | blocked | not_allowed
sourceEvidence:
  evidencePacketId: string
  evidenceClass: approved_private_email_handoff | approved_manual_email_evidence | approved_reply_handoff_evidence | approved_gmail_or_email_handoff
  privateEmailAnchorPresent: true | false
  privateIdentityAnchorPresent: true | false | unknown
  consentOrContextStatus: confirmed | unclear | blocked | unknown
  identityConfidence: high | medium | low | ambiguous | unknown
  humanReviewStatus: cleared | required | unresolved
mailerliteOperation:
  operationClass: subscriber_upsert | subscriber_add_to_group | subscriber_upsert_then_add_to_group | receipt_only | blocked
  operationMode: no_write_preview_only
fieldMapping:
  mappedFieldCount: number
  missingRequiredFieldCount: number
  mappingPendingCount: number
  blockedSensitiveFieldCount: number
  fieldStatuses:
    - fieldKey: email | name | last_name | country | city | phone | source_channel | source_context | onboarding_started_at | consent_or_context | language | timezone | private_anchor_label | other
      mappingStatus: confirmed_existing_field | mapping_pending | requires_setup_inventory | requires_explicit_field_creation_approval | blocked_sensitive_content
groupAutomationMapping:
  onboardingGroupStatus: confirmed_label | pending_inventory | missing | blocked
  automationTriggerStatus: confirmed | unknown | not_triggered | blocked
  readdRetriggerStatus: confirmed_safe | unknown | blocked
idempotency:
  idempotencyStatus: new_private_email_evidence | already_prepared_no_write_packet | already_onboarded | subscriber_exists_group_unknown | subscriber_exists_group_present | blocked_status_or_suppression | blocked_idempotency_unknown
suppression:
  suppressionStatus: clear | unsubscribed | bounced | complained | junk | suppressed | unknown | blocked
existingSubscriberHandling:
  subscriberStateStatus: new_or_unknown | known_existing_non_destructive | known_existing_blocked | unknown_blocked
blockers:
  - blockerCode: string
closedGates:
  mailerliteApiCalled: false
  mailerliteUiUsed: false
  mailerliteMutationPerformed: false
  crmWritePerformed: false
nextSafeStep: string
```

## Redacted Payload Display Rules

Redacted previews and receipts may include:

- preview packet id;
- evidence class;
- counts by mapping status;
- group/automation mapping status;
- idempotency status;
- suppression/status class;
- existing subscriber handling status;
- blocker counts;
- closed gates;
- next safe step.

They must not include:

- emails;
- names;
- phone numbers;
- city/country tied to identity;
- Instagram handles tied to real people;
- private anchors;
- subscriber IDs;
- group IDs if sensitive;
- automation IDs if sensitive;
- raw payloads;
- API keys;
- tokens;
- headers;
- cookies;
- env values;
- authorization codes;
- credentials;
- message bodies;
- DM content;
- private artifact contents;
- raw dashboard screenshots.

## Field Mapping Model

Default field mapping candidates:

- `email`;
- `name`;
- `last_name`;
- `country`;
- `city`;
- `phone`;
- Instagram private label field;
- `source_channel`;
- `source_context`;
- `onboarding_started_at`;
- CRM Core private anchor label field;
- `consent_or_context`;
- `language`;
- `timezone`;
- approved tags/custom fields if existing.

Field rules:

- `email` is required for any future MailerLite onboarding preview.
- Private anchor fields must use labels/digests only if approved.
- Raw DM content and message bodies are never field values.
- Missing required fields block real payload preparation.
- Missing optional fields may downgrade completeness but must not invent values.
- Field creation requires a separate future approval packet.

## Group And Automation Mapping Model

Future preview should distinguish:

- current protected v1 onboarding path;
- future v2 onboarding path;
- approved onboarding group label;
- source assignment group label;
- whether group membership triggers automation;
- whether automation is active;
- whether re-adding an existing subscriber retriggers automation;
- whether suppression/status rules are known.

Rules:

- active v1 remains untouched;
- do not route new architecture assumptions through the protected live v1 group;
- do not assign any group in a no-write preview;
- do not create groups;
- do not create automations;
- do not edit automations;
- unknown trigger/retrigger behavior blocks mutation;
- missing setup inventory blocks mutation and may block a complete preview.

## Idempotency Checks

Future no-write preview should compute or classify, without printing private
values:

- private email anchor presence;
- private identity anchor presence;
- approved evidence packet id;
- prior preview packet status;
- already-onboarded status, if known;
- existing subscriber/group status, if known;
- operation idempotency status.

If the already-onboarded state, subscriber status, or group membership is
unknown, the preview must classify mutation as blocked until a separately
approved verification or manual decision resolves it.

## Suppression And Status Checks

Suppression/status outranks onboarding intent.

Future preview must block mutation when status is:

- `unsubscribed`;
- `bounced`;
- `complained`;
- `junk`;
- `suppressed`;
- `unknown`, unless a later packet explicitly approves a safe review route.

The preview must not override suppression, revive a suppressed subscriber, or
change subscriber status.

## Existing Subscriber Handling

Existing subscriber handling must be non-destructive by default.

Rules:

- Prefer non-destructive upsert semantics only if later mutation is approved.
- Do not use update semantics that may remove groups or fields unless a later
  packet explicitly approves that exact operation.
- If subscriber exists and group membership is unknown, block.
- If subscriber exists and group membership is present but retrigger behavior is
  unknown, block.
- If subscriber exists with blocked status, block.

## Unknown Setup Blockers

Setup blockers include:

- onboarding group label unknown;
- v2 group label missing or unconfirmed;
- automation label unknown;
- automation active status unknown;
- group trigger behavior unknown;
- re-add/retrigger behavior unknown;
- required fields missing or unknown;
- suppression/status rules unknown;
- private ID policy unknown;
- current setup drift unknown.

The preview may report these blockers as aggregate counts/statuses. It must not
open MailerLite or call the API to resolve them unless a separate exact
approval exists.

## No-Write Receipt Model

Future no-write payload preview receipts must be redacted and outside the repo.

Receipt path must be the approved operator/source receipt path named in the
future approval. Consultant relay development telemetry, when applicable, must
use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Receipts may include:

- `previewStatus`;
- `evidenceClass`;
- `evidencePacketIdLabel`;
- `privateEmailAnchorPresent`;
- `fieldMappingStatusCounts`;
- `groupAutomationMappingStatus`;
- `idempotencyStatus`;
- `suppressionStatus`;
- `existingSubscriberHandlingStatus`;
- `blockerCounts`;
- `mailerliteApiCalled: false`;
- `mailerliteUiUsed: false`;
- `mailerliteMutationPerformed: false`;
- `crmWritePerformed: false`;
- `nextSafeStep`.

Receipts must not include private values, raw payloads, secrets, IDs considered
sensitive, or private artifact contents.

## Future Exact Approval Phrase Templates

This current design grants none of the approvals below.

### No-Write Payload Preview From Approved Private Evidence

```text
I approve CRM Core to prepare one MailerLite no-write onboarding payload preview from the explicitly approved controlled private evidence packet only. Do not call MailerLite APIs, do not use MailerLite UI, do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings, do not print private identities, and do not write CRM/source state.
```

### Optional Read-Only Setup Verification

```text
I approve CRM Core MailerLite onboarding lane to run one read-only no-secret MailerLite setup verification using existing internal credentials only. Do not print, inspect, rotate, or expose credentials; do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings; do not print subscriber rows, emails, names, subscriber IDs, group IDs, automation IDs, headers, tokens, cookies, env values, private subscriber content, or raw payloads. Return only aggregate/redacted setup facts for onboarding groups, automations, fields, segments, forms, blockers, and next safe step.
```

### Final MailerLite Mutation

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved field mapping and onboarding group, perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not print private identities, and write only redacted aggregate receipts.
```

### CRM Enrichment Preview

```text
I approve CRM Core to prepare one no-write CRM card enrichment packet preview from the explicitly approved controlled welcome-flow evidence only. Do not write cards, ledgers, Fact Store, scoring, source-result ledgers, or CRM/source state, and do not print private identities in chat.
```

## Stop Conditions

Stop future preview preparation if:

- approval phrase is missing, modified, or not packet-specific;
- evidence packet is missing or not approved for MailerLite preview;
- email evidence is missing;
- identity is ambiguous;
- consent/context is unclear;
- human review is unresolved;
- suppression/status is blocked or unknown;
- required setup facts are unknown;
- required field mapping is missing;
- group/automation trigger behavior is unknown;
- idempotency status is unknown;
- private values would need to be printed;
- API credentials, tokens, cookies, headers, env values, or secrets appear;
- a real payload, import file, or API request would be prepared from private
  evidence without approval;
- MailerLite mutation is requested without exact approval;
- CRM write is requested without exact approval.

## Closed Gates

- no execution;
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
- no DM opening;
- no welcome audio send;
- no candidate queue generation;
- no private artifact inspection;
- no CRM/source writes;
- no ledgers;
- no cards;
- no Fact Store;
- no scoring;
- no outreach;
- no source mutation;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

MailerLite onboarding lane produced a no-run no-write payload preview alignment
artifact connecting future approved email handoff evidence to MailerLite
payload preview schema, field/group/automation mapping, idempotency,
suppression/status checks, redacted receipts, and future mutation approval
boundaries without calling MailerLite or preparing a real private payload.

## Next Safe Step

Integrate this lane artifact into the Controlled Welcome Flow Proof plan, then
choose the next proof step:

1. Future Identity / CRM Enrichment Packet Boundary.
2. Assistant Reply Policy Design.
3. First Controlled Execution Approval Packet.
4. MailerLite setup inventory collection approval.
5. Pause.

Recommended default: Future Identity / CRM Enrichment Packet Boundary.

## Completion Boundary

Complete when CRM Core has a lane-local no-run design that defines the future
MailerLite no-write payload preview boundary, schema, mappings, idempotency,
suppression/status blockers, redacted receipt behavior, approval phrases, stop
conditions, and closed gates without preparing a real private payload or
executing any MailerLite, Gmail, Instagram, CRM, source, Launch OS, Mantis, or
OpenClaw action.

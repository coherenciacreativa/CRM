# MailerLite Onboarding API No-Write Design v0

Date: 2026-06-29
Status: no-run CRM Core design

## Purpose

Define a no-run MailerLite onboarding API design for future approved
email-handoff onboarding.

The design prepares CRM Core to:

- receive approved email handoff evidence;
- map fields safely;
- prepare subscriber upsert/add-to-group operations;
- preserve idempotency;
- produce redacted receipts;
- stop on ambiguity;
- require exact future approval before any MailerLite mutation.

This design does not authorize API calls, UI access, MailerLite mutation, CRM
writes, candidate queue generation, welcome audio send, DMs, scoring, outreach,
or source mutation.

## Source Preconditions

Future onboarding requires approved evidence, such as:

- private Instagram/DM reply evidence that includes email;
- manual evidence packet from Alejandro;
- approved CRM Core private review packet;
- future Gmail/email handoff evidence.

Required evidence fields before any future onboarding packet:

- `private_instagram_identity_anchor` if available;
- `email`;
- `email_evidence_source`;
- `observed_at`;
- `consent_or_context_label`;
- `identity_confidence`;
- `suppression_or_safety_status`;
- `recommended_operator_decision`.

Rules:

- no MailerLite onboarding without email evidence;
- no onboarding from story views alone;
- no onboarding from Instagram follow alone;
- no onboarding from email engagement alone;
- no onboarding if identity is ambiguous;
- no onboarding if suppression/safety is blocked;
- no onboarding if consent/context is unclear.

## MailerLite API Context

This design uses only documented/local planning knowledge and does not call any
endpoint.

Known API shape to account for in a future approved route:

- MailerLite API is RESTful.
- Base URL: `https://connect.mailerlite.com/api`.
- Requests use JSON payloads and JSON responses.
- API keys are supplied with `Authorization: Bearer <token>`.
- Global API rate limit is 120 requests per minute.
- Import endpoints have stricter rate limits and are out of scope by default.
- Subscriber create/upsert route: `POST /api/subscribers`.
- Subscriber upsert can include:
  - `email`;
  - `fields`;
  - `groups`;
  - `status`;
  - `subscribed_at`;
  - `ip_address`;
  - `opted_in_at`;
  - `optin_ip`.
- Omitting fields or groups from subscriber upsert is non-destructive.
- Updating an existing subscriber by `PUT /api/subscribers/{id}` has different
  semantics and may remove unlisted groups.
- Assigning an existing subscriber to a group can use
  `POST /api/subscribers/{subscriber_id}/groups/{group_id}`.
- Automations endpoints exist for listing/fetching automations and automation
  activity, but creating/deleting automations is out of scope here.

## No-Write API Operation Plan

Design future operations but do not execute them.

Potential future operation sequence:

1. Validate email evidence privately.
2. Check idempotency state.
3. Prepare subscriber upsert payload.
4. Prepare field mapping.
5. Prepare group assignment.
6. Prepare redacted receipt.
7. Await exact mutation approval.

Allowed future operation classes, only after later approval:

- `subscriber_upsert`;
- `subscriber_add_to_group`;
- `subscriber_field_update`;
- `onboarding_group_assignment`;
- `onboarding_receipt_only`.

Do not design destructive operations as default.

Forbidden operation classes:

- subscriber deletion;
- group deletion;
- removing subscriber from groups;
- changing existing status from unsubscribed/bounced/junk without explicit
  legal/compliance approval;
- automation creation/deletion;
- campaign creation/send;
- bulk import without separate approval;
- CRM write.

## Field Mapping

Proposed candidate MailerLite fields:

- `email`;
- `name`;
- `last_name`;
- `country`;
- `city`;
- `phone`;
- `instagram_handle_or_private_label`;
- `source_channel`;
- `source_context`;
- `onboarding_started_at`;
- `crm_core_private_anchor_label`;
- `consent_or_context`;
- `language`;
- `timezone`;
- `tags_or_custom_fields_if_existing`.

Rules:

- Use only fields confirmed to exist or explicitly approved to create later.
- Do not create new custom fields in this design.
- Do not store private anchors as raw exposed values unless explicitly approved.
- Prefer private labels/digests where person-level privacy requires it.
- Do not put sensitive DM content into MailerLite fields.
- Do not put raw message bodies into MailerLite fields.
- Do not infer city/country/phone unless explicitly provided in approved
  evidence.
- If a field mapping is uncertain, mark it `mapping_pending`.

Suggested mapping status values:

- `confirmed_existing_field`;
- `mapping_pending`;
- `requires_setup_inventory`;
- `requires_explicit_field_creation_approval`;
- `blocked_sensitive_content`.

## Group / Automation Mapping

Possible onboarding mechanism:

- Add subscriber to an approved MailerLite group that triggers onboarding
  automation.

Required future setup facts:

- approved onboarding group label;
- group ID or private group reference, never printed if considered sensitive;
- whether group membership triggers automation;
- automation label;
- whether automation is active;
- whether a subscriber re-added to the same group retriggers automation;
- whether existing subscriber status affects automation;
- suppression rules.

Rules:

- no group assignment without exact approval;
- no automation assumptions without setup inventory;
- do not create groups;
- do not create automations;
- do not modify automations;
- do not send campaigns;
- if group-trigger behavior is unknown, block mutation.

## Idempotency

Idempotency keys:

- `private_email_anchor`;
- `private_instagram_identity_anchor`;
- `mailerlite_subscriber_key`;
- `mailerlite_onboarding_operation_id`;
- `approved_onboarding_group_ref`;
- `email_handoff_evidence_id`;
- `onboarding_receipt_id`.

Rules:

- Never onboard the same email evidence twice.
- Never add to onboarding group twice if group membership already exists and
  retrigger behavior is unknown.
- If subscriber already exists, future upsert must be non-destructive.
- If subscriber status is unsubscribed, bounced, or junk, block unless
  separately approved.
- If idempotency status is unknown, block.

Suggested idempotency statuses:

- `new_private_email_evidence`;
- `already_prepared_no_write_packet`;
- `already_onboarded`;
- `subscriber_exists_group_unknown`;
- `subscriber_exists_group_present`;
- `blocked_status_or_suppression`;
- `blocked_idempotency_unknown`.

## Redacted Receipts

Future receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- operation status;
- evidence class;
- email evidence count;
- payload prepared count;
- fields mapped count;
- fields missing count;
- group mapping status;
- idempotency status;
- blocked count by blocker;
- MailerLite mutation performed false/true;
- CRM write performed false/true;
- next safe step.

Receipts must not include:

- emails;
- names;
- phone numbers;
- city/country tied to identity;
- private anchors;
- subscriber IDs;
- group IDs if sensitive;
- API keys;
- tokens;
- headers;
- env values;
- credentials;
- message bodies;
- DM content;
- raw private evidence.

## Future Approval Boundaries

This current design grants none of the approvals below.

### Setup Inventory Collection

Required approval phrase:

```text
I approve CRM Core to collect a no-secret MailerLite onboarding setup inventory. I will provide only non-secret group labels, field labels, automation labels, and yes/no/unknown setup facts; do not ask for or record API keys, tokens, subscriber IDs, group IDs I consider sensitive, private dashboard screenshots, credentials, headers, cookies, env values, authorization codes, secrets, or private subscriber content.
```

### No-Write Payload Preparation

Required approval phrase:

```text
I approve CRM Core to prepare a no-write MailerLite onboarding payload from approved private email-handoff evidence. Do not call the MailerLite API, do not mutate subscribers or groups, do not print emails or private identities, and write only redacted aggregate receipts.
```

### Mutation Approval

Required approval phrase:

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved field mapping and onboarding group, perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not print private identities, and write only redacted aggregate receipts.
```

Mutation approval is packet-specific. It does not authorize broad imports,
automation edits, campaign sends, CRM writes, or future repeated mutations.

## Stop Conditions

Stop future execution on:

- missing email evidence;
- ambiguous identity;
- suppression/safety blocked;
- unknown already-onboarded state;
- unknown subscriber status;
- unsubscribed/bounced/junk status without explicit override;
- missing approved onboarding group;
- unknown group automation trigger behavior;
- missing approved field mapping;
- API credential/secret exposure risk;
- request to print emails/private identities;
- MailerLite mutation without exact approval;
- CRM write without exact approval;
- source or UI ambiguity;
- rate-limit or API-error ambiguity;
- request to create/delete automations, groups, campaigns, or subscribers
  outside the approved operation.

## Source-Health / No-Write Verification Plan

Design only.

Future safe proof steps:

1. No-secret setup inventory.
2. No-write payload preparation from a synthetic or redacted approved example.
3. Optional no-write API healthcheck if separately approved.
4. Only then, a narrowly approved mutation packet.

No live API call is authorized by this task.

## Relationship To Instagram Welcome Lane

- Instagram detection does not trigger MailerLite onboarding.
- Welcome audio send does not trigger MailerLite onboarding.
- Only email handoff evidence or manual approved evidence can create a
  MailerLite onboarding packet.
- DM reply monitoring remains separately approved.
- Candidate queue remains separate from MailerLite onboarding.
- CRM writes remain separate.

## Closed Gates

- no MailerLite API calls;
- no MailerLite UI;
- no subscriber mutation;
- no group assignment;
- no custom field creation;
- no automation mutation;
- no campaign send;
- no Gmail;
- no Instagram;
- no DMs;
- no welcome audio;
- no candidate queue;
- no CRM writes;
- no ledgers, cards, Fact Store, scoring, outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

Complete when CRM Core has a no-run MailerLite onboarding API design that
defines evidence preconditions, field mapping, group/automation mapping,
idempotency, future approval boundaries, redacted receipts, source-health and
no-write verification steps, stop conditions, and all mutation/write gates
closed.

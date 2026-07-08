# MailerLite Onboarding Exact Mutation Execution Guard Design v0

Date: 2026-07-07
Status: no-live implementation; mocked tests only

## Purpose

Define and implement the packet-specific guard that will eventually protect the
MailerLite onboarding mutation route for one explicitly approved repaired private
onboarding packet.

This document and implementation do not authorize or execute any live
MailerLite mutation.

## Previous Blocker

```text
mutation_execution_route_status:
not_implemented
```

The exact mutation approval packet was already designed, but there was no
redaction-safe route for the exact operation class.

## Scope

- Implement a local command and tests for the exact mutation execution guard.
- Use fixture/mock mode only in this task.
- Do not call live MailerLite APIs.
- Do not use MailerLite UI.
- Do not inspect credentials, Keychain, environment variables, private
  artifacts, subscriber rows, or source systems.
- Do not mutate MailerLite, CRM Core, ledgers, cards, Fact Store, scoring, or
  outreach state.

## Planned Operation Class

```text
subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass
```

The route is one-packet-only and must never become a broad import, batch update,
or generalized source mutation tool.

## What The Future Mutation May Do

Only after a separate exact approval and all prechecks pass, a future completed
route may:

- Read the approved repaired private packet internally.
- Use the native top-level email from that private packet internally only.
- Use the confirmed onboarding group reference internally only.
- Map existing field families only when present in approved private evidence:
  - name
  - country
  - city
- Create/upsert one subscriber.
- Add or include only the confirmed onboarding group.
- Write a private result artifact to an approved private path.
- Write a redacted aggregate receipt to an approved reports path.

## What It Must Never Do

- No broad import.
- No multiple subscribers.
- No field creation.
- No automation mutation.
- No campaign creation or send.
- No segment, form, webhook, or account-settings mutation.
- No group removal.
- No destructive overwrite of existing subscriber fields.
- No subscriber deletion.
- No modification of unsubscribed, bounced, complained, junk, unknown, or
  ambiguous subscriber states.
- No CRM/source writes, ledgers, cards, Fact Store, scoring, or outreach writes.
- No raw email, IDs, raw payload, raw API response, credentials, tokens,
  headers, env values, private message text, private subscriber content, or
  private artifact content in stdout, stderr, redacted receipts, or docs.

## Private Packet Input Model

The future live route must require a private packet path under:

`/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`

The guard validates the path before reading. In this task tests use temporary
fixture roots only. The implementation does not read real private artifacts.

The packet must provide a resolvable private email lookup input internally. If
that input is absent, the command blocks before credential or network access.

## Final Pre-Execution Safety Gate

The guard requires a packet-specific final check receipt showing:

- `route_status=completed_live_readonly_packet_final_check`
- `live_lookup_ran=true`
- `mailerlite_api_called=true`
- `subscriber_lookup_status=not_found` or safe active-not-in-group state
- `onboarding_group_membership_status=not_found` or `absent`
- `duplicate_readd_status=safe_new_or_not_in_group`
- `suppression_status=pass`
- `idempotency_status=pass`
- no blockers
- explicit freshness semantics inside the approved window

If freshness cannot be proven, the route blocks. If any state is ambiguous,
stale, suppressed, already in group, or otherwise unsafe, the route blocks.

## Exact Approval Phrase Requirement

Future live exact mutation mode requires this exact approval phrase:

```text
I approve CRM Core to execute one MailerLite onboarding mutation for the explicitly approved repaired private onboarding packet only, using the implemented exact mutation execution guard. Use the approved operation class `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`, the approved native top-level email semantics, the approved existing field mapping, and the confirmed onboarding group. Immediately before mutation, perform or validate the packet-specific idempotency and suppression safety gate. Do not create fields, do not modify automations or campaigns, do not create or modify segments, forms, webhooks, or account settings, do not perform a broad import, do not print raw emails, IDs, subscriber rows, tokens, headers, env values, credentials, raw payloads, private message text, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.
```

This phrase is not approval in this document. It must be supplied later under a
separate exact execution approval.

## Redacted Receipt Model

Redacted receipts may include only:

- `run_id`
- `packet_id`
- `mutation_attempted`
- `mutation_executed`
- `operation_class`
- `final_pre_execution_check_status`
- `subscriber_lookup_status`
- `group_assignment_status`
- `mapped_field_family_count`
- `mapped_field_families`
- `omitted_field_family_count`
- `omitted_field_families`
- `mutation_result_status`
- `blockers`
- `recommended_next_step`
- `closed_gates`

Redacted receipts must not include raw emails, subscriber IDs, group IDs, field
IDs, raw payloads, raw API responses, names tied to identity, city/country values
tied to identity, private message text, tokens, headers, env values,
credentials, private subscriber content, or private artifact contents.

## Private Result Artifact Model

Future private results must be written only under the approved private MailerLite
artifact root. This implementation's tests write private result outputs only
under temporary directories.

Private results remain private and must not be committed, pasted into chat,
printed as raw rows, or copied into redacted receipts.

## Credential Handling

Credential providers are not invoked until after:

- explicit live approval flag validation;
- exact approval phrase validation;
- path validation;
- final-check receipt validation;
- private packet email-anchor validation;
- redaction and output path validation.

Because this implementation did not find a reviewed safe mutation client
contract, the future live CLI path blocks before credential lookup and before
network access.

## Endpoint Allowlist

Mock tests use explicit non-live operation endpoints only:

- `POST /mock/exact-onboarding/subscriber-upsert`
- `POST /mock/exact-onboarding/onboarding-group-assignment`

These mock endpoints are not MailerLite API endpoints and are used only to prove
structural allowlist behavior.

## Forbidden Endpoint Classes

The guard rejects:

- field creation endpoints;
- automation mutation endpoints;
- campaign endpoints;
- segment endpoints;
- form endpoints;
- webhook endpoints;
- account-settings endpoints;
- broad import endpoints;
- subscriber deletion endpoints;
- group removal endpoints;
- unapproved `POST`, `PUT`, `PATCH`, or `DELETE` routes.

## Field Mapping Rules

Only these field families may be mapped when present in approved private
evidence:

- name
- country
- city

The following remain omitted for v1:

- source_channel
- source_context
- onboarding_started_at
- consent_or_context
- crm_core_private_anchor_label

## Group Assignment Rules

The only allowed group behavior is adding or including the confirmed onboarding
group for the one approved subscriber after the final safety gate passes. The
route must not remove groups, change other groups, or trigger broad group
maintenance.

## Freshness And Staleness Rules

- A final-check receipt without freshness semantics blocks.
- A stale receipt blocks.
- A receipt with unknown source/mutation risk blocks.
- Subscriber found in onboarding group blocks.
- Suppressed, bounced, complained, unsubscribed, junk, unknown, or ambiguous
  subscriber status blocks.
- Duplicate/re-add uncertainty blocks.

## Conservative Stop Conditions

Stop before credential or network access if:

- approval flag is missing;
- exact approval phrase is missing or mismatched;
- any path is outside the approved root;
- any output path is inside the repo;
- final check is missing, stale, failed, or ambiguous;
- private packet email anchor is missing;
- a forbidden raw/debug/env/credential/header/token flag appears;
- the route would need an unapproved endpoint class;
- safe mutation client contract is missing.

## Test Coverage Summary

The mock suite covers fixture mode, live-mode approval gates, path rejection,
credential precheck ordering, missing/stale/failed final-check blocking, missing
private packet email blocking, mocked exact operation execution, endpoint
allowlist enforcement, forbidden endpoint classes, synthetic sensitive string
redaction, temporary-only private test outputs, package JSON parsing, and
package-lock preservation.

## Current Readiness

```text
exact_mutation_execution_guard_status:
exact_mutation_execution_guard_implemented_mocked_live_tested

live_mutation_status:
not_run

actual_mutation_status:
not_executed
```

The guard, CLI, tests, redaction checks, and docs now include the v1 safe mutation client contract for this exact operation class. Future live mutation remains not run and still requires central integration plus exact CEO mutation approval.

## Recommended Next Step

Central integration of the exact mutation execution guard, then exact CEO mutation approval or pause. Actual mutation remains not run and not authorized by this implementation.


## Safe Mutation Client Contract v1

```text
previous_route_status:
exact_mutation_execution_guard_scaffolded_safe_mutation_client_contract_missing

safe_mutation_client_contract:
post_subscribers_only_current_not_found_path

v1_readiness:
exact_mutation_execution_guard_implemented_mocked_live_tested

live_mutation_status:
not_run

actual_mutation_status:
not_executed
```

The v1 contract permits only:

- `POST /api/subscribers`

The v1 scope is intentionally limited to the current packet-specific
`not_found` subscriber path. It does not support existing-subscriber
group-assignment behavior. If a future packet reports
`subscriber_lookup_status=found`, the guard blocks with:

`blocked_existing_subscriber_path_not_supported_by_v1_guard`

The v1 contract disallows:

- `PUT /api/subscribers/{id}`
- `POST /api/subscribers/{subscriber_id}/groups/{group_id}`
- subscriber delete or forget endpoints
- group create, update, delete, import, unassign, or group-subscriber read
  endpoints inside the mutation command
- import or bulk endpoints
- automation endpoints
- campaign endpoints
- segment, form, webhook, account, or settings endpoints

The v1 payload is constructed internally only and includes:

- native top-level email from the approved repaired private packet;
- existing approved field families only: name, country, city;
- a groups array containing only the confirmed onboarding group reference.

The payload omits source/channel/context fields, consent/context fields, CRM Core
private anchor fields, status changes, opt-in metadata, and `resubscribe`.

Credential and network/client access occur only after approval, path, freshness,
final-check, private-packet, and endpoint allowlist prechecks pass. Mock tests
prove the precheck order and the single endpoint contract without calling live
MailerLite.

## Final-Check Receipt Contract Requirement

Mutation execution requires a redacted final-check JSON with:

- `receipt_consistency_check=passed`;
- usable ISO timestamp from `completed_at` or `checked_at` within the approved freshness window;
- `live_lookup_ran=true`;
- `route_status=completed_live_readonly_packet_final_check`;
- `mailerlite_api_called=true`;
- `mailerlite_api_call_scope=packet_specific_subscriber_status_group_membership_readonly`;
- passing suppression and idempotency statuses;
- `blockers=[]`.

The prior v2 final-check receipt cannot be reused for mutation because it lacks the machine-readable consistency and freshness fields. The guard blocks before credential lookup and before any network/client call when consistency is missing or not passed, when the timestamp is missing, malformed, stale, or from the future, or when any final-check status is non-passing. Actual mutation remains not executed.

Current blocker names:

- `blocked_final_check_receipt_consistency_missing`;
- `blocked_final_check_receipt_consistency_not_passed`;
- `blocked_final_check_freshness_timestamp_missing`;
- `blocked_final_check_freshness_timestamp_invalid`;
- `blocked_final_check_stale`.

## Final-Check Receipt Contract Field Alignment

Mutation execution requires machine-readable redacted final-check JSON fields:

- `receipt_contract_check=passed`;
- `receipt_consistency_check=passed`;
- usable ISO timestamp;
- completed live lookup;
- passing suppression/idempotency statuses;
- blockers none.

A prior v3-style receipt without `receipt_contract_check` is not executable. The guard blocks before credentials and before network/client access when required fields are missing, stale, invalid, or non-passing. Actual mutation remains not executed.

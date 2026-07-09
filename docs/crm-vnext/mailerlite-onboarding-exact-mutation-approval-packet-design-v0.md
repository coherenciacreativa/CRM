# MailerLite Onboarding Exact Mutation Approval Packet Design v0

Date: 2026-07-06
Status: exact mutation approval packet design; no execution

## Purpose

Prepare the exact approval packet Alejandro can review before any MailerLite
onboarding mutation.

This document does not authorize or execute mutation.

## Source Results

- no-write packet from private evidence result:
  `docs/crm-vnext/mailerlite-onboarding-minimal-no-write-mutation-review-packet-from-private-evidence-result-v0.md`
- private packet email anchor repair result:
  `docs/crm-vnext/mailerlite-onboarding-private-packet-email-anchor-repair-result-v0.md`
- final idempotency/suppression check result:
  `docs/crm-vnext/mailerlite-onboarding-final-idempotency-suppression-check-result-v0.md`
- final check status:
  `completed_live_readonly_ready_for_exact_mutation_approval`
- mutation_readiness:
  `ready_for_exact_mutation_approval_packet`
- blockers:
  `none`

## Final Check Summary

- `live_lookup_ran`: true
- `route_status`: `completed_live_readonly_packet_final_check`
- `mailerlite_api_called`: true
- `mailerlite_api_call_scope`:
  `packet_specific_subscriber_status_group_membership_readonly`
- `subscriber_lookup_status`: `not_found`
- `subscriber_status_class`: `not_found`
- `onboarding_group_membership_status`: `not_found`
- `duplicate_readd_status`: `safe_new_or_not_in_group`
- `suppression_status`: `pass`
- `idempotency_status`: `pass`
- `receipt_consistency_check`: `passed`

This summary intentionally excludes raw email, IDs, subscriber rows, names,
private message text, private artifact contents, tokens, headers, env values,
credentials, and private subscriber content.

## Planned Mutation Operation Class

```text
operation_class:
subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass
```

Planned operation semantics:

- Create/upsert one subscriber using native top-level MailerLite email from the
  approved private packet.
- Use existing confirmed field families only when present in approved private
  evidence:
  - name
  - country
  - city
- Omit MailerLite fields for v1:
  - source_channel
  - source_context
  - onboarding_started_at
  - consent_or_context
  - crm_core_private_anchor_label
- Keep consent/context outside MailerLite as private policy gate.
- Keep CRM Core private anchor outside MailerLite.
- Assign only to the confirmed onboarding group.
- Do not create fields.
- Do not modify automations.
- Do not modify campaigns.
- Do not create or modify segments/forms/webhooks/account settings.
- Do not remove groups.
- Do not destructively overwrite existing subscriber fields.
- Do not send campaigns.

## Freshness And Final Safety Rule

- The final idempotency/suppression check v2 supports preparing this approval
  packet.
- Actual mutation still requires immediate pre-execution safety behavior.
- If meaningful time passes, or any MailerLite/source action might have changed
  subscriber/group state, a fresh packet-specific final check is required before
  mutation.
- Recommended safe default: the eventual mutation execution route must either:
  1. rerun the final packet-specific idempotency/suppression check immediately
     before mutation, or
  2. prove the prior final check is still within the explicitly approved
     freshness window.
- If freshness cannot be proven, block.

## Execution Route Readiness

```text
previous_mutation_execution_route_status:
not_implemented
```

Repo-only discovery found the implemented packet-specific final
idempotency/suppression read-only guard and older MailerLite mutation utilities
for other operation classes, but did not find a reviewed redaction-safe route for
this exact operation class:

`subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`

Therefore:

- exact mutation approval packet can be designed;
- actual mutation execution must not be attempted until a redaction-safe
  mutation execution guard is implemented, tested, and centrally integrated;
- this was the previous blocker before the v1 safe mutation client contract
  was implemented and mock-tested.

## Mutation Execution Guard Implementation Update

```text
mutation_execution_route_guard_status:
implemented_mock_tested

live_mutation_status:
not_run

actual_mutation_status:
not_executed

exact_approval_required_after_central_integration:
true
```

The exact mutation execution guard is now implemented and mock-tested with the v1 safe mutation client contract: `POST /api/subscribers` only, current packet-specific `not_found` path only. Path checks, final-check freshness checks, endpoint allowlist tests, redaction checks, payload-shape tests, and credential/network precheck ordering are covered.

Exact mutation approval remains not requested. Actual mutation remains not executed. After central integration, Alejandro may either approve the exact one-packet mutation using the exact approval phrase or pause.

## Exact Approval Packet

```text
packet_id:
crm_core_mailerlite_exact_onboarding_mutation_approval_packet_2026-07-06

packet_status:
draft_for_alejandro_review_not_approved

mutation_execution_status:
not_executed

approval_scope:
one explicitly approved repaired private onboarding packet only

planned_operation_class:
subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass
```

Source evidence chain:

- controlled welcome audio send completed
- controlled reply/email handoff detected
- no-write MailerLite packet prepared
- private email anchor repaired
- final idempotency/suppression check passed

Planned fields:

- native top-level email
- name if present
- country if present
- city if present

Omitted fields:

- source_channel
- source_context
- onboarding_started_at
- consent_or_context as MailerLite field
- crm_core_private_anchor_label

Closed mutation gates preserved:

- no field creation
- no automation mutation
- no campaign send
- no broad import
- no CRM write
- no card write
- no Fact Store write
- no ledger write
- no scoring write

## Exact Approval Phrase

```text
I approve CRM Core to execute one MailerLite onboarding mutation for the explicitly approved repaired private onboarding packet only. Use the approved operation class `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`, the approved native top-level email semantics, the approved existing field mapping, and the confirmed onboarding group. Immediately before mutation, perform or validate the packet-specific idempotency and suppression safety gate. Do not create fields, do not modify automations or campaigns, do not create or modify segments, forms, webhooks, or account settings, do not perform a broad import, do not print raw emails, IDs, subscriber rows, tokens, headers, env values, credentials, raw payloads, private message text, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.
```

- This phrase is not approved by this design.
- Alejandro must supply or modify it later.
- Approval is packet-specific and not standing authorization.
- Mutation must stop on any ambiguity, stale safety check, route mismatch,
  redaction risk, or unexpected subscriber/group state.

## Required Execution Receipt Model

Future private result artifact and redacted receipt models must preserve the
same private/raw-data separation used by the packet and final-check gates.

Redacted receipt may include only:

- `run_id`
- `packet_id`
- `mutation_attempted`: true/false
- `mutation_executed`: true/false
- `operation_class`
- `final_pre_execution_check_status`
- `subscriber_lookup_status`
- `group_assignment_status`
- `mapped_field_family_count`
- `omitted_field_family_count`
- `mutation_result_status`
- `blockers`
- `recommended_next_step`
- `closed_gates`

Redacted receipt must not include:

- raw email
- subscriber ID
- group ID
- field IDs
- raw payload
- raw API response
- names tied to identity
- city/country tied to identity
- private message text
- tokens
- headers
- env values
- credentials
- private subscriber content
- private artifact contents

## Stop Conditions

Stop future mutation if any of these occur:

- exact approval phrase absent or modified ambiguously;
- mutation execution route missing or not redaction-safe;
- final pre-execution idempotency/suppression check absent, stale, or failed;
- subscriber found when not expected;
- subscriber already in onboarding group;
- subscriber status suppressed, bounced, complained, unsubscribed, junk, unknown,
  or ambiguous;
- route attempts field creation;
- route attempts automation/campaign mutation;
- route attempts broad import;
- route would print raw email, IDs, subscriber rows, raw payloads, headers,
  tokens, env values, credentials, private content, or private artifact
  contents;
- unexpected MailerLite API route appears;
- CRM/source write would occur;
- `/Users/alejandrogomez/CRM` would be used.

## Current Readiness Judgment

```text
exact_mutation_approval_packet_design_status:
ready_for_central_integration_with_guard_implemented_mock_tested

mutation_execution_route_guard_status:
implemented_mock_tested

live_mutation_status:
not_run

actual_mutation_status:
not_executed

safe_mutation_client_contract:
post_subscribers_only_current_not_found_path

next_step_after_central_integration:
exact_ceo_mutation_approval_or_pause
```

## Closed Gates

This design does not authorize:

- MailerLite API calls
- MailerLite UI
- subscriber mutation
- group assignment
- field creation
- automation mutation
- campaign send
- subscriber-row reads
- private artifact inspection
- CRM/source writes
- card writes
- Fact Store writes
- ledgers
- scoring
- Gmail
- Instagram
- DMs
- welcome audio
- Launch OS
- Mantis memory
- `/Users/alejandrogomez/CRM`

## Completion Boundary

Complete when CRM Core has a durable exact mutation approval packet design that
Alejandro can review later, without executing mutation.


## Safe Mutation Client Contract v1 Status

```text
safe_mutation_client_contract_status:
implemented_mock_tested

safe_mutation_client_contract:
post_subscribers_only_current_not_found_path

exact_mutation_approval_requested:
false

live_mutation_status:
not_run

actual_mutation_status:
not_executed

next_step_after_central_integration:
exact_ceo_mutation_approval_or_pause
```

The approval packet remains packet-specific. The implemented guard does not
authorize mutation by itself and does not broaden the operation class.

## Approval Packet Freshness Contract Correction

Exact mutation approval remains pending. A prior execution attempt was blocked before credential lookup, before MailerLite API access, and before any mutation because the approved v2 final-check redacted JSON lacked machine-readable `receipt_consistency_check=passed` and a usable freshness timestamp. No mutation occurred.

The next safe step after central integration is to rerun the final packet-specific idempotency/suppression check v4 under separate approval, then review a fresh redacted receipt. Mutation must not be attempted from the prior v2/v3 receipts, a chat summary, filesystem mtime, or any inferred freshness evidence.

## Approval Packet Contract Field Alignment

Exact mutation approval remains pending. A prior mutation execution attempt blocked before API because the final-check receipt lacked machine-readable `receipt_contract_check=passed`. No mutation occurred.

The next step after central integration should be a fresh final packet-specific idempotency/suppression check v4, not mutation. Mutation must not be attempted from the prior v3 receipt, an operator summary, filesystem mtime, or central closeout text.

## Producer/Consumer Contract Harness Boundary

Exact mutation approval remains pending. Prior mutation attempts blocked before API/mutation because final-check receipts were not contract-complete for the mutation guard. No mutation occurred.

After central integration, the next step should be a fresh final packet-specific idempotency/suppression check v5. After v5, run the mutation guard in preflight-only mode against the v5 receipt and repaired private packet before any live mutation attempt.

## Shared Approval Phrase Contract Update

- The exact mutation approval phrase is now governed by the shared approval phrase contract in:
  `scripts/crm-vnext-mailerlite-exact-mutation-approval-contract.mjs`.
- Future prompts must use the guard's canonical phrase, not hand-written variants.
- The safe no-live source for the phrase is the guard template mode:
  `--print-approval-template` or `--approval-template`.
- Exact mutation approval remains pending.
- Actual mutation remains not executed.

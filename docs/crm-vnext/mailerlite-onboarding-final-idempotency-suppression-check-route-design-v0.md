# MailerLite Onboarding Final Idempotency / Suppression Check Route Design v0

Date: 2026-07-06
Status: final_check_route_guard_implemented_mocked_live_tested
Live check status: not_run
Mutation status: not_authorized

## Purpose

Define the packet-specific read-only guard CRM Core must use before any future
MailerLite onboarding mutation approval. The guard answers whether one approved
private onboarding packet is still clear against subscriber lookup, suppression,
and duplicate/re-add risk, without printing private identifiers or writing any
source or CRM state.

## Previous Blocker

`route_not_implemented_or_not_redaction_safe`

The prior final packet-specific check correctly stopped before live source access
because the existing setup verifier intentionally blocked subscriber endpoints.
This v0 route adds a dedicated guard for the future packet-specific check while
keeping live execution behind a separate exact approval.

## Scope

This implementation is no-live and mocked-test only. It adds the command,
redaction contract, path guards, conservative decision model, and unit coverage.
It does not call MailerLite, use the MailerLite UI, inspect credentials, read
real subscriber rows, read private artifacts, write receipts under real operator
folders, or mutate any source/CRM state.

## Future Check Verifies

A separately approved future live run may verify only these redacted facts for
one approved private onboarding packet:

- whether the packet email anchor can be looked up;
- subscriber lookup status;
- subscriber status class;
- suppression/blocking status;
- whether the subscriber is already in the target onboarding group;
- whether the duplicate/re-add condition is safe enough to request exact
  mutation approval.

## What It Does Not Verify

The guard does not verify deliverability, campaign rendering, automation content,
future reply handling, full subscriber history, complete group history, source
identity truth, welcome-audio readiness, or CRM enrichment readiness. It also
does not authorize mutation. A `ready_for_exact_mutation_approval` result only
means the next gate may ask Alejandro for exact mutation approval.

## Private Packet Input Model

Future live mode requires `--private-packet-json` under:

`/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`

The private packet may contain internal lookup material, but the command must not
print it or copy raw lookup values into redacted receipts. The packet must provide
a private email anchor or equivalent internal lookup value; otherwise the check
blocks as `blocked_missing_private_packet_email_anchor` before credential access.

## Redacted Receipt Model

Redacted JSON and Markdown receipts must live under:

`/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow/`

They may include run ID, packet ID, route status, MailerLite API called boolean,
call scope label, subscriber/status/group/idempotency/suppression classes,
blockers, recommended next step, closed gates, and path labels. They must not
include raw emails, names, phone numbers, subscriber rows, subscriber IDs, group
IDs, automation IDs, field IDs, raw payloads, tokens, headers, env values,
credentials, private subscriber content, private message text, or raw private
packet contents.

## Private Result Artifact Model

Future private result artifacts must remain under the approved MailerLite private
artifact root. They may contain private references needed for operator continuity,
but this v0 implementation writes only redacted status fields and explicitly
records that raw email, raw IDs, raw payloads, and subscriber rows are not
included. Tests write private result fixtures under `/tmp` only.

## Credential Handling

Credential lookup is not used in fixture mode. Future live mode may invoke the
credential provider only after explicit live approval, approved private packet and
output paths, outside-repo checks, and private email-anchor presence checks pass.
The command must not print credential source, credential length, credential
fingerprint, tokens, headers, env values, or credential metadata.

## Read-Only Method Enforcement

The command structurally allows only `GET` requests for the packet-specific
subscriber lookup route. It rejects `POST`, `PUT`, `PATCH`, and `DELETE` before
execution. It also rejects group assignment, subscriber group mutation, field,
automation, campaign, segment, form, and webhook endpoints.

## Path Safety

Fixture mode allows only test outputs outside the repo. Future live mode requires
private packet and private result paths under the MailerLite private source
artifact root and redacted receipt paths under the controlled MailerLite report
root. Any output path inside the repo is rejected before credential lookup.

## Subscriber Lookup Status Model

Allowed lookup statuses are:

- `found`
- `not_found`
- `ambiguous`
- `blocked`
- `unknown`

Ambiguous or multi-record lookup blocks. Unknown or blocked lookup blocks.

## Subscriber Status / Suppression Model

Allowed subscriber status classes are:

- `active`
- `unsubscribed`
- `bounced`
- `complained`
- `junk`
- `unknown`
- `not_found`
- `ambiguous`

Only `active` or `not_found` can proceed to a pass decision, and only if the
remaining idempotency and group-membership checks are also clear. Unsubscribed,
bounced, complained, junk, suppressed, ambiguous, or unknown statuses block.

## Group Membership / Idempotency Model

Allowed onboarding group membership statuses are:

- `present`
- `absent`
- `unknown`
- `not_found`
- `ambiguous`

`present` blocks because MailerLite retrigger behavior for re-adds is unknown.
`absent` can pass only when subscriber status and packet duplicate evidence are
safe. Unknown and ambiguous group status block.

## Duplicate / Re-Add Block

If the subscriber is already in the target onboarding group, the command returns
`blocked_already_in_onboarding_group` and
`blocked_already_in_group_retrigger_unknown`. This remains conservative because
retrigger behavior is unknown and duplicate/re-add could produce unintended
onboarding effects.

## Conservative Readiness Model

When the command cannot establish a safe packet-specific state without exposing
raw data or using unsafe endpoint behavior, it blocks. The only successful
readiness value is `ready_for_exact_mutation_approval`, and that still does not
authorize a mutation.

## Stop Conditions

The route must stop if approval is missing, paths are outside approved roots, an
output path is inside the repo, private email anchor is absent, credential lookup
is unavailable after approved prechecks, request method or endpoint is unsafe,
lookup is ambiguous, subscriber status is suppressed or unknown, target group
membership is present or unknown, or idempotency evidence is not clear.

## Test Coverage Summary

The mocked tests cover fixture mode, future live precheck blocking, path rejection
before credential lookup, missing email-anchor blocking before credential lookup,
not-found readiness, active-not-in-group readiness, already-in-group blocking,
unsubscribed/bounced/complained/junk/suppressed blocking, ambiguous lookup
blocking, unknown status blocking, GET-only request enforcement, mutation endpoint
rejection, redacted stdout/stderr, redacted JSON and Markdown receipts, private
result output under `/tmp`, package script presence, and valid `package.json`.

## Future Exact Approval Phrase

`I approve CRM Core to perform one final packet-specific MailerLite idempotency and suppression check for the explicitly approved private onboarding packet only. Use existing internal credentials without printing or inspecting them. Read only the minimum subscriber/group/status metadata needed to decide whether the approved packet is safe to execute. Do not mutate anything, do not print raw emails, IDs, subscriber rows, tokens, headers, env values, credentials, raw payloads, or private subscriber content, and write only redacted aggregate receipts.`

## Current Readiness

`final_check_route_guard_implemented_mocked_live_tested`

## Live Check Status

`not_run`

## Mutation Status

`not_authorized`

## Recommended Next Step

`central_integration_of_final_idempotency_suppression_check_route_guard`, then a
separate approval for one final packet-specific idempotency/suppression check.

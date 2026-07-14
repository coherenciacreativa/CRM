# Instagram Welcome Audio Surface Capability Matrix v1

Date: 2026-07-14
Status: `docs_only_canonical_surface_matrix_no_run`
Matrix ID: `instagram_welcome_audio_surface_capability_matrix_v1`

## Purpose

Choose one canonical surface for future approved Welcome Audio operations and
make every alternate route fail closed. This matrix records contract status,
not a live capability probe.

The historical one-send result and Safari upload-route v0 are design evidence
only. They are not production proof, current health evidence, or live authority.

## Canonical Decision

```yaml
surface: safari_instagram_web_dm
surface_detail: safari_standard_isolated_native_picker
decision: canonical_required
```

Safari must carry the entire future operation from exact recent source binding
through audio capability, exact asset preview, one send attempt, and immediate
confirmation. A future mission may not splice this adapter with another
surface.

## Surface Matrix

| Surface | `surface` / `surface_detail` | Contract status | Audio capability treatment | Future action |
| --- | --- | --- | --- | --- |
| Safari standard isolated window, Instagram Web DM, native picker | `safari_instagram_web_dm` / `safari_standard_isolated_native_picker` | `canonical_required` | Must be freshly observed as `present_and_usable` for the exact bound thread | Eligible only under a new approved mission and the v1 adapter |
| Safari Private Browsing | not valid | `out_of_scope_forbidden` | Not evaluated | Stop |
| Instagram mobile or desktop in-app upload | not valid | `out_of_scope_in_app` | Not evaluated | Stop; no in-app fallback |
| Chrome Instagram Web DM | not valid | `out_of_scope_chrome` | Historical file-picker limitation is context only | Stop; no Chrome retry or repair inside a mission |
| Text-only DM | not valid | `out_of_scope_text` | No audio action | Stop |
| Text plus audio | not valid | `out_of_scope_text_audio_hybrid` | Changes the approved payload | Stop |
| Human-assisted or mixed manual/automated send | not valid | `out_of_scope_hybrid` | Cannot satisfy one canonical operation | Stop |
| Hidden input, DOM/JavaScript injection, drag/drop, coordinates, or screenshot coordinates | not valid | `out_of_scope_forbidden_fallback` | Bypasses the native surface contract | Stop |

No alternate row is a warm standby. A Safari block ends the operation without
effect; it does not authorize surface substitution.

## Capability Contract

The v1 adapter and operation guard use these exact enums:

```yaml
source_recency:
  - exact_recent
  - stale
  - unknown
source_binding:
  - exact_recent_source_bound
  - mismatch
  - ambiguous
  - missing
audio_capability:
  - present_and_usable
  - missing
  - disabled
  - ambiguous
asset_preview_binding:
  - exact_asset_and_preview_match
  - asset_mismatch
  - preview_mismatch
  - preview_unavailable
effect_claim:
  - unclaimed
  - permanently_claimed_before_attempt
claim_result:
  - not_started
  - fresh_atomic_claim_won_current_invocation
  - preexisting_or_replayed
  - stale
  - mismatch
claim_token_status:
  - not_issued
  - fresh_unconsumed_current_invocation
  - consumed
  - stale
  - mismatch
attempt_state:
  - not_attempted
  - attempt_committed
  - attempted_terminal
send_claim:
  - not_attempted
  - attempted_unconfirmed
  - confirmed_sent
confirmation_marker:
  - new_audio_bubble_with_sent_marker
  - new_audio_bubble_without_sent_marker
  - sent_marker_without_new_audio_bubble
  - none
retry_disposition:
  - not_applicable_before_attempt
  - retry_forbidden_permanently_after_attempt
```

Pre-claim eligibility requires all of:

```yaml
surface: safari_instagram_web_dm
surface_detail: safari_standard_isolated_native_picker
source_recency: exact_recent
source_binding: exact_recent_source_bound
business_eligibility: eligible_confirmed_recent_follower
audio_capability: present_and_usable
composer_capability: present_and_usable
attachment_capability: present_and_usable
text_fallback: forbidden
asset_preview_binding: exact_asset_and_preview_match
attempt_budget: 1
effect_claim: unclaimed
attempt_state: not_attempted
send_claim: not_attempted
confirmation_marker: none
retry_disposition: not_applicable_before_attempt
```

That combination can yield only `eligible_for_atomic_claim`; it never permits a
send. Current-invocation send readiness additionally requires the external
owner-only atomic claim writer to have won and durably persisted:

```yaml
effect_claim: permanently_claimed_before_attempt
attempt_state: attempt_committed
claim_result: fresh_atomic_claim_won_current_invocation
claim_token_status: fresh_unconsumed_current_invocation
```

The exact opaque claim owner, token, mission, operation, recipient/thread,
asset, and registry revision must all match. Any other pre-attempt combination
is non-admissible; any pre-existing, replayed, stale, or consumed committed
claim is terminal no-retry.

The pure guard reports this state as `send_ready: true` but keeps
`send_allowed: false`. Revalidating the same immutable snapshot is only a
repeat readiness observation. A separately integrated serialized executor must
atomically consume the exact token once before the UI effect; without that
consumer, READY is not live authority.

## Exact Recent Binding Semantics

`exact_recent` means the source observation falls within the absolute maximum
age named by the new future mission and inside the current or previous
`America/Bogota` calendar day. Its declared `today` or
`previous_calendar_day` bucket must match the timestamp. No age is inherited
from the closed pilot.

`exact_recent_source_bound` means the source-event, profile, private stable
candidate, owner, and exact Instagram Web DM thread anchors match the operation
and approval; the profile unambiguously confirms it follows the owner; and the
mission and stable operation key resolve to that same operation at the
immediate pre-attempt check. Stale, mismatched, ambiguous, or missing evidence
blocks before the permanent claim.

## Audio And Preview Semantics

`present_and_usable` means the exact bound Safari thread visibly exposes an
enabled native audio attachment control that can invoke the native picker. It
is an immediate observation, not an inference from the historical send.

Business eligibility, audio capability, composer capability, and attachment
capability are separate gates. `audio_capability: present_and_usable` never
substitutes for a visible usable composer or attachment control. Text fallback
remains forbidden.

`exact_asset_and_preview_match` means the mission-approved original audio asset
and private integrity binding match, and the exact bound thread displays one
ready-state audio preview before send. A generic attachment indicator is not
enough.

The preview must contain audio only. Adding text, another attachment, a
conversion, a renamed or temporary copy, or a second upload changes the action
and blocks the operation.

## Claim, Attempt, And Confirmation Semantics

Immediately before the one send-control actuation, an authorized owner-only
durable compare-and-swap claim writer atomically writes:

```yaml
effect_claim: permanently_claimed_before_attempt
attempt_state: attempt_committed
```

The pure guard never writes this state. It first validates pre-claim
eligibility, then validates a fresh post-write snapshot. The permanent pre-send
effect claim is a dedupe/no-reentry claim. It is not the post-send `send_claim`
and does not assert success. If the current invocation cannot prove that it won
the fresh claim, the operation is terminal and cannot be retried.

After the attempt, one of these current-operation markers is selected:

| Marker | Post-send claim |
| --- | --- |
| `new_audio_bubble_with_sent_marker` | `confirmed_sent` |
| `new_audio_bubble_without_sent_marker` | `confirmed_sent` |
| `sent_marker_without_new_audio_bubble` | `confirmed_sent` |
| `none` | `attempted_unconfirmed` |

The first three are strong only when attributable to the current operation;
historical or ambiguous UI does not qualify. Regardless of marker, the final
state is `attempted_terminal` and retry is permanently forbidden.

## Evidence Classification

| Evidence | Classification | What it may support | What it may not support |
| --- | --- | --- | --- |
| First controlled Safari send result v0 | `historical_single_send_design_evidence` | Choosing Safari and native picker for the adapter design | Production readiness, repeatability, current capability, live authorization |
| Safari upload-route hardening protocol v0 | `historical_no_run_design_evidence` | Fail-closed isolation, picker, and fallback rules | Current route health or an executable mission |
| Fresh future operation observation | `operation_scoped_evidence` | The exact enum values for that operation | Another operation, another surface, or standing automation |

## Receipt Boundary

Exact identities, source references, thread references, URLs, asset paths,
private digests, screenshots, and source payloads remain in the future approved
owner-only private evidence boundary. Tracked docs and redacted receipts contain
only enum values, counts, timestamps rounded or classified as approved, and
pass/fail redaction status.

## No-Run Boundary

This matrix did not open Safari or Instagram, inspect a DM, probe an upload
control, select an asset, send audio or text, write a private artifact, activate
automation, touch MailerLite, launch a campaign, or mutate CRM/source state.

## Future Mission Requirement

The closed limited operational pilot cannot authorize this matrix. A new future
mission must explicitly bind the v1 adapter, this matrix, the operation guard,
one exact recent source, one exact asset, one attempt, the permanent pre-send
claim, terminal no-retry, and private/redacted evidence boundaries.

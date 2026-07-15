# Instagram Welcome Audio Surface Capability Matrix v1

Date: 2026-07-14
Status: `operational_rail_and_async_bridge_centrally_integrated_deferred_rendezvous_independent_review_green_artifact_review_pending_no_live`
Matrix ID: `instagram_welcome_audio_surface_capability_matrix_v1`

## Purpose

Choose one canonical surface for future approved Welcome Audio operations and
make every alternate route fail closed. This matrix records contract status,
not a live capability probe.

The historical one-send result and Safari upload-route v0 are design evidence
only. They are not production proof, current health evidence, or live authority.

The deterministic Safari-branded port in
`instagram-welcome-audio-operational-rail-v1.md` is mechanical evidence only.
It does not probe any row in this matrix and does not establish that Safari or
Instagram is currently usable.

The current
`crm_core_welcome_audio_async_browser_session_bridge_v1` is likewise
mechanical ordering evidence only. It adds no surface and changes no row in the
surface matrix. Its one modeled Send and one modeled confirmation are simulated
test events, not a browser action, Safari action, Instagram delivery, picker
operation, audio delivery, or surface-health probe.

```text
browser_used = false
network_used = false
external_effect_invoked = false
production_ready = false
send_allowed = false
live_authority = false
```

The async bridge is now centrally integrated. The current deferred-rendezvous
delta adds no matrix row and probes no surface. It only provides a frozen,
opaque, nonserializable same-process authority paired to one deterministic port
and exact binding. Arming occurs only after durable `PENDING` plus claim and
session-authority consumption; one valid resolution may close the modeled
attempt. Forged, crossed, reused, concurrent-losing, early, drifted,
    mismatched, invalid, late, timed-out, and absent outcomes fail closed. Early or
    pre-arm rejection is false/count `0`; every terminal failure of the genuine
    rendezvous after `ARMED` (binding drift, invalid result, mismatch, timeout,
    or absence) is recorded conservatively as true/count `1`, terminal
    unknown/no-retry. Results must be
plain data-only records; Proxy, accessor-bearing, and non-plain inputs are
rejected without observation, and one frozen own-descriptor snapshot is used
for validation, comparison, and storage. The public port exposes no invocation
    method, driver, callback, browser handle, or payload. Independent review is
    green; formal artifact review and integration of this delta remain pending;
    it is not evidence that any browser can attach or
send.

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

The packet also requires the exact root/nested input allowlists and one
`canonical_operation_sha256` generated by
`buildWelcomeAudioCanonicalOperationDigest(input)`. That private digest must be
identical at the root and in `operation`, `approval`, `context`, `effect_claim`,
`execution`, and `confirmation`; it is not a redacted-receipt field.

The digest freezes the complete dynamic preclaim snapshot: approval and
context status/timestamps; exact surface, follower, binding, eligibility and
capability observations; exact asset-preview and dedupe evidence; all
mission-bound ages, budgets, and restrictions; and the immutable preclaim
claim/execution/confirmation bindings. Only legitimate post-claim lifecycle
mutations and digest self-copies are excluded. Any later mutation or backdating
of a preclaim section changes the canonical bytes and fails the trusted
external anchor.

Self-consistency never supplies trust. The owner-only caller must pass the
independently approved digest as the required
`expectedCanonicalOperationSha256` option to operation validation and
receipt-builder calls. It may not copy that expected anchor from `input`.

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
execution_surface.observed_at: fresh
follower_evidence.observed_at: fresh_timestamp
binding.observed_at: fresh
eligibility.observed_at: fresh
asset.preview_observed_at: fresh
operation.confirmation_max_delay_ms: 300000
approval.confirmation_max_delay_ms: 300000
context.confirmation_max_delay_ms: 300000
```

That combination can yield only `eligible_for_atomic_claim`; it never permits a
send. Current-invocation send readiness additionally requires the external
owner-only atomic claim writer to have won and durably persisted:

```yaml
effect_claim: permanently_claimed_before_attempt
attempt_state: attempt_committed
claim_result: fresh_atomic_claim_won_current_invocation
claim_token_status: fresh_unconsumed_current_invocation
canonical_operation_sha256: exact_immutable_match
attempt_id: exact_current_attempt
```

The independently trusted `expectedCanonicalOperationSha256` remains a required
owner-only call option. It is not part of the durably persisted claim state.

The exact opaque claim owner, token, mission, operation, recipient/thread,
asset, attempt ID, canonical-operation digest, and registry revision must all
match. Any other pre-attempt combination is non-admissible; every non-current,
pre-existing, replayed, stale, mismatched, or consumed committed claim/token is
terminal unknown/no-retry.

The pure guard reports this state as `send_ready: true` but keeps
`send_allowed: false`. Revalidating the same immutable snapshot is only a
repeat readiness observation. The separate contract in
`instagram-welcome-audio-one-shot-executor-v1.md` accepts the READY record only
when an independently trusted canonical digest and the exact authoritative
owner/token/revision/attempt lineage also match. It must durably consume once
before any future UI effect; without that consumer, READY is not live
authority.

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
blocks the permanent claim.

The eight required observation/freshness timestamps are
`approval.checked_at`, `execution_surface.observed_at`,
`follower_evidence.observed_at`, `binding.observed_at`,
`eligibility.observed_at`, `asset.preview_observed_at`, `context.checked_at`,
and `dedupe.checked_at`. Each must be fresh; they need not be distinct, and
`effect_claim.claimed_at` must be at or after all eight.

The complete values and statuses represented by these observations are sealed
into the canonical preclaim digest. Freshness validation alone is not enough:
mutating or backdating one of them after the digest is approved is a canonical
operation mismatch.

## Audio And Preview Semantics

`present_and_usable` means the exact bound Safari thread visibly exposes an
enabled native audio attachment control that can invoke the native picker. It
is an immediate timestamped `eligibility.observed_at` observation, not an
inference from the historical send.

Business eligibility, audio capability, composer capability, and attachment
capability are separate gates. `audio_capability: present_and_usable` never
substitutes for a visible usable composer or attachment control. Text fallback
remains forbidden.

`exact_asset_and_preview_match` means the mission-approved original audio asset
and private integrity binding match, and the exact bound thread displays one
ready-state audio preview before send. A generic attachment indicator is not
enough.

The preview observation is timestamped in `asset.preview_observed_at`, must be
fresh, and must precede the permanent claim.

The preview must contain audio only. Adding text, another attachment, a
conversion, a renamed or temporary copy, or a second upload changes the action
and blocks the operation.

## Claim, Attempt, And Confirmation Semantics

Immediately before the one send-control actuation, an authorized owner-only
durable compare-and-swap claim writer atomically writes:

```yaml
effect_claim: permanently_claimed_before_attempt
attempt_state: attempt_committed
canonical_operation_sha256: exact_immutable_match
attempt_id: exact_current_attempt
```

The pure guard never writes this state. It first validates pre-claim
eligibility, then validates a fresh post-write snapshot. The permanent pre-send
effect claim is a dedupe/no-reentry claim. It is not the post-send `send_claim`
and does not assert success. If the current invocation cannot prove that it won
the fresh claim, the operation is terminal and cannot be retried.

The one-shot consumer records `claim_token_consumed_at` at or after the current
claim and at or before `attempted_at`. Confirmation is at or after that exact
attempt and no more than `300000` milliseconds later. The immutable
`confirmation_max_delay_ms: 300000` must match in `operation`, `approval`, and
`context`. Owner,
token, registry revision, attempt ID, operation, approval, mission, and
canonical-operation digest must remain identical across claim, execution, and
confirmation.

The same digest must also equal the trusted external
`expectedCanonicalOperationSha256`. A packet that changes all of its internal
digest copies consistently still fails when it differs from that owner-only
anchor.

The existing synthetic executor publication order is immutable:

```text
authoritative READY
  -> exclusive per-operation mutex
  -> synced pending terminal evidence
  -> exclusive non-replace final tombstone
  -> terminal outcome / redacted receipt
```

No stale lock, dead owner, pending record, malformed record, timeout, callback
failure, process death, or missing receipt may be reclaimed into another
attempt. Pending, final, partial, or coexisting terminal evidence always blocks
replay.

The combined deterministic no-effect rail extends this proof without opening a
live surface:

```text
authoritative PRECLAIM
  -> shared owner-only claim writer publishes READY
  -> opaque same-process capability
  -> operational executor publishes pending attempted-terminal evidence
  -> capability consumed
  -> at most one branded deterministic Safari-port invocation
  -> final terminal evidence
  -> permanent no-retry
```

The branded port is not a callback supplied by a caller and is not a browser
driver. It is created only by the operational-rail module, lives in private
module state, accepts only deterministic no-effect scenarios, and fixes browser,
network, and external-effect use to false. A fabricated lookalike is rejected.

The capability has no raw peek/inspect export. Binding verification exposes only
`fresh`, `consumed`, or `invalid`, and consumption exposes only `consumed_now`,
`already_consumed`, or `invalid`; no root, digest, claim lineage, or record
metadata is returned.

An incomplete READY publication is `READY_PARTIAL`. While its publisher still
holds the mutex, a contender returns `BUSY`. If the partial remains after the
current invocation wins serialization and rechecks the store, it becomes
`UNKNOWN` with permanent no-retry. The partial is never repaired or reclaimed.

After a modeled after-boundary failure, the result is fixed before terminal
promotion. One read-only evidence reinspection classifies pending-only as
unknown and terminal-plus-pending as terminal by dominance. Both are permanent
no-retry, and replay performs no second modeled actuation.

The canonical pre-boundary zero-actuation case is distinct: branded-port
invocation alone does not enter the effect boundary. The receipt validator
accepts only `effect_boundary_entered=false`, derived boundary-entry count `0`,
`send_control_actuation_count=0`, current capability consumed, durable terminal
evidence present, pending evidence absent after completion, permanent no-retry,
and blocker `ACTUATION_COUNT`. Replay keeps both counts at zero and cannot mint
or consume a second capability effect. Count `2` is receipt-invalid.

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

A strong marker produces `confirmed_sent` only with a strict current claim,
consumed current token, matching revision and attempt lineage, identical
canonical-operation digest, and valid claim/consume/attempt/confirmation order.
Every non-current claim or token remains terminal unknown/no-retry even when a
strong marker is present.

Any confirmation checked more than `300000` milliseconds after the exact
attempt is too late. Even a strong marker then produces
`attempted_or_unknown_terminal_no_retry` and permanent no-retry, never a
confirmed terminal result.

Confirmed terminal blockers are restricted to the internal aging-only allowlist
plus `TERMINAL_NO_RETRY`. Unknown terminal requires either a terminal signal in
the public tuple or `TERMINAL_EVIDENCE`. `TERMINAL_EVIDENCE` is reserved for the
case where private terminal evidence disappears under redaction; it is not a
generic blocker. `retry_disposition` is derived policy rather than independent
terminal evidence, so a forbidden-retry value cannot by itself validate a
terminal receipt. A blocked result must have no public terminal signal and no
terminal-only blocker; its redacted lifecycle tuple is normalized to fixed
neutral enums.

## Evidence Classification

| Evidence | Classification | What it may support | What it may not support |
| --- | --- | --- | --- |
| First controlled Safari send result v0 | `historical_single_send_design_evidence` | Choosing Safari and native picker for the adapter design | Production readiness, repeatability, current capability, live authorization |
| Safari upload-route hardening protocol v0 | `historical_no_run_design_evidence` | Fail-closed isolation, picker, and fallback rules | Current route health or an executable mission |
| Synthetic one-shot executor adversarial suite v1 | `mechanical_serialization_evidence_only` | Durable one-consumer, crash, replay, privacy, and no-retry mechanics | Current Safari health, Instagram delivery, live authority, or production readiness |
| Combined deterministic operational-rail suite v1 | `mechanical_claim_and_actuation_order_centrally_integrated_no_live` | Focused `244/244`, including targeted adversarial crash/concurrency/invalid-port `7/7`; full `239/240` files and `1669/1670` tests with only the unchanged out-of-lane baseline failing; covers claim issuance, partial-publication and crash-evidence dominance, fixed non-introspective capability statuses, pending-before-actuation ordering, at-most-one branded invocation, terminal closure, blocker-specific receipt semantics, and receipt privacy | Browser control, current Safari health, Instagram delivery, live authority, or production readiness |
| Async browser session bridge v1 | `mechanical_async_ordering_evidence_centrally_integrated_no_live` | The simulated order only: synthetic preparation, authoritative durable PRECLAIM, existing READY/capability, durable pending, capability consumption, one modeled Send, one modeled confirmation, permanent terminal/no-retry. Bridge-only focused `44/44`; combined bridge-plus-inherited focused `276/276`, including async session bridge `25/25` and operational executor `19/19`; bridge-targeted adversarial `13/13`; full `240/241` files and `1701/1702` tests with only the exact unchanged out-of-lane baseline failing | A new surface, real actuator, browser or Safari use, Instagram or picker access, audio delivery, surface health, live issuer, canary authority, or production readiness |
| Deferred actuator rendezvous v1 | `same_process_result_rendezvous_independent_review_green_artifact_review_pending_no_live` | Opaque exact-port/exact-binding authority, arm-after-pending-and-authority-consumption ordering, exactly one asynchronous deterministic result, early false/count `0`, terminal genuine post-armed uncertainty conservative true/count `1`, data-only snapshot without getter/Proxy observation, and fail-closed timeout/reuse/forgery/drift/mismatch handling; current five-file focused `292/292`, including session `40/40` and operational executor `20/20`; full `240/241` files and `1717/1718` tests with the exact unchanged historical out-of-lane baseline; independent review green | A host browser, attachment capability, Instagram delivery, live surface health, effect authority, production readiness, or completed artifact review/integration |
| Fresh future operation observation | `operation_scoped_evidence` | The exact enum values for that operation | Another operation, another surface, or standing automation |

## Receipt Boundary

Exact identities, source references, thread references, URLs, asset paths,
private digests, screenshots, and source payloads remain in the future approved
owner-only private evidence boundary. Tracked docs and redacted receipts contain
only enum values, counts, timestamps rounded or classified as approved, and
pass/fail redaction status.

Receipt validation is both structural and semantic: phase, decision,
claim/readiness flags, terminal state, claim/token, attempt, confirmation, retry
state, and blocker codes must form one coherent state. Individually valid enums
in an impossible combination fail with `RECEIPT_SEMANTICS`.

## No-Run Boundary

This matrix and the operational-rail lane do not open Safari or Instagram,
inspect a DM, probe an upload control, select an asset, send audio or text,
activate automation, touch MailerLite or the legacy proxy, launch or alter a
campaign, or mutate CRM/source state. Only temporary owner-only synthetic
fixtures, the shared no-effect store, opaque same-process capabilities, and
fixed deterministic no-effect scenarios are permitted. Browser, UI, network,
private operational data, arbitrary callbacks and live registries remain
forbidden.

## Future Mission Requirement

The closed limited operational pilot cannot authorize this matrix. The combined
deterministic rail has passed validation, review, and central integration, but
none of those steps grants live authority. The async bridge has fresh green
no-live validation, completed review, and completed central integration; those
steps grant no live authority. The current deferred-rendezvous delta has green
independent review, remains formal-artifact-review/integration pending, and also
grants no live authority. A new future
mission must then explicitly bind the v1 adapter, this
matrix, the operation guard,
one exact recent source, one exact asset, one attempt, the permanent pre-send
claim, strict root/nested allowlists, immutable canonical-operation digest,
trusted external `expectedCanonicalOperationSha256`, fresh timestamped
observations sealed into the complete dynamic preclaim snapshot, exact
immutable `confirmation_max_delay_ms: 300000` in operation/approval/context,
current claim/token/revision/attempt lineage, exact terminal semantics,
terminal no-retry, a live owner-only claim issuer, a separately reviewed real
browser-bound Safari actuator, and private/redacted evidence boundaries. The
corrected guard, adapter/matrix chain, and synthetic boundary-A executor are
already centrally integrated, readiness-only and no-live. The combined rail has
focused integrated validation `244/244` green. The fresh
post-hardening owner-only captured full suite is `239/240` files and `1669/1670`
tests, with the sole failure the exact unchanged out-of-lane MailerLite
approval-queue baseline. Those inherited results do not validate the bridge;
fresh bridge-lane evidence is the separately reported bridge-only focused
`44/44`, combined bridge-plus-inherited focused `276/276`, targeted adversarial
`13/13`, and full `240/241` files plus `1701/1702` tests with only the exact
unchanged out-of-lane baseline failing.
Current rendezvous evidence is focused `292/292`, including operation session
`40/40` and operational executor `20/20`, plus full `240/241` files and
`1717/1718` tests with the exact unchanged historical out-of-lane baseline.
After any later rendezvous integration, a newly written mission plus fresh
explicit CEO approval is still required for the
exact one-recipient, one-audio, one-attempt canary.

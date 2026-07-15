# Instagram Welcome Audio Safari Action Adapter v1

Date: 2026-07-14
Status: `operational_rail_and_async_bridge_centrally_integrated_deferred_rendezvous_independent_review_green_artifact_review_pending_no_live`
Adapter ID: `instagram_welcome_audio_safari_action_adapter_v1`

## Decision

This is the immediate canonical action adapter for any future approved Instagram
Welcome Audio operation. It defines one end-to-end action through a dedicated
standard isolated Safari window, Instagram Web DM, the native file picker, and
one exact approved audio send.

This document creates no mission and grants no live authority. There is no
active send, upload, source read, browser action, MailerLite action, campaign,
CRM write, receipt, or private artifact created by this hardening task.

The combined deterministic no-effect rail in
`instagram-welcome-audio-operational-rail-v1.md` now models claim issuance and
Safari-shaped actuation behind this adapter. That model has no browser handle
and is not current surface-health evidence or live authority.

The current
`crm_core_welcome_audio_async_browser_session_bridge_v1` lane adds only
deterministic simulated asynchronous orchestration. It demonstrates synthetic
preparation followed by authoritative durable PRECLAIM, the existing READY and
opaque capability, durable pending evidence, capability consumption, one
modeled Send, one modeled confirmation, and permanent terminal/no-retry. It
does not drive this adapter or any real surface. A modeled
`send_control_actuation_count=1` is never a real message.

That async bridge is now centrally integrated. The current delta adds only a
deterministic same-process deferred rendezvous for a future host result. Its
authority is opaque, frozen, nonserializable, and exact-port/exact-binding
paired. It may arm only inside the executor after durable `PENDING` and after
both claim and session authority have been consumed. It accepts one resolution;
all forged, crossed, reused, concurrent-losing, early, drifted, mismatched,
invalid, late, timed-out, or absent outcomes fail closed. Only early/pre-arm
rejection reports false/count `0`. After `ARMED`, drift, invalid/non-plain/
accessor/Proxy input, mismatch, timeout, and absence conservatively report
true/count `1`, terminal unknown, and no-retry. A valid result becomes one
frozen data-only own-descriptor snapshot; getters are never invoked and the
caller object is never re-read. The public port still exposes no invocation
method, driver, callback, browser handle, or payload. This is not a browser
integration, surface-health check, upload, or send. Independent delta review is
green; formal artifact review and central integration remain pending.

For this lane, all of the following remain explicitly false:

```text
browser_used = false
network_used = false
external_effect_invoked = false
production_ready = false
send_allowed = false
live_authority = false
```

## Authority And Evidence Boundary

The following are design evidence only:

- the historical record of one controlled Safari send in
  `instagram-welcome-audio-first-controlled-send-result-v0.md`;
- the no-run Safari upload-route protocol in
  `instagram-welcome-audio-safari-upload-route-hardening-protocol-v0.md`.

Neither item is production proof, standing authorization, a current capability
probe, or evidence that the route remains healthy today. They informed this v1
contract but do not authorize its execution.

For every future Welcome Audio operation, this adapter and
`instagram-welcome-audio-surface-capability-matrix-v1.md` supersede the v0 route
as the binding action design. The old limited operational pilot is closed by
`crm-core-limited-operational-pilot-v1-closeout-v0.md`. A newly approved future
mission is required before any live effect.

## Canonical Surface

The only in-scope surface contract is:

```yaml
surface: safari_instagram_web_dm
surface_detail: safari_standard_isolated_native_picker
```

Required properties:

- Safari standard mode, never Private Browsing;
- a dedicated isolated window that is not the CEO's active browsing context;
- the exact Instagram Web DM thread bound from the recent approved source;
- the visible native audio attachment control and native file picker;
- the exact approved audio asset and its visible pre-send preview;
- one send-control actuation at most.

Instagram in-app upload, Chrome, text-only sends, text-plus-audio sends, hybrid
manual/automated routes, hidden inputs, DOM or JavaScript injection, drag/drop,
coordinates, and screenshot-coordinate navigation are out of scope.

## Exact Operation Contract

The table below is the public enum summary, not the complete serialized guard
packet. The canonical root and nested allowlists are defined by
`scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs` and include the
contract and adapter versions; operation, approval, surface, follower, binding,
eligibility, asset, context, dedupe, effect-claim, execution, confirmation, and
optional receipt sections. Every required root and nested key must be present,
and every extra root or nested key fails closed with `INPUT_SHAPE`. The optional
`receipt` is the only permitted root-key variation.

| Field | Allowed values | Required value before the attempt |
| --- | --- | --- |
| `adapter_version` | `instagram_welcome_audio_safari_action_adapter_v1` | exact value |
| `canonical_operation_sha256` | SHA-256 from `buildWelcomeAudioCanonicalOperationDigest(input)` | exact identical digest at every binding surface and equal to the trusted external expected anchor |
| `confirmation_max_delay_ms` | integer | exact immutable value `300000` in `operation`, `approval`, and `context` |
| `surface` | `safari_instagram_web_dm` | exact value |
| `surface_detail` | `safari_standard_isolated_native_picker` | exact value |
| `source_recency` | `exact_recent`, `stale`, `unknown` | `exact_recent` |
| `source_binding` | `exact_recent_source_bound`, `mismatch`, `ambiguous`, `missing` | `exact_recent_source_bound` |
| `audio_capability` | `present_and_usable`, `missing`, `disabled`, `ambiguous` | `present_and_usable` |
| `asset_preview_binding` | `exact_asset_and_preview_match`, `asset_mismatch`, `preview_mismatch`, `preview_unavailable` | `exact_asset_and_preview_match` |
| `attempt_budget` | integer | `1` |
| `effect_claim` | `unclaimed`, `permanently_claimed_before_attempt` | `unclaimed` for pre-claim eligibility; permanent only after the atomic writer wins |
| `claim_result` | `not_started`, `fresh_atomic_claim_won_current_invocation`, `preexisting_or_replayed`, `stale`, `mismatch` | `not_started` before CAS; only `fresh_atomic_claim_won_current_invocation` can become send-ready |
| `claim_token_status` | `not_issued`, `fresh_unconsumed_current_invocation`, `consumed`, `stale`, `mismatch` | `not_issued` before CAS; only `fresh_unconsumed_current_invocation` can become send-ready |
| `attempt_state` | `not_attempted`, `attempt_committed`, `attempted_terminal` | `not_attempted` before CAS; `attempt_committed` only for the fresh current invocation |
| `send_claim` | `not_attempted`, `attempted_unconfirmed`, `confirmed_sent` | `not_attempted` |
| `confirmation_marker` | `new_audio_bubble_with_sent_marker`, `new_audio_bubble_without_sent_marker`, `sent_marker_without_new_audio_bubble`, `none` | `none` before attempt |
| `retry_disposition` | `not_applicable_before_attempt`, `retry_forbidden_permanently_after_attempt` | `not_applicable_before_attempt` |
| `receipt_visibility` | `private_detail_and_redacted_summary` | exact value |

The permanent pre-send `effect_claim` is distinct from the post-send
`send_claim`. Any of the three strong current-operation markers may permit
`confirmed_sent` only with the strict current claim/token/revision/attempt
lineage defined below; only `none` maps to `attempted_unconfirmed`. The pure
guard does not write either claim.

### Canonical Nested Packet Field Map

The guard's nested input sections are the durable field contract:

```yaml
adapter_version: public version enum
contract_version: public guard-contract enum
canonical_operation_sha256: private canonical-operation digest
operation:
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  source_event_anchor_sha256: private
  profile_anchor_sha256: private
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
  expected_send_count: 1
  confirmation_max_delay_ms: 300000
  canonical_operation_sha256: exact root digest
approval:
  status: approved_exact_single_send
  checked_at: private timestamp
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  source_event_anchor_sha256: private
  profile_anchor_sha256: private
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
  source_recency_max_age_ms: mission-bound positive integer
  expected_send_count: 1
  confirmation_max_delay_ms: 300000
  canonical_operation_sha256: exact root digest
execution_surface:
  surface: safari_instagram_web_dm
  surface_detail: safari_standard_isolated_native_picker
  browser: safari
  browser_mode: standard
  isolation: isolated
  upload_route: native_file_picker
  private_browsing: false
  chrome_upload_attempted: false
  in_app_browser_upload_attempted: false
  observed_at: private fresh observation timestamp
follower_evidence:
  source_recency: exact_recent|stale|unknown
  observed_at: private timestamp
  time_bucket: today|previous_calendar_day|stale
  source_recency_max_age_ms: exact approval-bound value
  source_event_anchor_sha256: private
binding:
  source_binding: exact_recent_source_bound|mismatch|ambiguous|missing
  source_to_profile: exact
  profile_to_thread: exact
  follows_owner: confirmed
  ambiguity: clear
  source_event_anchor_sha256: private
  profile_anchor_sha256: private
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  observed_at: private fresh observation timestamp
eligibility:
  business_eligibility: eligible_confirmed_recent_follower
  audio_capability: public audio-capability enum
  composer_capability: public audio-capability enum
  attachment_capability: public audio-capability enum
  text_fallback: forbidden
  observed_at: private fresh observation timestamp
asset:
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
  asset_preview_binding: public asset-preview enum
  preview_status: verified_on_exact_bound_thread
  preview_audio_asset_id: private opaque
  preview_audio_asset_sha256: private
  preview_thread_anchor_sha256: private
  preview_observed_at: private fresh observation timestamp
context:
  status: fresh_exact_central_mission_context
  checked_at: private timestamp
  central_repo_head: private exact Git binding
  expected_central_repo_head: private exact Git binding
  mission_id: private opaque
  expected_mission_id: private opaque
  mission_status: active
  operation_id: private opaque
  approval_packet_id: private opaque
  confirmation_max_delay_ms: 300000
  canonical_operation_sha256: exact root digest
dedupe:
  status: clear_no_prior_welcome_or_attempt
  already_welcomed_status: not_found
  send_history_status: no_prior_attempt
  checked_at: private timestamp
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  approved_audio_asset_sha256: private
effect_claim:
  status: public effect-claim enum
  claim_result: public claim-result enum
  claim_token_status: public claim-token enum
  atomic: boolean
  permanent: boolean
  claimed_at: private timestamp or null
  claim_owner_id: private opaque or null
  claim_token_id: private opaque or null
  registry_revision: positive integer or null
  attempt_id: private opaque or null
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
  canonical_operation_sha256: exact root digest
execution:
  attempt_budget: 1
  send_attempt_count: 0|1
  attempt_state: public attempt-state enum
  send_claim: public send-claim enum
  retry_disposition: public retry enum
  retry_requested: false
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  canonical_operation_sha256: exact root digest
  claim_owner_id: private opaque or null
  claim_token_id: private opaque or null
  claim_registry_revision: positive integer or null
  attempt_id: private opaque or null
  claim_token_consumed_at: private timestamp or null
  attempted_at: private timestamp or null
confirmation:
  confirmation_marker: public confirmation enum
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  canonical_operation_sha256: exact root digest
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  approved_audio_asset_sha256: private
  claim_owner_id: private opaque or null
  claim_token_id: private opaque or null
  claim_registry_revision: positive integer or null
  attempt_id: private opaque or null
  bound_to_current_operation: boolean
  checked_at: private timestamp or null
receipt: optional exact redacted receipt
```

Private values never enter tracked documentation or the redacted receipt. The
root digest and the copies in `operation`, `approval`, `context`, `effect_claim`,
`execution`, and `confirmation` must be byte-identical. In this schema,
`context` carries the mission binding and `operation` carries the packet
binding; no parallel `mission` or `packet` root objects may be invented.
In `confirmation`, operation, approval-packet, mission, canonical digest,
candidate, thread, and asset bindings are always populated, including preclaim.
Only claim owner, token, registry revision, and attempt ID are nullable before
the claim; the lifecycle `checked_at` remains null until confirmation is
observed.

Self-consistency is insufficient. The owner-only caller must supply a trusted
external `expectedCanonicalOperationSha256` in the options for all operation
validation and receipt building:

```text
validateWelcomeAudioOperation(input, { expectedCanonicalOperationSha256 })
buildWelcomeAudioRedactedReceipt(input, { expectedCanonicalOperationSha256 })
```

The option must come from the independently approved owner-only mission/packet
boundary, never from any digest field inside `input`. Missing, malformed, or
mismatched expected anchors fail with `CANONICAL_OPERATION`.

The canonical projection freezes the complete dynamic preclaim snapshot, not
only static identifiers. It includes approval and mission-context status and
timestamps; the exact surface observation; follower evidence; source/profile/
thread binding; business, composer, attachment, and audio capability;
asset-preview evidence; dedupe evidence; budgets and restrictions; and the
immutable claim/execution/confirmation bindings already present before the
claim. Only legitimate post-claim lifecycle mutations and digest self-copies
are excluded from the projection. Mutating or backdating any preclaim section
after the digest is approved changes the canonical bytes and fails the trusted
external anchor.

## Future Mission Binding

No invocation is valid without a new future mission that explicitly binds:

- its mission ID and version;
- this exact adapter ID and the v1 surface matrix;
- one private stable operation key;
- one strict root/nested input shape;
- one immutable canonical-operation projection and digest built only through
  `buildWelcomeAudioCanonicalOperationDigest(input)`, covering the complete
  dynamic preclaim snapshot;
- one independently trusted owner-only `expectedCanonicalOperationSha256`
  supplied to validator and receipt-builder calls;
- one exact approved recent source observation;
- a mission-defined maximum source-binding age;
- one exact private recipient/thread binding;
- one exact approved audio asset label and private integrity binding;
- a total attempt budget of one;
- one permanent pre-send effect claim;
- one owner-only live atomic claim-writer contract, current-invocation claim
  owner, claim token, attempt ID, and monotonically bound registry revision;
- one separately integrated live browser-bound executor that atomically
  consumes the ready token only after durable pending terminal evidence and
  before actuating the UI effect;
- the exact executor contract in
  `instagram-welcome-audio-one-shot-executor-v1.md`;
- the permanent no-retry rule;
- one exact immutable `confirmation_max_delay_ms: 300000` copied through
  `operation`, `approval`, and `context`;
- private evidence and redacted receipt destinations;
- explicit live authority and all applicable action-time confirmations.

The adapter does not inherit authorization, capacity, recipients, timing, or
effect allowances from the closed pilot or from any historical result.

## Exact Recent Source Binding

`source_recency: exact_recent` is true only when a fresh observation falls
inside the maximum age defined by the future mission and is in the current or
previous `America/Bogota` calendar day. The mission-bound maximum age is an
absolute duration and may be stricter than that two-day calendar envelope.
This adapter does not invent or inherit a stale duration.

`source_binding: exact_recent_source_bound` requires all of the following at
the immediate pre-attempt check:

1. the fresh source observation resolves to exactly one private stable identity;
2. its time bucket is exactly `today` or `previous_calendar_day` in
   `America/Bogota` and agrees with the observed timestamp;
3. the source event, opened profile, private stable candidate, owner account,
   and Instagram Web DM thread anchors all match the operation and approval;
4. the profile visibly and unambiguously confirms that it follows the owner;
5. the operation key, mission, surface, and thread binding agree;
6. already-welcomed, prior-attempt, and dedupe evidence is negative and fresh;
7. the binding remains within the mission-defined maximum age.

The dynamic observations are independently fresh: `execution_surface.observed_at`,
`follower_evidence.observed_at`, `binding.observed_at`,
`eligibility.observed_at`, and `asset.preview_observed_at`. Approval, central
context, and dedupe retain their own fresh `checked_at` fields. A permanent
claim is valid only when `claimed_at` is at or after every one of those
observations/checks.

Those observations, their statuses, the capability and dedupe results, and the
mission-bound age, budget, and restriction values are all sealed into the
canonical preclaim digest. Rewriting or backdating them after approval is a
canonical-operation mismatch, even when all in-packet digest copies are
rewritten together.

If any item is stale, missing, mismatched, or ambiguous, stop before an attempt.
Do not search unrelated profiles or DMs to repair the binding.

## Audio Capability Gate

`audio_capability: present_and_usable` means that, in the exact bound Safari DM
thread, the native audio attachment control is visible, enabled, and can open
the native picker without a forbidden fallback.

Historical Safari success does not satisfy this gate. The capability must be
observed again for the exact future operation and timestamped in
`eligibility.observed_at`. `missing`, `disabled`, `ambiguous`, or stale evidence
blocks the operation before any send attempt.

## Exact Asset And Preview Gate

`asset_preview_binding: exact_asset_and_preview_match` requires:

- the mission-approved asset label;
- the original approved asset selected through the native picker;
- a private integrity binding that matches the mission packet;
- one visible ready-state preview in the exact bound DM thread;
- a fresh `asset.preview_observed_at` recorded no later than the claim;
- no conversion, rename, temporary copy, or alternate asset;
- no text or other attachment added to the send.

The preview is a pre-send binding check, not proof of delivery. Any asset or
preview mismatch, or an unavailable preview, stops before an attempt.

## Single-Attempt State Machine

```text
Phase A: pre-claim eligibility
  unclaimed + not_attempted + send_attempt_count=0
  -> eligible_for_atomic_claim; claim_allowed=true; send_allowed=false

Phase B: current-invocation send readiness
  authorized external CAS writer wins once and durably writes
  permanently_claimed_before_attempt + attempt_committed
  + exact canonical-operation digest matched to trusted external anchor
  + exact attempt ID
  + fresh current claim owner/token/revision
  -> mandatory fresh guard read
  -> ready_for_one_send_attempt; send_ready=true; send_allowed=false
  -> separately integrated one-shot executor consumes token once
  -> records claim_token_consumed_at before attempted_at

Phase C: permanent terminal state
  attempted_terminal + confirmed_sent
  attempted_terminal + attempted_unconfirmed
  every non-current/replayed/stale/mismatched claim or token
```

The operation guard is a pure validator: it never persists or atomically
promotes state. Immediately before the send action, an authorized caller must
use an owner-only durable compare-and-swap claim writer. Only a claim won by the
current invocation, with its exact opaque owner, token, and registry revision
fresh and unconsumed, its exact attempt ID, and its identical immutable
canonical-operation digest may pass the mandatory post-write guard evaluation.

A pre-existing, replayed, stale, mismatched, or consumed permanent claim, or an
`attempt_committed` state not proven fresh for the current invocation, is
terminal unknown/no-retry and blocks re-entry, even if later UI evidence looks
strong. A crash after the durable claim but before or during the click therefore
produces no retry. The pre-send claim is never a claim that the send succeeded.

Because the guard is pure, evaluating the same immutable fresh snapshot twice
can repeat only the readiness result. It cannot mint or consume a one-shot
authorization. Therefore `send_allowed` remains `false` in this guard. The
separate executor contract accepts only an authoritative READY record plus an
independently trusted canonical digest and exact owner/token/revision/attempt
lineage. It re-reads under serialization, consumes durably once, and makes any
pending, final, partial, malformed, or replayed terminal evidence permanently
non-retryable. READY alone is never executable authority.

### Deterministic No-Effect Operational Rail Boundary

The centrally integrated executor remains
`synthetic_no_effect_proof_only`. The centrally integrated operational rail
includes a deterministic claim writer, an opaque same-process one-use
capability, and a Safari-branded deterministic port/executor/composite. They
reuse shared
owner-only temporary-store mechanics and enforce this order:

```text
claim -> READY -> synced pending attempted-terminal evidence
  -> capability consumption -> at most one deterministic port invocation
  -> exclusive terminal evidence -> permanent no-retry
```

The port is only a branded contract object held in module-private state. It has
no browser, UI, network, upload, send, arbitrary callback, operational CLI, or
live registry access. Every rail receipt fixes external effect, browser, and
network use to false and production readiness to false. The capability has no
raw peek/inspect export: verification returns only `fresh`, `consumed`, or
`invalid`, and consumption returns only `consumed_now`, `already_consumed`, or
`invalid`, never store, digest, lineage, or metadata.

Incomplete READY publication is explicit. `READY_PARTIAL` under a held mutex is
`BUSY`; if it survives the current invocation's under-mutex recheck, it is
`UNKNOWN` and permanently non-retryable. Current focused integrated validation
is `244/244` green, including a `7/7` targeted adversarial
crash/concurrency/invalid-port subset. A fresh
post-hardening full-suite owner-only captured rerun is also complete: `239/240`
files and `1669/1670` tests, with the sole failure
the exact unchanged out-of-lane MailerLite approval-queue baseline. Independent
delta review, the final external verdict, commit, push, and central integration
are complete for that inherited operational rail. These results do not validate
the async bridge. Fresh bridge-lane validation is separately green: bridge-only
focused `44/44`; combined bridge-plus-inherited focused `276/276`, including
async session bridge `25/25` and operational executor `19/19`;
bridge-targeted adversarial `13/13`; and full repository `240/241` files and
`1701/1702` tests with only the exact unchanged out-of-lane Launch OS
approval-queue baseline failing.

For an after-boundary modeled failure, the no-effect executor fixes the modeled
result before terminal promotion. If promotion fails, it performs one read-only
evidence reinspection: terminal dominates terminal-plus-pending; pending-only
remains unknown. Both are permanent no-retry, and replay performs no second
modeled actuation.

For the separate canonical pre-boundary zero-actuation fixture, invoking the
branded port is not effect-boundary entry. Its validator admits only the
fail-closed terminal tuple with `effect_boundary_entered=false`, derived
boundary-entry count `0`, `send_control_actuation_count=0`, the current
capability consumed, durable terminal evidence present, pending evidence absent
after completion, permanent no-retry, and blocker `ACTUATION_COUNT`. Replay
keeps boundary and actuation counts at zero and cannot mint or consume a second
capability effect. Count `2` remains receipt-invalid.

A real browser-bound executor/actuator remains a separate reviewed boundary.
It cannot be inferred from the branded no-effect port or the async bridge. Even
though the no-effect rail is validated, reviewed, and centrally integrated, a
separately reviewed owner-only live claim issuer, real browser-bound Safari
actuator, and new future mission with fresh explicit CEO approval are still
required before the exact canary effect path can exist.

The send-control actuation is the effect boundary. The claim was already
durably committed before this boundary. Immediately at the boundary, the
authorized caller consumes the one-time claim token and records:

- the attempt budget is consumed;
- `retry_disposition` becomes
  `retry_forbidden_permanently_after_attempt`;
- the same operation key, recipient binding, and asset binding can never be
  retried, including under a later mission;
- uncertainty, UI failure, process death, or missing confirmation cannot reopen
  the attempt.

The ordering is strict and inclusive. `approval.checked_at`,
`execution_surface.observed_at`, `follower_evidence.observed_at`,
`binding.observed_at`, `eligibility.observed_at`,
`asset.preview_observed_at`, `context.checked_at`, and `dedupe.checked_at` must
all be no later than `effect_claim.claimed_at`.
`claim_token_consumed_at` must be at or after the current `claimed_at` and at or
before `attempted_at`; confirmation `checked_at` must be at or after that exact
attempt and no more than exactly `300000` milliseconds later. The same
immutable `confirmation_max_delay_ms: 300000` must match in `operation`,
`approval`, and `context`.

There is no second click, resend, retrigger, alternate browser, in-app retry,
manual completion, or hybrid fallback after the attempt boundary.

## Confirmation And Claims

After the one attempt, inspect only the already-bound DM thread and select one
explicit enum:

| `confirmation_marker` | Permitted `send_claim` | Meaning |
| --- | --- | --- |
| `new_audio_bubble_with_sent_marker` | `confirmed_sent` | A new audio bubble attributable to this operation and its sent marker are both visible. |
| `new_audio_bubble_without_sent_marker` | `confirmed_sent` | A strong new audio-bubble marker is attributable to this operation even though a separate sent marker is absent. |
| `sent_marker_without_new_audio_bubble` | `confirmed_sent` | A strong sent marker is attributable to this operation even though the new bubble is not separately visible. |
| `none` | `attempted_unconfirmed` | No exact confirmation is available, or the state is ambiguous. |

`confirmed_sent` is forbidden for historical bubbles or markers, a preview, a
generic toast, a thread-order change, or evidence that cannot be attributed to
the current operation. A strong marker permits `confirmed_sent` only when the
claim is the fresh current-invocation claim, its token is consumed, and the
operation/approval/mission digest, owner, token, registry revision, attempt ID,
attempt state, count, and timestamps all cohere across claim, execution, and
confirmation. Any non-current claim/token/revision or lineage mismatch produces
terminal unknown/no-retry. A missing confirmation is terminal and must never
trigger a retry.

A strong marker observed more than `300000` milliseconds after `attempted_at`
is too late to confirm this operation. It is classified
`attempted_or_unknown_terminal_no_retry` with permanent no-retry, never
`confirmed_sent`, even when every other lineage field matches.

## Private Evidence And Redacted Receipt

Private operation evidence may contain the minimum exact bindings required for
dedupe and audit. It must remain owner-only outside the repository. It must not
be printed, pasted into chat, committed, or copied into the redacted receipt.

The redacted receipt contains exactly these fields, in the guard's exported
allowlist:

```yaml
receipt_schema_version:
guard_contract_version:
adapter_version:
redaction_status:
phase:
decision:
claim_allowed:
send_ready:
send_allowed:
one_shot_consumer_required:
terminal:
expected_send_count:
attempt_budget:
send_attempt_count:
surface:
surface_detail:
source_recency:
source_binding:
business_eligibility:
audio_capability:
asset_preview_binding:
context_status:
dedupe_status:
effect_claim:
claim_result:
claim_token_status:
attempt_state:
send_claim:
confirmation_marker:
retry_disposition:
blocker_codes:
```

The builder emits every required field and replaces invalid or unknown input
with fixed non-private `invalid_or_unknown` or `null`; it never copies an
arbitrary input string. When the operation decision is `blocked_fail_closed`,
the builder emits the fixed neutral lifecycle tuple so malformed isolated claim
enums cannot make a blocked receipt contradict its own classification. The
standalone validator requires the exact key set,
exact types, exact enums, and cross-field semantic coherence. It rejects
impossible phase/decision/claim/readiness/terminal combinations with
`RECEIPT_SEMANTICS`. This list must change in the same commit whenever the
guard's exported `REDACTED_RECEIPT_FIELDS` changes. The private canonical digest
never becomes a receipt field.

Receipt terminal semantics are exact:

- `confirmed_sent_terminal_no_retry` accepts only the strict confirmed tuple;
  its blockers are limited to `TERMINAL_NO_RETRY` plus the internal aging-only
  allowlist (`APPROVAL_FRESHNESS`, `SURFACE_OBSERVATION`, `SOURCE_MAX_AGE`,
  `SOURCE_CALENDAR_WINDOW`, `SOURCE_BUCKET`, `BINDING_OBSERVATION`,
  `ELIGIBILITY_OBSERVATION`, `ASSET_PREVIEW_OBSERVATION`, `CONTEXT_FRESHNESS`,
  `DEDUPE_FRESHNESS`, and `EFFECT_CLAIM_FRESHNESS`);
- `attempted_or_unknown_terminal_no_retry` requires a public terminal signal or
  `TERMINAL_EVIDENCE`, plus `TERMINAL_NO_RETRY` and the corresponding unknown
  evidence reason;
- `TERMINAL_EVIDENCE` is emitted only when private terminal evidence exists but
  disappears from the redacted public tuple;
- `retry_disposition` is derived terminal policy, not independent evidence; a
  forbidden-retry value alone cannot validate a terminal receipt;
- `blocked_fail_closed` requires no public terminal signal and no terminal-only
  blocker or permanently forbidden retry disposition.

No raw identity, handle, profile or thread reference, URL, message text, asset
path, asset contents, private digest, screenshot, cookie, credential, or source
payload may enter tracked documentation or the redacted receipt.

## Stop Conditions

Stop before an attempt when any required positive gate is absent, the CEO's
visible desktop would be disrupted, Safari is not dedicated and isolated, auth
or permissions are ambiguous, a private boundary cannot be preserved, or a
forbidden surface/fallback would be required.

Also stop on `INPUT_SHAPE`, `CANONICAL_OPERATION`, `SURFACE_OBSERVATION`,
`BINDING_OBSERVATION`, `ELIGIBILITY_OBSERVATION`,
`ASSET_PREVIEW_OBSERVATION`, `EXECUTION_BINDING`,
`CLAIM_TOKEN_CONSUMPTION`, `CONFIRMATION_MAX_DELAY`,
`CONFIRMATION_DELAY_EXCEEDED`, `TERMINAL_EVIDENCE`, or `RECEIPT_SEMANTICS`.

Stop terminally after an attempt, regardless of confirmation quality. Record
the claim and marker once; do not repair by sending again.

## Closed Gates

- no live run;
- no Safari or Instagram action;
- no upload, preview, or send;
- no source read or DM opening;
- no in-app, Chrome, text, or hybrid route;
- no MailerLite, campaign, legacy proxy, CRM, card, Fact Store, ledger, or
  scoring action;
- no live private artifact or persisted operational receipt creation;
- no automation activation;
- no claim that current deferred-rendezvous central integration or any future
  live-mission authorization already exists; delta commit and push are allowed
  only after required no-live validation and review;
- no live one-shot executor, real browser-bound actuator, or effect callback;
  only the centrally integrated no-effect dependencies and the deterministic
  simulated bridge port/session inside the exact lane allowlist are allowed;
- no reuse of the closed pilot as live authority.

## Completion Boundary

The corrected guard, adapter/matrix chain, synthetic boundary-A executor, and
combined deterministic operational rail are centrally integrated,
readiness-only and no-live. The inherited rail's focused validation is
`244/244` green, its targeted adversarial subset is `7/7`, and the owner-only
captured full repository result is `239/240` files and `1669/1670` tests, with
only the unchanged out-of-lane baseline failing. The centrally integrated async
bridge has fresh green validation: bridge-only focused `44/44`, combined
bridge-plus-inherited focused `276/276`, bridge-targeted adversarial `13/13`,
and full repository `240/241` files and `1701/1702` tests with only the
unchanged out-of-lane baseline failing.
The current deferred-rendezvous delta is focused green `292/292`, including
operation session `40/40` and operational executor `20/20`; its full-suite
result is `240/241` files and `1717/1718` tests with the exact unchanged
historical out-of-lane baseline. Independent review is green. The async bridge
review and central integration are complete, but operational readiness still
requires this deferred-rendezvous delta to finish formal artifact review and
central integration, then a live owner-only claim issuer, a real
browser-bound Safari actuator, and a newly written mission with fresh explicit
CEO approval for the exact one-recipient, one-audio, one-attempt canary.

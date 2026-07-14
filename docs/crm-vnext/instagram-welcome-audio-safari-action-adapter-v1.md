# Instagram Welcome Audio Safari Action Adapter v1

Date: 2026-07-14
Status: `code_test_doc_contract_no_run`
Adapter ID: `instagram_welcome_audio_safari_action_adapter_v1`

## Decision

This is the immediate canonical action adapter for any future approved Instagram
Welcome Audio operation. It defines one end-to-end action through a dedicated
standard isolated Safari window, Instagram Web DM, the native file picker, and
one exact approved audio send.

This document creates no mission and grants no live authority. There is no
active send, upload, source read, browser action, MailerLite action, campaign,
CRM write, receipt, or private artifact created by this hardening task.

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
packet. The canonical nested packet is defined by
`scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs` and includes the
contract and adapter versions; operation, approval, surface, follower, binding,
eligibility, asset, context, dedupe, effect-claim, execution, confirmation, and
optional receipt sections. Missing nested fields, unknown values, and any
non-canonical positive claim fail closed.

| Field | Allowed values | Required value before the attempt |
| --- | --- | --- |
| `adapter_version` | `instagram_welcome_audio_safari_action_adapter_v1` | exact value |
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
`send_claim`. Any of the three strong current-operation markers permits
`confirmed_sent`; only `none` maps to `attempted_unconfirmed`. The pure guard
does not write either claim.

### Canonical Nested Packet Field Map

The guard's nested input sections are the durable field contract:

```yaml
adapter_version: public version enum
contract_version: public guard-contract enum
operation:
  operation_id: private opaque
  approval_packet_id: private opaque
  source_event_anchor_sha256: private
  profile_anchor_sha256: private
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  expected_send_count: 1
approval:
  status: approved_exact_single_send
  checked_at: private timestamp
  operation_id: private opaque
  approval_packet_id: private opaque
  source_event_anchor_sha256: private
  profile_anchor_sha256: private
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
  source_recency_max_age_ms: mission-bound positive integer
  expected_send_count: 1
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
eligibility:
  business_eligibility: eligible_confirmed_recent_follower
  audio_capability: public audio-capability enum
  composer_capability: public audio-capability enum
  attachment_capability: public audio-capability enum
  text_fallback: forbidden
asset:
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
  asset_preview_binding: public asset-preview enum
  preview_status: verified_on_exact_bound_thread
  preview_audio_asset_id: private opaque
  preview_audio_asset_sha256: private
  preview_thread_anchor_sha256: private
context:
  status: fresh_exact_central_mission_context
  checked_at: private timestamp
  central_repo_head: private exact Git binding
  expected_central_repo_head: private exact Git binding
  mission_id: private opaque
  expected_mission_id: private opaque
  mission_status: active
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
  operation_id: private opaque
  approval_packet_id: private opaque
  mission_id: private opaque
  candidate_anchor_sha256: private
  thread_anchor_sha256: private
  owner_anchor_sha256: private
  approved_audio_asset_id: private opaque
  approved_audio_asset_sha256: private
execution:
  attempt_budget: 1
  send_attempt_count: 0|1
  attempt_state: public attempt-state enum
  send_claim: public send-claim enum
  retry_disposition: public retry enum
  retry_requested: false
  claim_owner_id: private opaque or null
  claim_token_id: private opaque or null
  claim_registry_revision: positive integer or null
  attempted_at: private timestamp or null
confirmation:
  confirmation_marker: public confirmation enum
  operation_id: private opaque or null
  candidate_anchor_sha256: private or null
  thread_anchor_sha256: private or null
  approved_audio_asset_sha256: private or null
  bound_to_current_operation: boolean
  checked_at: private timestamp or null
receipt: optional exact redacted receipt
```

Private values never enter tracked documentation or the redacted receipt.

## Future Mission Binding

No invocation is valid without a new future mission that explicitly binds:

- its mission ID and version;
- this exact adapter ID and the v1 surface matrix;
- one private stable operation key;
- one exact approved recent source observation;
- a mission-defined maximum source-binding age;
- one exact private recipient/thread binding;
- one exact approved audio asset label and private integrity binding;
- a total attempt budget of one;
- one permanent pre-send effect claim;
- one owner-only atomic claim-writer contract, current-invocation claim owner,
  claim token, and monotonically bound registry revision;
- one separately integrated one-shot executor that atomically consumes the
  ready token before actuating the UI effect;
- the permanent no-retry rule;
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

If any item is stale, missing, mismatched, or ambiguous, stop before an attempt.
Do not search unrelated profiles or DMs to repair the binding.

## Audio Capability Gate

`audio_capability: present_and_usable` means that, in the exact bound Safari DM
thread, the native audio attachment control is visible, enabled, and can open
the native picker without a forbidden fallback.

Historical Safari success does not satisfy this gate. The capability must be
observed again for the exact future operation. `missing`, `disabled`, or
`ambiguous` blocks the operation before any send attempt.

## Exact Asset And Preview Gate

`asset_preview_binding: exact_asset_and_preview_match` requires:

- the mission-approved asset label;
- the original approved asset selected through the native picker;
- a private integrity binding that matches the mission packet;
- one visible ready-state preview in the exact bound DM thread;
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
  + fresh current claim owner/token/revision
  -> mandatory fresh guard read
  -> ready_for_one_send_attempt; send_ready=true; send_allowed=false
  -> separately integrated one-shot executor consumes token once

Phase C: permanent terminal state
  attempted_terminal + confirmed_sent
  attempted_terminal + attempted_unconfirmed
  pre-existing/replayed/stale/consumed attempt_committed claim
```

The operation guard is a pure validator: it never persists or atomically
promotes state. Immediately before the send action, an authorized caller must
use an owner-only durable compare-and-swap claim writer. Only a claim won by the
current invocation, with its exact opaque owner, token, and registry revision
fresh and unconsumed, may pass the mandatory post-write guard evaluation.

A pre-existing, replayed, stale, mismatched, or consumed permanent claim, or an
`attempt_committed` state not proven fresh for the current invocation, is
terminal and blocks re-entry. A crash after the durable claim but before or
during the click therefore produces no retry. The pre-send claim is never a
claim that the send succeeded.

Because the guard is pure, evaluating the same immutable fresh snapshot twice
can repeat only the readiness result. It cannot mint or consume a one-shot
authorization. Therefore `send_allowed` remains `false` in this guard. A future
live mission must integrate and test the separate serialized executor that
accepts one READY snapshot, atomically consumes its exact token, and performs
at most one UI actuation. Until that executor exists, READY is not executable
authority.

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
the current operation. A missing confirmation is terminal and must never
trigger a retry.

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
arbitrary input string. The standalone validator requires the exact key set,
exact types, and exact enums. This list must change in the same commit whenever
the guard's exported `REDACTED_RECEIPT_FIELDS` changes.

No raw identity, handle, profile or thread reference, URL, message text, asset
path, asset contents, private digest, screenshot, cookie, credential, or source
payload may enter tracked documentation or the redacted receipt.

## Stop Conditions

Stop before an attempt when any required positive gate is absent, the CEO's
visible desktop would be disrupted, Safari is not dedicated and isolated, auth
or permissions are ambiguous, a private boundary cannot be preserved, or a
forbidden surface/fallback would be required.

Stop terminally after an attempt, regardless of confirmation quality. Record
the claim and marker once; do not repair by sending again.

## Closed Gates

- no live run;
- no Safari or Instagram action;
- no upload, preview, or send;
- no source read or DM opening;
- no in-app, Chrome, text, or hybrid route;
- no MailerLite, campaign, CRM, card, Fact Store, ledger, or scoring action;
- no private artifact or operational receipt creation;
- no automation activation;
- no central integration or future live-mission authorization; lane commit and
  push are allowed only after the required no-live validation and review;
- no one-shot token consumer or live executor implementation;
- no reuse of the closed pilot as live authority.

## Completion Boundary

This docs-only adapter is complete when its enums align with the operation
guard and surface matrix, the private-reference regression remains green, and
review confirms that no file or live effect outside the approved hardening
allowlist changed. Operational readiness requires separate integration and a
new future mission with explicit authority.

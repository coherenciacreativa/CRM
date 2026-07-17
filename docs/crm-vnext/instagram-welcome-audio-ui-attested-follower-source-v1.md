# Instagram Welcome Audio UI-Attested Follower Source v1

Date: 2026-07-16

Status: centrally integrated repo-only synthetic vertical-slice contract; no
source or live authority

## Purpose

This contract defines one closed, synthetic source class that carries an
explicitly UI-attested recent-follower observation through the existing welcome
audio preparation rail:

`durable source-less ordinal slot -> adapter -> issuer-private connected preflight one-use capability -> consume/verify capability -> operation guard PRECLAIM -> durable inspection result`

The exact source class is `ui_attested_follower_source_v1`.

Exact adapter schema labels:

- contract: `crm_core_instagram_welcome_audio_ui_attested_follower_source_adapter_v1`;
- input: `crm_core_instagram_welcome_audio_ui_attested_follower_source_input_v1`;
- projection: `crm_core_instagram_welcome_audio_ui_attested_follower_source_projection_v1`; and
- receipt: `crm_core_instagram_welcome_audio_ui_attested_follower_source_receipt_v1`.

The slice proves that a data-only attestation can be admitted to the logical
PRECLAIM boundary. It does not acquire the attestation, open Instagram, inspect
a private artifact, create a real candidate, issue a live claim, or attempt a
send.

A raw closed synthetic input may be assembled before the slot exists, but it is
not an accepted projection. In the connected proof, adapter evaluation and the
projection accepted by preflight occur only after stable readback of the
durable slot. This ordering performs no live source read.

## Historical Truth Boundary

The integrated source-capability gate and its prior fail-closed result remain
unchanged. That result proved zero accessible and verifiable rows on the bounded
accessibility route; it never proved zero followers.

This contract introduces a separate evidence class. It does not rewrite the
prior result, make accessibility rows appear, or relabel the previous source as
`source_capable`.

## Exact Evidence Contract

The adapter may return `ui_attested_source_ready` only when one closed synthetic
observation contains all of the following:

- one explicit recent-follower notification row;
- one visible UI time bucket, preserved as a bucket and never promoted to an
  exact follow timestamp;
- one canonical, fresh `attested_at` for the observation itself that is not
  later than validation time, with zero future-time tolerance;
- one exact identity preserved byte-for-byte across notification and profile;
- one exact profile observation using either the current visible follows-owner
  mode or the bounded recent-event/no-explicit-contradiction mode below;
- one exact thread binding for the same identity and owner;
- one exact owner binding shared by every attested surface; and
- one fresh exact dedupe result that is clear for the candidate/thread/owner
  binding.

The adapter returns `blocked_ui_attested_source` for any missing, unknown,
ambiguous, conflicting, normalized, stale, duplicated, or inferred evidence.
The mere absence of a current follows-owner badge is not conflicting evidence
when the bounded mode is otherwise exact.

### Relationship Evidence Modes

The stronger existing mode is:

- `follows_owner=confirmed`;
- `follows_owner_evidence=explicit_visible_follows_owner_signal`.

The bounded recent-event mode is:

- `follows_owner=recent_follow_event_no_explicit_contradiction`;
- `follows_owner_evidence=exact_recent_follow_notification_profile_binding_visible_3_to_7_day_pilot_bucket`.

The bounded mode is accepted only with the same exact recent-follower event,
exact notification-to-profile identity, exact thread and owner bindings, fresh
dedupe, explicit non-inference, and a preserved visible 3-to-7-day bucket. The
bucket is admitted only when the entire preserved label matches the pilot's
closed inclusive grammar: `3d`/`3 d`-shaped abbreviations, bare plural English
or Spanish day labels, or Spanish `hace` plus a plural day label, with the
single digit limited to 3 through 7. Prefixes, suffixes, modifiers, negations,
signs, decimals, ranges, and surrounding whitespace block. The label is never
converted to an exact follow time; without an exact follow timestamp, the
actual elapsed age remains unknown. Any explicit contradictory relationship
evidence blocks. This temporary catch-up range is not the production freshness
policy; production must adopt a separately reviewed shorter window.

The private projection and `source_evidence_sha256` bind the selected mode. A
ready bounded-mode redacted receipt truthfully keeps
`follows_owner_confirmed=false`; readiness means the complete relationship
evidence mode is sufficient, not that a current profile badge was visible.

Every accepted input and ready projection fixes these three evidence
non-claims false:

- `exact_follow_timestamp_claimed=false`;
- `provider_event_id_claimed=false`; and
- `campaign_membership_claimed=false`.

`attested_at` is the time at which the UI evidence was observed. It is not
`followed_at`. The visible bucket remains the only source-time claim. Any
`attested_at` later than validation time blocks immediately; there is no clock
skew allowance, grace interval, or future-time tolerance.

## Forbidden Fabrication

The adapter, preflight, durable inspection seam, and operation guard must never
fabricate or infer:

- `followed_at` or any exact follower timestamp;
- a provider event ID or provider account ID;
- campaign identity, campaign membership, campaign interval, or Ads
  provenance;
- a profile, thread, owner, or dedupe binding absent from the attestation; or
- an exact identity derived through trimming, case folding, Unicode folding,
  alias handling, or any other normalization.

The source event anchor is derived only from the closed attestation projection.
It is not evidence that a provider ID exists.

## Closed Synthetic Pipeline

### 1. Durable Source-Less Ordinal Slot

Before adapter, preflight, or guard evaluation, the synthetic store claims only
the exact next inspection ordinal with
`ui_attested_inspection_slot_claimed_no_source`. The slot is owner-only,
source-less, and durable. It contains ordering evidence only; it does not
contain a source observation, candidate, live claim, or effect authority.

The next ordinal cannot be allocated while the latest slot lacks its inspection
result. Claiming a slot does not advance source execution, live authority, or
send authority.

### 2. Adapter

The adapter accepts a plain, closed-key, data-only synthetic observation. It
produces one immutable private projection plus an aggregate redacted receipt.
The connected issuer invokes it internally only after stable durable-slot
readback; callers cannot supply a prebuilt projection to that connected API.

Exact decisions:

- `ui_attested_source_ready`
- `blocked_ui_attested_source`

A ready projection fixes `source_class=ui_attested_follower_source_v1` and
preserves the UI bucket, `attested_at`, exact bindings, and dedupe evidence
without adding live authority.

The input, projection, and aggregate receipt use only the exact schema labels
defined above. The adapter does not relabel a UI bucket as an exact time,
invent a provider event, or attribute the observation to a campaign.

### 3. Issuer-Private Connected Preflight One-Use Capability

After stable readback of the durable slot, the claim issuer verifies the exact
mission, contract, ordinal, claim nonce, slot-record digest, and slot-record
metadata, including the exact `inspection_capability_expires_at_ms` in the
opaque slot binding. Only then may its private bridge issue the connected
one-use source capability for the exact internally-created ready projection.
Its decision remains one of:

- `validated_private_input`
- `blocked_private_input`

The standalone public synthetic preflight API remains available for isolated
projection validation, but capabilities issued by that public path are
intentionally not accepted by the connected inspection-record path. The
issuer-private bridge and its opaque exact slot binding are the causal
authority. Caller-supplied timestamps remain freshness and expiry checks only;
they cannot create, reorder, or substitute for causal authority.

The redacted receipt may state `ui_attested_source_bound=true` and
`private_ui_attested_source_capability_issued=true` only for a valid synthetic
projection issued through that connected bridge. This capability is a one-use
in-process proof capability for the repo-only inspection path. It is not a
live-claim capability and is never serialized.

Every preflight result fixes:

- `live_authority=false`
- `live_claim_issued=false`

### 4. Consume and Verify Capability

The connected one-use synthetic source capability is consumed and verified
against the exact mission, source projection, bindings, dedupe anchor, durable
slot binding, mode, and freshness boundary. A public-standalone, forged, stale,
replayed, cross-bound, or already consumed capability blocks before the
operation guard. This step issues no live claim capability and cannot be reused
as a send token.

### 5. Operation Guard PRECLAIM

The operation guard evaluates the exact adapter/preflight lineage and operation
snapshot after the one-use capability has been consumed and verified. It does
not inspect or rely on a pre-existing durable inspection result.

The maximum successful proof is the guard's logical PRECLAIM result:

- guard phase: `preclaim_eligible`;
- guard decision: `eligible_for_atomic_claim`;
- `claim_allowed=true`;
- `send_ready=false`; and
- `send_allowed=false`.

`claim_allowed=true` is a pure validation result. It does not issue, persist, or
consume a live claim and cannot be used as a send token.

### 6. Durable Inspection Result

The synthetic inspection seam may use only an owner-only temporary test fixture
and records the result only after the operation guard returns the exact logical
PRECLAIM success above. Its exact state decisions are:

- `ui_attested_inspection_slot_claimed_no_source`
- `ui_attested_inspection_preclaim_recorded`

The durable result is inspection evidence only. It may record:

- `guard_preclaim_valid`;
- `operation_guard_phase=preclaim`; and
- `operation_guard_decision=eligible_to_claim`.

It must not publish a live claim, pending-effect record, terminal-effect record,
candidate artifact, or browser/source observation.

### Restart-Safe Rehydrate/Reopen

If a process stops after the source-less slot is durable but before its result
is durable, a verified restart may rehydrate and reopen only that same
incomplete slot. Reopen requires a stable valid slot, exact mission/contract/
source-class/ordinal binding, confirmed absence of a result for that ordinal,
and expiration of the original inspection-capability TTL. The reopened
capability receives its own exact `inspection_capability_expires_at_ms` binding.
Reopen neither writes a second slot nor advances the ordinal cursor.

The reopened path re-reads the durable slot and resumes the same adapter ->
issuer-private connected preflight -> one-use capability consume/verify ->
operation guard PRECLAIM -> durable-result sequence. Exclusive result
publication and existing identity/source-evidence dedupe prevent a duplicate
result. Rehydrate/reopen creates no source read, candidate, live claim,
authority, browser/network action, or send effect.

## Required Claim Separation

The adapter input and projection keep the three evidence non-claims fixed:
`exact_follow_timestamp_claimed=false`, `provider_event_id_claimed=false`, and
`campaign_membership_claimed=false`.

Every synthetic vertical-slice result fixes these three fields false:

- `live_claim_issued=false`
- `private_live_claim_capability_issued=false`
- `live_claim_record_persisted=false`

No live claim function is invoked. No claim, pending, attempted, or terminal
artifact is created.

## Redacted Receipt Boundary

Public receipts may contain only closed decisions, source-class labels,
aggregate counts, stable blocker codes, booleans, and non-private contract
versions. They must never expose identities, handles, profile or thread
references, owner references, UI text, time-bucket text copied from a private
surface, timestamps, anchors, digests, screenshots, OCR output, messages,
tokens, credentials, or raw payloads.

## Non-Effects

This contract provides no authorization or capability for:

- Safari, Chrome, in-app browser, Instagram, Computer Use, accessibility reads,
  screenshots, or real OCR;
- live UI observation or source execution;
- private artifact reads or writes;
- real candidates, queues, staging bundles, or candidate persistence;
- durable live claims or private live-claim capabilities;
- host, executor, actuator, picker, attachment, upload, or Send;
- audio, text, follow-back, reactions, comments, or resends;
- MailerLite, CRM, campaign, Ads, API, or proxy access; or
- browser, network, provider, or external effects.

Every result fixes `live_authority=false`, `send_allowed=false`,
`external_effect_invoked=false`, `browser_used=false`, and
`network_used=false`.

## Later Live Boundary

Even after a green central integration, live use remains forbidden. A later
mission needs a separate exact CEO approval bound to the integrated commit,
source route, private input labels, candidate cap, UI actions, claim boundary,
send boundary, and stop rules.

## No-Live Canary Packet Draft Boundary

A separately approved materializer may later accept exactly one already
supplied owner-only projection as data-only input and prepare one owner-only
`prepared_no_live_unapproved` packet draft. That downstream step does not
acquire the observation, reopen the adapter's synthetic proof, or add source,
candidate, claim, send, or live authority.

The materializer must preserve `exact_follow_timestamp_claimed=false`,
`provider_event_id_claimed=false`, and `campaign_membership_claimed=false`. It
must not convert the visible UI bucket into `followed_at`, an exact campaign
interval, or campaign membership. Its draft uses a schema and filename distinct
from every execution approval and remains unusable by the live runtime.

The controlling downstream contract is
`docs/crm-vnext/instagram-welcome-audio-ui-attested-canary-packet-materializer-v1.md`.

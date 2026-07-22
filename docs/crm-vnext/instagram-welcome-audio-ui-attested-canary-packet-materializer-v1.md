# Instagram Welcome Audio UI-Attested Canary Packet Materializer v1

Date: 2026-07-16
Status: `pure_no_live_implementation_green_reviewed`

## Purpose

Define a local, owner-only materialization boundary for one already supplied
closed UI-attested follower input and one already approved welcome-audio
binding. The materializer invokes the existing pure adapter internally and
prepares one deterministic canary packet draft without acquiring source
evidence or creating any execution authority.

The exact draft is deliberately non-executable:

- contract: `crm_core_instagram_welcome_audio_ui_attested_canary_packet_materializer_v1`;
- draft: `crm_core_instagram_welcome_audio_ui_attested_canary_packet_draft_v1`;
- receipt: `crm_core_instagram_welcome_audio_ui_attested_canary_packet_materializer_receipt_v1`;
- status: `prepared_no_live_unapproved`; and
- candidate cap: `1`.

## Inputs

The pure route accepts one closed owner-only input set and no source callback:

1. one raw closed UI-attested input matching the existing adapter schema; the
   materializer creates and validates its immutable projection internally;
2. one caller-declared opaque no-live authorization reference plus declared
   mission, contract, repository, cap, and external-effect fields;
3. one caller-declared protected-audio binding record whose path remains
   private and whose digest is structurally valid; and
4. one caller-declared central-repository provenance value.

The materializer accepts notification evidence only as closed data fields of
that exact adapter input. It does not accept screenshots, OCR output, browser
state, callbacks, functions, accessors, a caller-supplied projection, a
prebuilt execution approval, or a live capability.

## Trust Boundary

This pure function performs structural validation and bit-for-bit provenance
binding only. It has no trusted approval registry, repository reader, audio
reader, or externally supplied expected-value tuple, so it does not
authenticate that the declared authorization is genuine or current, that the
declared repository value is the current central HEAD, or that the declared
audio digest matches bytes on disk. Those checks belong to the later live
authority mission.

Accordingly, `exact_binding_preserved=true` in the aggregate receipt means
only that the structurally valid caller-declared values and the internally
adapted source projection are frozen into the deterministic draft without
normalization. It is not an approval, freshness, repository, or asset-validity
attestation.

## Evidence Boundary

The draft preserves the UI-attested source contract exactly. It may bind the
projection's private digest and anchors, but it must keep these non-claims
false:

- `exact_follow_timestamp_claimed=false`;
- `provider_event_id_claimed=false`; and
- `campaign_membership_claimed=false`.

The materializer does not emit the current exact-time sealed backlog manifest
and does not assert that a relative UI bucket proves an exact follow timestamp
or paused-campaign membership. It records only that one exact UI-attested
projection is prepared for a later decision boundary.

## Draft Contents

The owner-only draft may contain only the private forms of:

- materializer, draft, source-projection, and audio schema versions;
- caller-declared mission, contract, repository, and opaque authorization
  provenance values preserved without normalization;
- one deterministic operation identifier and ordinal;
- exact projection, candidate, thread, owner, dedupe, and audio bindings;
- candidate and future-attempt caps fixed to one;
- a registry precondition stating that empty-or-valid state must be checked
  again by a later live mission; and
- fixed false authority and effect flags.

It must not contain or create a claim token, claim nonce, pending state,
terminal state, execution permit, live approval, MailerLite operation, response
observer, or send instruction.

## Pure Draft Boundary

The materializer validates the supplied closed data and produces one deeply
immutable deterministic private draft plus one aggregate redacted receipt. It
does not read or write the filesystem and does not open or copy the approved
audio. A later filesystem edge must revalidate the exact audio bytes and apply
owner-only, no-follow, single-link, stability, and atomic-publication rules.

The draft must remain outside the fixed live-authority and claim-store roots.
Its filename and schema must be distinct from every live execution approval.
No code path may copy, rename, promote, or reinterpret the draft as live
authority.

## Decisions

- `prepared_no_live_unapproved`: one exact immutable draft was returned;
  every live and effect flag remains false.
- `blocked_no_live_unapproved`: no private draft was returned; one or more
  aggregate blocker codes explain the fail-closed class.

The public receipt may expose only schema labels, decision, candidate count,
cap, validation booleans, fixed false authority/effect flags, and stable blocker
codes. It must never expose private identities, UI text, time buckets,
timestamps, paths, anchors, digests, messages, screenshots, or payloads.

## Required Non-Effects

Every result fixes:

- `source_execution=false`;
- `canary_ready=false`;
- `production_ready=false`;
- `execution_approval_published=false`;
- `registry_written=false`;
- `claim_issued=false`;
- `pending_effect_recorded=false`;
- `send_allowed=false`;
- `live_authority=false`;
- `browser_used=false`;
- `network_used=false`; and
- `external_effect_invoked=false`.

## Rejection Rules

Block without draft creation for malformed, extra-field, stale, or cross-bound
raw source input; an invalid internally adapted projection; malformed or
mismatched declared binding fields; a live schema, status, capability, or root;
any request to infer exact follow time or campaign membership; or any request
to write a registry, claim, or effect state. After draft creation, mutation of
the projection or any declared binding value invalidates the deterministic
operation identifier.

## Runtime Boundary

The existing live preflight does not consume this draft. The existing live
claim store, Safari host, operation session, MailerLite route, and campaign
surfaces are not invoked or modified. A later exact mission must freshly
validate the then-current repo, source, manifest policy, audio, registry,
dedupe, caps, surface, and CEO approval before it may create a separate live
execution record.

## Validated Source Artifact Input

The separately versioned UI-attested follower-source artifact materializer may
produce one immutable owner-only artifact containing this materializer's exact
raw `ui_attested_input`. A private caller may pass that field unchanged into
this pure function. This does not widen the trust boundary: the canary packet
materializer still validates the input through the existing adapter and still
returns only `prepared_no_live_unapproved`.

The source artifact is not a packet draft, approval, claim, PENDING record,
upload permit, or Send token. Its controlling contract is
`docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-artifact-materializer-v1.md`.

## Controlling IAB Semantic Draft v2 Extension — 2026-07-19

The productive downstream provenance edge is now the IAB semantic canary
packet materializer v2. The v1 raw `ui_attested_input` API above remains
compatibility-only, always no-live, and never emits a draft-admission
capability.

Exact v2 labels are:

- contract:
  `crm_core_instagram_welcome_audio_iab_semantic_canary_packet_materializer_v2`;
- request:
  `crm_core_instagram_welcome_audio_iab_semantic_canary_packet_request_v2`;
- draft: `crm_core_instagram_welcome_audio_iab_semantic_canary_packet_draft_v2`;
  and
- receipt:
  `crm_core_instagram_welcome_audio_iab_semantic_canary_packet_materializer_receipt_v2`.

### Exact Productive Input

`materializeWelcomeAudioIabSemanticCanaryPacketDraftOnce` accepts exactly:

- `private_source_artifact_capability`; and
- `packet_request`.

The capability is the only permitted source of identity, notification,
profile, thread, owner, time bucket, relationship, dedupe, history, composer,
attachment, challenge, and source-expiry evidence. The packet request retains
only the non-source metadata required by the existing downstream rail:
mission, contract, repository HEAD, authorization reference, caps, and approved
audio binding. It cannot supply or override any source fact.

The source artifact capability is consumed burn-first, before request
validation. A bad request, cross-mission request, later projection failure, or
draft failure cannot restore or replay it. The request fixes candidate and
future-attempt caps to one and keeps both execution and external-effect
authorization false.

Production owns the clock. `now_ms` exists only on
`materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceForTest` and cannot be
used by the production entrypoint.

### Draft v2 and Original Expiry

The v2 materializer internally re-adapts the exact v3 artifact input, validates
the resulting projection, and creates one immutable draft. The draft preserves
all existing downstream v1 fields and adds exactly:

- `source_artifact_schema_version`, fixed to the IAB semantic artifact v3; and
- `source_expires_at`, copied exactly from that artifact.

The materializer never extends, resets, rounds, or replaces the source expiry.
It must still be in the future when the draft is built and consumed. Both new
fields enter the deterministic operation hash, so changing or purportedly
renewing expiry invalidates the draft.

The existing general draft validator dispatches by exact schema and accepts v1
or v2. This permits the unchanged downstream hashing and PRECLAIM components to
validate the complete v2 draft. It does not permit raw v2 construction into
the fixed runner: the productive runner accepts only the opaque admission
capability below.

### One-Use Draft Admission

A successful v2 result contains the owner-only private draft, aggregate
receipt, and one opaque
`private_draft_admission_capability`. The capability is WeakMap-backed,
one-use, and carries the exact draft plus the inherited expiry without
serializing either.

`consumeWelcomeAudioIabSemanticCanaryDraftAdmissionCapabilityOnce` accepts
exactly `{ private_draft_admission_capability }`. It burns authority before
checking expiry or revalidating the complete draft. It returns exactly
`{ private_draft }` once or `null`. Replay, clone, foreign capability, stale
expiry, tampering, malformed wrapper, or cross-module use returns `null`.

Synthetic and productive admission modes are disjoint. The productive
consumer burns and rejects a synthetic admission. The explicit
`consumeWelcomeAudioIabSemanticCanaryDraftAdmissionCapabilityOnceForTest`
consumer accepts only synthetic admissions and burns and rejects productive
ones. A wrong-mode attempt is terminal for that capability; it cannot be
retried through the other consumer.

Admission capabilities expose only a payload-free clone guard. They are
literally noncloneable and nonserializable: `structuredClone` and JSON
serialization fail without revealing the private draft or its inherited
source facts.

The fixed runner separately requires its existing private authorization seed.
The admission capability does not contain, replace, or mint that seed. It is
source-provenance admission only and remains insufficient for live authority,
claim, PENDING, upload, or Send.

### v2 Receipt and Non-Effects

The aggregate receipt reports only decision, count/cap, closed progress
booleans, fixed false live/effect flags, and one blocker code. It never exposes
identity, references, bucket, observation time, expiry, path, digest, audio
binding, message, DOM, screenshot, credential, or payload.

`source_artifact_capability_consumed` is a monotonic statement that the expected
source-artifact consumer actually returned `private_artifact`; it does not mean
merely that a capability was presented. It is false when the outer wrapper is
rejected before internal entry or when the consumer rejects, throws, returns no
private artifact, or detects a foreign, stale, replayed, wrong-mode, or
wrong-family capability. Once the consumer returns `private_artifact`, the field
remains true in every later blocked receipt. No later blocker may reset it.

The ordinary v2 receipt shape remains unchanged and has no separate terminal-
retirement field. A recognized same-module wrong-family or cross-mode
presentation can therefore report `source_artifact_capability_consumed=false`
even though the one-use consumer has terminally burned that known authority.
That burn is proven by the consumer's replay rejection, not by reinterpreting
the existing consumption field or adding a key to the ordinary contract. An
unknown capability or one from a separate module instance carries no such
retirement claim and may remain usable by its own issuer.

Prepared receipts require this consumption field true. `INPUT_SCHEMA` is now
reserved for rejection of the exact outer wrapper before internal entry and
therefore requires the field false. The source-artifact-capability blocker also
requires false because no private artifact was admitted. A malformed synthetic
clock discovered after successful capability admission uses the distinct
`CLOCK_INVALID_AFTER_SOURCE_ARTIFACT_CONSUMPTION` blocker and requires the
field true. Every other downstream blocker likewise requires true; no later
validation may erase the completed admission.

The test-only clock must be a safe integer inside the JavaScript Date range.
Negative, fractional, non-finite, or out-of-range values are post-consumption
clock failures, never pre-entry input failures. Replaying the same capability
after such a failure returns the source-artifact-capability blocker and cannot
re-enter the chain.

All other completion milestones remain false for every blocked decision and
true only for a prepared decision. The receipt validator is blocker-aware: a
pre-consumption blocker with consumption true, a post-consumption blocker with
consumption false, or any promoted completion/live flag is invalid. This v2
receipt refinement does not alter any legacy v1 input, receipt, validation, or
no-live behavior.

Every v2 materialization fixes source execution, canary readiness, production
readiness, approval publication, registry write, claim, pending effect, Send,
live authority, browser, network, and external effect false. It performs no
Browser or Safari action, reads no live source, writes no registry, opens no
file chooser, and invokes no external effect.

### Atomic Truthfulness Closure Boundary

This correction belongs to the single repo-only truthfulness closure approved
for the IAB semantic handoff branch. It adds no export, backend, capability,
authority, browser path, source access, Stage 2/3 permission, integration
permission, or live effect. The Chief Architect authorization for this closure
permits implementation and repository validation only; a later integration or
real-stage decision remains separate.

## 2026-07-22 Historical v3 Packet Amendment

Historical source admission uses a separate packet v3 family. Packet v2 keeps
its ordinary behavior unchanged and accepts only the ordinary source-artifact
v3 capability. Packet v3 accepts only the historical source-artifact v4
capability. A cross-family capability recognized by the same artifact-module
instance is burned and cannot be retried through the other consumer; the replay
test proves that behavior. A capability issued by a separate module instance is
only foreign to this consumer and can remain usable by its original issuer, so
the packet receipt must not infer retirement from a null consumer result.

Historical v3 adds the separate aggregate field
`source_artifact_capability_retirement_attested`. It is a conservative
attestation, not a guess about a foreign registry: it is true only when the
expected consumer returned `private_artifact`, and it remains true through all
later blocked phases. Whenever the consumer returns null—including foreign,
wrong-family, stale, or replayed presentation—the receipt reports
`consumed=false` and `retirement_attested=false`. Pre-entry input rejection also
keeps both false. Same-module cross-family burn is evidenced separately by
replay rejection; a separate-module capability remains consumable by its
issuer. This new field belongs only to the historical v3 receipt; it does not
alter ordinary v2 keys or validation. The v3 draft binds all existing exact
source and approved-audio fields plus:

- `selection_policy=historical_catchup_pilot_v1`;
- exact private `age_evidence_raw`;
- `age_evidence_kind`;
- `age_bucket`;
- `actual_elapsed_age_claimed=false`; and
- the historical v4 artifact schema and inherited source expiry.

These fields participate in deterministic operation identity and draft
validation. Policy, age evidence, classification, expiry, or relationship
tampering fails closed after source-artifact capability consumption. The
packet does not derive an exact elapsed age, follow timestamp, or campaign
membership claim.

The v3 result remains inert: readiness, approval publication, registry write,
claim, PRECLAIM, pending effect, Send, live authority, browser, network, and
external effect are fixed false. Its draft-admission capability is opaque,
noncloneable, nonserializable, process-local, and one-use, with production and
test registries kept disjoint. This amendment grants no runner or live
authority.

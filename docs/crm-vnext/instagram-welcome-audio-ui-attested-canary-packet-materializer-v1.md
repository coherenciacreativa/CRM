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

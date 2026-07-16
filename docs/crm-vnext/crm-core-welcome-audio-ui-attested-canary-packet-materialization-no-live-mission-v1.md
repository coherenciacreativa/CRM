# CRM Core Welcome Audio UI-Attested Canary Packet Materialization No-Live Mission v1

Date: 2026-07-16

- `mission_id`:
  `crm_core_welcome_audio_ui_attested_canary_packet_materialization_no_live_v1_20260716`
- `mode`: `repo_only_no_live_materialization_proof`
- `status`: `completed_green_reviewed_awaiting_central_integration`
- `approved_baseline`:
  `ada5db2df1d79bbb0b1c97de10f0f23562dea506`
- `source_branch`:
  `codex/crm-core-ui-attested-canary-materializer-v1-20260716`

## Objective

Implement and prove one pure local materializer that accepts exactly one
already supplied, owner-only UI-attested follower input plus one already
validated welcome-audio binding and deterministically prepares one immutable
owner-only canary packet draft. The draft is planning evidence only. It is not an execution approval,
cannot issue a capability or claim, and cannot be consumed by the live runtime.

This mission does not acquire source evidence. It does not open Safari,
Instagram, a profile, a thread, or any other UI. If the exact private inputs do
not already exist and validate, the materializer must return only a blocked
aggregate receipt.

## Exact Eight-File Allowlist

Only these files may change during implementation:

1. `scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs`
2. `__tests__/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.spec.ts`
3. `docs/crm-vnext/crm-core-welcome-audio-ui-attested-canary-packet-materialization-no-live-mission-v1.md`
4. `docs/crm-vnext/instagram-welcome-audio-ui-attested-canary-packet-materializer-v1.md`
5. `docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-v1.md`
6. `docs/crm-vnext/instagram-welcome-audio-authority-bundle-builder-v1.md`
7. `docs/crm-vnext/crm-core-next-action.md`
8. `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`

Any required change outside this allowlist stops the mission pending a new
exact approval.

## Required Inputs

The pure materializer may accept only one closed owner-only input set containing:

- one raw closed UI-attested input matching the existing adapter schema; the
  materializer invokes `adaptWelcomeAudioUiAttestedFollowerSource` internally
  and accepts only its exact validated projection;
- one structurally valid caller-declared opaque authorization reference plus
  declared mission, contract, candidate cap of one, and external-effect
  prohibition; the materializer does not authenticate that reference;
- one caller-declared audio identifier, digest, and explicit revalidation
  evidence record; the pure materializer never opens the underlying file and
  does not verify its bytes; and
- one caller-supplied central-repository value used only as immutable draft
  provenance; the materializer does not read Git or attest that it is current.

The mission-level approval and approved baseline above govern this repository
work. They are not derived from, or authenticated by, the materializer's
caller-supplied packet request.

The internally produced projection must preserve:

- `exact_follow_timestamp_claimed=false`;
- `provider_event_id_claimed=false`; and
- `campaign_membership_claimed=false`.

The materializer must not convert a visible time bucket into `followed_at`,
claim membership in the paused campaign, or satisfy the existing exact-time
sealed-manifest contract by inference.

## Observable Success

A green synthetic proof must demonstrate all of the following:

- exactly one valid projection enters and exactly one deterministic operation
  draft leaves;
- the candidate cap is fixed at one and cardinality zero or greater than one
  blocks;
- the exact projection digest and identity/thread/owner/dedupe anchors are
  frozen without exposing their private values;
- the caller-declared mission, contract, repository, authorization reference,
  audio identifier, audio digest, and revalidation-evidence fields are
  preserved bit for bit without claiming they were externally authenticated;
- the packet status is `prepared_no_live_unapproved`;
- the draft remains outside the fixed live-authority root and uses a filename
  and schema that cannot be mistaken for `execution-approval-v1.json`;
- no operation-registry entry, live-claim record, pending record, terminal
  record, reply observer state, or MailerLite packet is created;
- the returned private draft is deeply immutable and deterministic; durable
  owner-only publication remains a later, separately approved filesystem edge;
- the public receipt contains only aggregate allowlisted fields; and
- `source_execution=false`, `canary_ready=false`, `production_ready=false`,
  `live_authority=false`, `claim_issued=false`, `send_allowed=false`,
  `browser_used=false`, `network_used=false`, and
  `external_effect_invoked=false` on every path.

## Forbidden Scope

- Safari, Chrome, in-app browser, Instagram, Computer Use, OCR, screenshots,
  accessibility reads, profile/thread access, or any source acquisition;
- creation or modification of an exact-time campaign manifest;
- publication, copying, renaming, or simulation of
  `execution-approval-v1.json` or any equivalent live-authority record;
- opening or modifying the fixed live-authority root;
- operation-registry writes, claim-store writes, PRECLAIM, claims, pending or
  terminal effect records;
- host, executor, actuator, file picker, attachment, upload, preview, Send,
  text, follow-back, reaction, comment, retry, or resend;
- MailerLite, CRM, campaign, Ads, API, proxy, network, or external effects;
- tracked private values, paths, timestamps, anchors, digests, identities,
  messages, screenshots, or payloads; and
- any file outside the exact allowlist.

## Fail-Closed and Atomicity Rules

Missing, stale, malformed, ambiguous, normalized, duplicated, extra-field, or
cross-bound source evidence blocks before draft creation. Malformed declared
provenance blocks as input; after creation, mutation of the projection or any
declared provenance value invalidates the deterministic operation binding.
Failure returns no private draft and exposes only a stable aggregate blocker
code.

## Validation and Review Gate

Implementation requires deterministic positive, negative, adversarial,
privacy, immutability, import-inertness, and compatibility tests. Run the new
focused test plus the existing UI-attested adapter, authority builder, live
preflight, live-claim issuer, operation guard, Safari host, and welcome-audio
compatibility suites without modifying those runtime modules.

One independent reviewer must return green with no unresolved P0-P2 finding
before at most one serialized central integration under the established lock.
Review and integration remain repo-history effects only.

Final lane evidence: focused materializer validation `16/16`, required
seven-file welcome-audio compatibility validation `429/429`, syntax and diff
checks green, exact eight-file allowlist preserved, and independent review
GREEN with no unresolved P0-P2 finding.

## Stop Conditions

Stop if the materializer would need to acquire a source, infer exact follow
time or campaign membership, mutate a registry or claim store, create live
authority, touch a UI, widen the candidate cap above one, alter a runtime
module, or expose a private value.

## Approval Meaning

Alejandro's current `adelante` authorizes this exact eight-file, pure no-live
implementation, its tests, independent review, and at most one serialized
central integration if every gate is green. It does not authorize private
input acquisition, filesystem publication, source action, canary, claim, send,
or any live effect. Even after a green implementation, a later separately
approved mission must
materialize fresh execution authority before any real canary can run.

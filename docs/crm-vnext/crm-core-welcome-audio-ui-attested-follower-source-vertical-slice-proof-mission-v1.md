# CRM Core Welcome Audio UI-Attested Follower Source Vertical Slice Proof Mission v1

Date: 2026-07-16

- `mission_id`:
  `crm_core_welcome_audio_ui_attested_follower_source_vertical_slice_proof_v1_20260716`
- `mode`: `proof`
- `status`: `completed_green_integrated_repo_only_synthetic_no_source_authority`
- `authorization_phrase`: `adelante`
- `approved_baseline`:
  `3dcbe0d37589c11130c855ed6c71ffaf2970d2b2`
- `source_branch`:
  `codex/crm-core-welcome-audio-ui-attested-source-v1-20260716`
- `source_commit`:
  `04cb67f0a57931a5ef3bf7f2518bcee5b309d3be`
- `central_integration_status`:
  `completed_no_live_git_history_authoritative`
- `target_branch`: `codex/crm-core-reentry`
- `proof_sequence`:
  `durable source-less ordinal slot -> adapter -> issuer-private connected preflight one-use capability -> consume/verify capability -> operation guard PRECLAIM -> durable inspection result`

## Business Outcome

Implement and prove one connected repo-only vertical slice that first claims a
durable source-less ordinal slot, then internally adapts a raw closed synthetic
UI-attested follower input, issues and consumes/verifies one issuer-private
connected preflight capability, reaches the operation guard's logical PRECLAIM
admission, and only then records the durable inspection result, without
creating any live source, claim, candidate, or send effect. The raw input may
exist before the slot; adapter evaluation and the accepted projection may not.

This closes the disconnected-gate gap. It does not prove that a real UI source
is currently available and does not execute a real canary.

## Exact Twelve-File Allowlist

Only these twelve tracked files may change:

1. `scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs`
2. `__tests__/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.spec.ts`
3. `scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs`
4. `__tests__/crm-vnext-instagram-welcome-audio-operation-guard.spec.ts`
5. `scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs`
6. `__tests__/crm-vnext-instagram-welcome-audio-live-preflight.spec.ts`
7. `scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs`
8. `__tests__/crm-vnext-instagram-welcome-audio-live-claim-issuer.spec.ts`
9. `docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-v1.md`
10. `docs/crm-vnext/crm-core-welcome-audio-ui-attested-follower-source-vertical-slice-proof-mission-v1.md`
11. `docs/crm-vnext/crm-core-next-action.md`
12. `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`

Any required change outside this list stops the mission pending a new exact
approval.

## Observable Success

The mission is green only when all of the following are proven with synthetic
data:

- the adapter returns only `ui_attested_source_ready` or
  `blocked_ui_attested_source`;
- a ready projection fixes `source_class=ui_attested_follower_source_v1`;
- the adapter uses only
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_adapter_v1`,
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_input_v1`,
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_projection_v1`,
  and
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_receipt_v1`;
- readiness requires one explicit follower-notification row, one preserved
  visible UI bucket, fresh `attested_at` that is not later than validation time
  with zero future tolerance, exact notification/profile identity, confirmed
  follows-owner, exact thread and owner bindings, and fresh exact dedupe;
- missing, stale, inferred, normalized, duplicated, conflicting, or ambiguous
  evidence blocks before preflight;
- no layer fabricates `followed_at`, a provider ID, or campaign evidence;
- `exact_follow_timestamp_claimed=false`,
  `provider_event_id_claimed=false`, and
  `campaign_membership_claimed=false` at the adapter root and projection;
- the exact next source-less ordinal slot is durable before adapter evaluation,
  and an incomplete prior slot blocks allocation of the next ordinal;
- raw closed synthetic input may exist before the slot, but the connected API
  rejects a caller-supplied projection and performs adapter evaluation itself
  only after stable durable-slot readback, with no live source read;
- only after stable durable-slot readback and exact mission, contract, ordinal,
  claim-nonce, slot-record-digest, and slot-record-metadata binding may the
  issuer-private bridge emit a connected one-use synthetic UI-attested source
  capability with no live authority; the exact binding also includes
  `inspection_capability_expires_at_ms`;
- standalone public synthetic preflight capabilities are intentionally not
  accepted by the connected inspection-record path;
- timestamps are freshness and expiry checks only, never causal authority or a
  substitute for the issuer-private bridge and exact durable-slot binding;
- that capability is consumed and verified against the exact projection,
  bindings, dedupe, ordinal, mode, and freshness before the operation guard;
- the operation guard recognizes the new source class only through its exact
  adapter/preflight/capability lineage and preserves every existing shared gate;
- a full synthetic success reaches guard `preclaim_eligible` /
  `eligible_for_atomic_claim` with `claim_allowed=true`, while
  `send_ready=false` and `send_allowed=false`;
- only after that exact guard success may the durable inspection result record
  `guard_preclaim_valid=true`, the PRECLAIM phase, and the eligible decision;
- a verified restart can rehydrate and reopen the same incomplete durable slot
  only after the original inspection-capability TTL expires, without creating
  another slot or result, advancing the ordinal, or adding source/live/send
  authority;
- the exact adapter output is consumed by the connected slot/preflight/
  capability/guard/result path; matching enum strings in disconnected tests is
  insufficient;
- `live_claim_issued=false`,
  `private_live_claim_capability_issued=false`, and
  `live_claim_record_persisted=false` on every path;
- `live_authority=false`, `external_effect_invoked=false`,
  `browser_used=false`, and `network_used=false` on every path;
- all cross-class, cross-binding, replay, tamper, stale, extra-field, malformed,
  privacy, and receipt tests fail closed;
- existing recent-follower, sealed-backlog, preflight, claim-issuer, operation
  guard, and welcome-audio compatibility tests remain green; and
- one independent reviewer returns green with no unresolved P0-P2 finding.

The technical outcome is a connected synthetic PRECLAIM proof. The product
outcome remains `not_verified`: no real follower source, candidate, claim, or
audio delivery is produced.

## Approved Scope

- read the authoritative repo and exact allowlisted implementation/contracts;
- implement only the source-less ordinal slot, pure adapter, issuer-private
  connected preflight one-use capability, capability verification/consumption,
  operation guard PRECLAIM, post-guard durable inspection result, and
  restart-safe incomplete-slot reopen;
- add deterministic synthetic unit, adversarial, compatibility, and connected
  vertical-slice tests;
- use owner-only temporary test fixtures with synthetic values only;
- update only the four allowlisted contracts/routing files;
- perform mechanical or safe test repairs within the repair budget;
- obtain one independent adversarial review; and
- after exact allowlist, privacy, validation, and review gates are green,
  perform at most one central integration under the established lock.

## Autonomy and Repair Budget

- `max_elapsed_minutes`: 120
- `max_repair_cycles`: 3
- `max_new_real_targets_people_sources_or_effects`: 0
- `routine_CEO_interruptions`: 0
- `independent_review_count`: 1
- `central_integration_count`: at most 1

Allowed repairs are mechanical schema repair, safe test repair, receipt-format
repair, and pre-effect route repair inside the exact allowlist. Scope
broadening, privacy changes, real source access, live claim issuance, and any
possible effect retry are forbidden.

## Forbidden Scope

- every file outside the exact twelve-file allowlist;
- legacy Instagram documents, private artifacts, or raw private values;
- Safari, Chrome, in-app browser, Instagram, Computer Use, accessibility output,
  screenshots, or real OCR;
- live UI or source execution;
- real candidates, candidate queues, private staging, or CRM writes;
- any durable live claim, claim publication, private live-claim capability,
  pending effect, attempted effect, or terminal effect;
- host, executor, actuator, native picker, attachment, upload, preview, or Send;
- audio, text, follow-back, reactions, comments, retries, or resends;
- MailerLite, campaign, Ads, API, proxy, or network access;
- fabricated `followed_at`, provider identifiers, campaign identity,
  membership, interval, or provenance;
- weakening the prior source-capability gate or rewriting its historical
  fail-closed result; and
- publication of live execution approval or canary readiness.

## Stop Conditions

Stop without integration if:

- any required evidence or binding needs inference or normalization;
- the source class cannot remain an exact closed branch;
- the adapter output cannot be consumed end-to-end without a manual copy or
  disconnected fixture reconstruction;
- a result can appear before guard success, a restart can advance the ordinal,
  or rehydrate/reopen can duplicate a slot or result;
- any claim flag can become true in this proof;
- a private value could enter a tracked file or redacted receipt;
- host, executor, browser, network, real source, or live claim capability is
  required;
- an existing source class or guard path regresses;
- a file outside the allowlist changes;
- the repair budget is exhausted; or
- independent review is not green.

## Independent Review Contract

One reviewer independent from implementation must verify:

- the exact slot -> adapter -> issuer-private connected preflight capability ->
  consume/verify -> guard PRECLAIM -> durable-result observable order;
- durable-slot readback plus exact mission/contract/ordinal/nonce/digest/
  metadata/`inspection_capability_expires_at_ms` binding before connected
  capability issuance, public standalone capability rejection, and timestamps
  used only for freshness;
- exact source-class and decision closure;
- fresh attestation and exact identity/profile/follows-owner/thread/owner/dedupe
  conjunction;
- absence of fabricated time, provider, and campaign evidence;
- all three adapter evidence non-claims fixed false at root and projection;
- private capability separation from every live-claim capability;
- the three false live-claim flags on every path;
- canonical binding, replay, cross-class, and tamper failure behavior;
- restart-safe rehydrate/reopen of only the same incomplete slot, with no
  duplicate result, ordinal advancement, or authority gain, and only after the
  original inspection-capability TTL expires;
- no regressions to existing source classes or shared guard semantics;
- exact twelve-file diff scope and secret hygiene; and
- absence of browser, network, source, candidate, claim, or send effects.

The reviewer must not edit implementation files. Any unresolved P0-P2 finding
or ambiguous verdict blocks integration.

## Central Integration Gate

At most one integration may occur after all of these are green:

- exact baseline and source commit;
- exact twelve-file allowlist;
- syntax and focused adapter tests;
- connected slot/preflight/capability/operation-guard/post-guard-result and
  restart-safe reopen tests;
- affected welcome-audio compatibility suite;
- privacy and prohibited-surface scans;
- all three live-claim flags fixed false;
- all three adapter evidence non-claims fixed false;
- independent green verdict; and
- clean acquisition of the established central integration lock.

Integration is repo history only. It does not authorize source execution,
private input use, candidate creation, live claim issuance, or sending.

## Approval Meaning

The CEO phrase `adelante` authorizes only the repo implementation, synthetic
tests, safe repairs within budget, one independent review, and at most one green
central integration of this exact contract and allowlist.

It does not authorize any live UI/source read, private artifact read, real
candidate, durable live claim, browser action, send, MailerLite/CRM/campaign/API
access, or other external effect.

A later live mission requires a separate exact approval bound to the integrated
commit, approved source route, private input labels, candidate cap, UI actions,
claim boundary, send boundary, verification, and stop rules.

## Required Closeout

Report only aggregate repo evidence:

- slot, adapter, preflight capability, capability consumption/verification,
  guard, post-guard durable inspection, restart, and compatibility test counts;
- independent review verdict;
- exact changed-file count;
- repair count and elapsed time;
- central integration status and commit if integrated;
- `claim_allowed` logical proof status;
- the three false live-claim flags;
- the three false adapter evidence non-claims;
- `send_allowed=false`, `live_authority=false`,
  `external_effects=0`, `browser_used=false`, and `network_used=false`; and
- the next exact decision required before any live execution.

Never include private identities, handles, IDs, anchors, digests, UI text,
screenshots, OCR output, private messages, raw payloads, tokens, credentials, or
private artifact contents.

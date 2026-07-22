# Instagram Welcome Audio UI-Attested Single-Recipient Live Admission v1

Date: 2026-07-16
Status: `completed_repo_only_no_live_formal_review_green_centrally_integrated`

The status above describes the 2026-07-18 Safari admission rail. The
2026-07-19 semantic-source amendment below is
`approved_repo_only_implementation_in_progress_no_live` and is not centrally
integrated.

## Purpose

Define a sibling admission path that can later convert one freshly revalidated
UI-attested canary draft into a separate, owner-only, one-use live authority
consumable by the claim issuer and Safari host. It does not reinterpret the
existing sealed-manifest path and does not fabricate exact follow time,
provider event identity, or campaign membership.

## Source and Draft Boundary

The legacy compatibility surface recognizes one draft with schema
`crm_core_instagram_welcome_audio_ui_attested_canary_packet_draft_v1` and status
`prepared_no_live_unapproved`, but that raw-data path is no-live and cannot
enter the fixed production runner. Productive admission requires the v2 draft
minted from the one-use IAB semantic source-artifact capability and delivered
to the runner only through its one-use private draft-admission capability. The
integrated dispatching validator must pass at admission time. The projection
must retain:

- `exact_follow_timestamp_claimed=false`;
- `provider_event_id_claimed=false`; and
- `campaign_membership_claimed=false`.

The draft remains non-authoritative. Admission creates a separately versioned
authority only after the exact external expected bindings are revalidated.
Renaming, copying, or promoting the draft is forbidden.

## Trusted Admission Inputs

A later live admission may accept only closed owner-only records for:

- the exact fresh CEO execution approval and short-lived JIT send confirmation;
- the exact clean central HEAD equal to upstream;
- tracked mission and active-next-action file digests;
- the validated draft and its canonical digest;
- one exact target plus identity, profile, candidate, thread, owner, and dedupe
  anchors;
- the exact canonical operation digest and an independently supplied expected
  digest anchor;
- one approved audio path, digest, stable bytes, owner, mode, inode, device,
  and link-count evidence; and
- an empty-or-valid fixed operation registry and claim store.

No caller-selected browser driver, store root, clock, callback, URL, selector,
coordinate, outcome, verifier, actuation result, operation snapshot, publisher
authorization, or prebuilt live authority is accepted. The new fixed runner's
entire public live input is `draft_admission_capability` plus a closed private
authorization seed. It consumes the capability to recover the authenticated v2
draft internally; a raw draft, v1 draft, legacy materializer result, source
artifact, identity, thread, owner, truth boolean, URL, selector, or clock cannot
be supplied to that live export. It derives every later capability and value
internally.
The existing live composite continues to accept only the private exact binding
capabilities and values plus the approved audio path already bound by the
audio capability.

The authorization seed is exact-bound to central HEAD, mission and active-next-
action digests, approval reference and interval, canonical draft and projection
digests, operation and authorization ids, source-evidence digest,
candidate/thread/owner/dedupe anchors, approved audio path and digest, and a
unique nonce digest. Before any source read, the runner structurally recognizes
and atomically burns the seed, then exact-binds it. Cross-draft or
cross-recipient mismatch burns the recognized seed, so mismatch cannot preserve
it for its original binding. Successful binding issues a module-private opaque
admission capability that remains unconsumed through observation and is
consumed exactly once by the builder afterward.

## PRECLAIM Builder and Fixed Runner

The missing admission edge is split into three narrow responsibilities:

1. the Safari host validates the exact audio, clean central context, tracked
   mission and active-next-action, empty owner-only authority root, and fixed
   claim-store start gates before one zero-action state read, then issues one
   opaque exact-bound one-use observation capability only when the exact
   thread, empty composer, unambiguous attachment control, zero preview, zero
   prior outgoing audio, and no challenge are all proven;
2. the effect-free PRECLAIM builder independently revalidates the approved
   audio capability, consumes that observation, builds the complete operation
   snapshot, computes and rebinds the canonical digest, reruns the operation
   guard, and issues the exact private publisher authorization; and
3. the fixed runner chains the existing fixed publisher, authority loader,
   UI-attested operation-context validator, and one-shot Safari composite.

The observation consumer burns a recognized capability before mismatch or
freshness rejection and returns only `observed_at`, `audio_validated_at`, and
`central_context_checked_at`. Each timestamp supplies only its corresponding
narrow attestation.

This closes the canonical-digest cycle that previously had to be reconstructed
from synthetic test fixtures. The builder copies the same digest into exactly
seven required positions, recomputes it, and succeeds only when the existing
guard returns PRECLAIM eligibility with `claim_allowed=true`,
`send_ready=false`, and `send_allowed=false`.

After atomically consuming the draft-admission capability, validating its v2
draft, and admitting and burning the exact authorization seed, the runner
validates the approved audio bytes and digest.
It owns all live clocks, fixed roots, the installed Computer Use runtime, and
the fixed claim store through the imported production seams. A caller cannot
inject any of those surfaces. The only injectable sibling ends in `ForTest`
and accepts temporary roots, a fake driver, deterministic clocks, and fault
scenarios only for synthetic validation.

The runner does not reimplement claim, PENDING, file selection, upload, Send,
or confirmation. It invokes the existing UI-attested composite once. There is
no alternate action adapter, text fallback, direct click, second Send, resend,
or ambiguous retry path. Before authority publication is attempted, failure is
blocked and pre-effect. Once publication is called, a thrown, malformed, or
lost result, a later open/context failure, or a blocked zero-effect composite
result is terminal zero-external-effect and permanently no-retry because the
authority root may be occupied. A post-composite possible-effect throw or
malformed/unconfirmed result is terminal UNKNOWN and permanently no-retry;
success requires the existing same-thread strong confirmation.

## Separate Authority Schema

The UI-attested authority schema, file family, source capability, and operation
context are distinct from the sealed-manifest authority. Its caps are fixed:

- candidate: `1`;
- live claim: `1`;
- PENDING: `1`;
- upload: `1`;
- Send actuation: `1`; and
- retry: `0` after any possible effect boundary.

The old manifest and campaign-interval files are neither required nor accepted
as substitutes. Mixed old/new authority families fail closed.

## Atomic Publication

The publisher must validate before writing, create only owner-only regular
files under the fixed authority root, reject symlinks and hardlinks, use
no-follow semantics, publish through a private temporary and an atomic
same-filesystem no-replace hard-link barrier, fsync the temporary file, unlink
the temporary after linking, fsync the directory, and reread stable bytes and
metadata. The root must
contain exactly one regular owner-only entry named
`ui-attested-execution-authority-v1.json`. Partial, mixed, stale, extra-file,
replaced, or ambiguous publication grants no capability and is quarantined or
left terminal according to the exact failure boundary.

Synthetic tests use only owner-only temporary roots. This mission never opens
or modifies the fixed live-authority root.

## Claim and Host Order

The sibling one-shot composite must preserve this order:

1. consume and revalidate the UI-attested authority, source, operation, and
   audio capabilities;
2. recheck either current visible follows-owner or the exact bounded pilot
   3-to-7-day recent-follow-event/no-explicit-contradiction mode, plus exact
   thread, no prior welcome/audio/claim/ambiguous result, dedupe, registry and
   cap state in the later live mission;
3. persist one durable claim before any possible effect boundary;
4. prepare only the exact bound Safari thread and native chooser;
5. persist and reread PENDING before selecting or uploading the file;
6. revalidate the exact audio capability and fresh Safari state;
7. require one preview, empty composer, unchanged zero-audio baseline, and one
   Send control inside the exact active thread;
8. mark one Send actuation before clicking once; and
9. confirm only a same-attempt, same-thread `+1` outgoing audio bubble with an
   approved strong marker strictly under five minutes.

For the UI-attested live host, the real Computer Use flat serialization is an
explicitly admitted sibling compatibility surface. Native Safari tabs are
recognized only through `isPinned`/`isActive`; page-level Instagram tabs never
count. The source must be the sole active unpinned tab, the only other unpinned
tab must be the inactive `Neutral UI Preflight`, and any shared pinned tabs must
remain inactive. Exactly one indexed Safari `(settable, string)` address field,
with the smart-search description and browser address field ID, must carry the
byte-exact thread reference.

The owner must occupy the profile slot in one unique ordered authenticated
top-navigation cluster before the DM pane, with byte-exact primary segment
`instagram.com/<owner>/`. The current pane must have one
unique target-header cluster: heading, exact sibling `<target> · Instagram`
text, then a `View profile` link whose structured value is byte-exactly
`instagram.com/<target>/`. Display-name heading children do not bind identity.
Its one indexed
`entry area (settable, string)` must carry the exact Message placeholder and an
empty structured `Value`; its one indexed attachment control must be the exact
`Add Photo or Video` button after that composer.

Attachment, preview, and Send controls are post-composer only; pre-composer
decoys block. Outgoing evidence is post-header/pre-composer history only.
Generic non-audio thread activity is allowed, while an existing recognized
outgoing welcome/audio blocks the zero baseline and any unrecognized audio or
voice evidence makes scope unknown. Historical status text is never treated as
a fresh marker. Post-Send confirmation must preserve the same private
thread/owner/target binding and show a fresh same-pane `+1` outgoing-audio
delta; it may use the established no-marker variant. Absent or unrecognized
real serialization stays UNKNOWN and no-retry rather than being inferred as
success.

Compose reset, Sent/Seen alone, lack of an error, timeout, or an observation at
exactly five minutes is not confirmation. Any attempted, uncertain, timed-out,
or unknown outcome is durable terminal and has no retry.

The bounded relationship mode does not claim current follower-list membership.
An absent desktop badge is not a blocker by itself; an explicit contradiction,
identity mismatch, stale/out-of-window event, or ambiguous profile/thread
binding blocks before claim.

## Privacy and Receipts

Public receipts contain only fixed schema labels, decisions, booleans, bounded
counts, and allowlisted blocker codes. They never contain target text, source
UI text, time bucket, identity, handle, profile/thread reference, path, anchor,
digest, operation id, approval id, timestamp, screenshot, payload, message,
email, credential, or raw URL.

## Development Boundary

The implementation mission is synthetic and repo-only. It may prove the
publisher, authority loader, source capability, claim path, Safari composite,
crash/replay rules, old-route regression, and receipt validation with temporary
roots and a fake driver only. It performs zero source reads, browser actions,
fixed-root writes, provider calls, network calls, or external effects.

## Current Implementation Checkpoint

The complete repo-only synthetic bridge is green (`242/242` combined tests):
publisher, preflight, permanent claim, PENDING, terminal finalization, and the
fake-driver Safari composite all pass with the existing sealed route still
available and regression-green. Cross-family identity dedupe, family-exact
capabilities, exact expiry, hostile input, replay, ambiguity, and strict
same-thread `+1` confirmation are covered.

The fixed publisher and live composite dispatch seams are now implemented.
The publisher owns its fixed root, mode, and clock; the composite owns its
fixed claim store, installed Safari driver, and clocks while sharing the
synthetic-proven ordered sequence. Focused authority/host and namespace
validation is `117/117` green; full welcome-audio compatibility is `637/637`
green across 13 suites.

No fixed root was opened, no real authority, claim, PENDING, browser action,
attachment, or Send occurred. This result is not canary-ready and remains
`production_ready=false` until one serialized central integration and a
separately authorized real one-recipient canary.

Independent review is `GREEN_TO_SELF_INTEGRATE`, with the exact `7/7`
allowlist, focused validation `117/117`, welcome-audio compatibility `637/637`,
and no unresolved P0-P2 finding.

One serialized central integration completed with Git history authoritative
for the final commit and zero live or private effect.

The later real-surface compatibility mission adds only a repo-only parser and
tests. It does not publish authority, issue a claim, open Safari, read private
source state, upload a file, or actuate Send. A separately authorized live
canary remains the only route to a real effect.

The current PRECLAIM builder/runner mission has implemented the remaining
production composition edge on baseline
`feed2788fa0400b63483dd4b4e851a45f94b7bda`. Focused validation is `166/166`
green and the exact sixteen-suite compatibility boundary is `759/759` green.
Tests use only fake drivers, synthetic owner-only temporary roots,
deterministic clocks, synthetic fault scenarios, and a fresh process for inert
import proof.

Independent adversarial rereview is GREEN with no unresolved P0-P3 finding.
Formal Chief Architect integration review returned `green_to_self_integrate`,
`safe_to_self_integrate_now=true`, and `ceo_decision_needed=false`; one
serialized central integration and the focused `166/166` plus exact
sixteen-suite `759/759` validation completed green. No fixed authority root,
real private artifact, Safari state, claim store, browser, network, claim,
PENDING, chooser, upload, or Send has been touched by this mission. Because
this was repo-only,
`canary_ready=false`, `production_ready=false`,
`live_authority=false`, `claim_issued=false`, `send_allowed=false`,
`browser_used=false`, `network_used=false`, and
`external_effect_invoked=false` remain controlling.

## 2026-07-19 Semantic Source-to-Safari Amendment

The controlling discovery architecture for the next proof mission is now:

1. the Codex In-App Browser is the only admitted semantic, read-only follower
   source;
2. the source host owns its isolated tab, exact routes, bounded semantic
   queries and finalization, and emits only opaque one-use capabilities;
3. the source-artifact materializer and v2 packet materializer preserve that
   provenance without accepting caller truth booleans or raw identity data;
4. the fixed runner consumes `draft_admission_capability` plus the existing
   exact authorization seed and emits only its v2 aggregate receipt; and
5. Safari remains the sole actuator through the already integrated PRECLAIM,
   claim, PENDING, chooser, one-Send and strong-confirmation rail.

Chrome is not a fallback. Safari is not a fallback source. OCR, screenshots,
coordinates, caller-selected URLs/selectors and the legacy raw v1 draft path
are not productive admission paths.

The synthetic runner retains its established `ForTest` export name but now
consumes a one-use capability from a registry separate from production. A
synthetic capability offered to the fixed runner is burned and rejected before
Safari, and replay through the synthetic consumer then also fails closed. No
runner path accepts a caller raw draft.

Stage 2 must prove two distinct notification-to-profile traversals with at
most eight rows, zero thread opens and zero capabilities. Stage 3 may qualify
at most one complete candidate and open at most one thread, but must perform
zero upload, preview or Send. Both stages require fresh exact approval and a
frozen commit. This repo-only amendment grants neither stage authority nor any
live effect.

Mission baseline is central `efddb21ef6c598e1452ea2a9912235dea431e2ef`.
The separately reviewed real-AX tolerance commit
`e9545637c88e6e1cab8ac7be34d9725410a363ec` is not central and is explicitly
excluded from this mission. Current state remains `canary_ready=false`,
`production_ready=false`, `send_allowed=false` and `external_effect_invoked=false`.

## 2026-07-22 Historical Catch-Up No-Live Boundary

The historical catch-up repo-only mission adds a separate source policy,
owner-only v4 artifact, inert packet v3, and a same-process no-Send operator.
It does not change this live admission contract or the Safari actuation rail.

The operator's Stage 2 command is qualification-only and issues zero complete
source capabilities. Its Stage 3 command may compose at most one historical
candidate through complete source, v4 artifact, and v3 packet admission while
the process is alive. No opaque capability may be persisted, serialized,
cloned, logged, or supplied back by a caller. The operator accepts no caller
identity, age, policy, relationship, runtime, or browser truth.

Real Stage 2, real Stage 3, integration, PRECLAIM, claim, PENDING, chooser,
upload, preview, and Send all remain unauthorized. A later integration review
must explicitly admit the historical v3 capability into any live composition.
After integration, Stage 2 requires fresh CEO authorization; Stage 3 requires
a separate conditional authorization; Send remains a further one-shot
boundary. Until then, `canary_ready=false`, `production_ready=false`,
`send_allowed=false`, `browser_used=false`, `network_used=false`, and
`external_effect_invoked=false` are controlling.

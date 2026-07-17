# Instagram Welcome Audio UI-Attested Single-Recipient Live Admission v1

Date: 2026-07-16
Status: `repo_only_live_dispatch_seam_completed_green_centrally_integrated_no_live`

## Purpose

Define a sibling admission path that can later convert one freshly revalidated
UI-attested canary draft into a separate, owner-only, one-use live authority
consumable by the claim issuer and Safari host. It does not reinterpret the
existing sealed-manifest path and does not fabricate exact follow time,
provider event identity, or campaign membership.

## Source and Draft Boundary

Admission accepts exactly one draft with schema
`crm_core_instagram_welcome_audio_ui_attested_canary_packet_draft_v1` and status
`prepared_no_live_unapproved`. The integrated materializer validator must pass
at the admission time. The projection must retain:

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
coordinate, outcome, verifier, actuation result, or prebuilt live authority is
accepted. The live composite accepts only the private exact binding
capabilities and values plus the approved audio path already bound by the
audio capability.

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

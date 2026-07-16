# Instagram Welcome Audio UI-Attested Single-Recipient Live Admission v1

Date: 2026-07-16
Status: `repo_only_no_live_preflight_checkpoint_green_claim_host_pending`

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

No caller-selected browser driver, callback, URL, selector, coordinate,
outcome, verifier, capability, or prebuilt live authority is accepted.

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
2. recheck current follows-owner, exact thread, no prior welcome/audio/claim,
   dedupe, registry and cap state in the later live mission;
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

The publisher and preflight portions are green under synthetic owner-only test
roots (`42/42` focused tests). Fixed-root publication remains deliberately
disabled in this no-live mission. Claim, PENDING, terminal, Safari host, and
Send remain unimplemented for the UI-attested family and therefore unavailable.
This checkpoint is not live authority and is not canary-ready.

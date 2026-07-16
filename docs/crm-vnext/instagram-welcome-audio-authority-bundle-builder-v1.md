# Instagram Welcome Audio Authority Bundle Builder v1

Date: 2026-07-16
Status: `review_green_centrally_integrated_no_effect_source_not_started`
Mission:
`crm_core_sealed_backlog_manifest_bootstrap_no_effect_v1_20260716`
Approved baseline: `c2fb4dc32de26be8f7f8cb2f4e1a39c19deb8c75`

## Purpose

Define the minimum private builder that can validate and stage an exact
historical-follower authority bundle without fabricating any identity,
timestamp, thread, owner-account, campaign-interval, or audio evidence.

This is a builder and capture-staging boundary only. It does not create send
authority, open a canary, attach a file, upload an audio preview, send a
message, invoke MailerLite, touch campaign or Ads surfaces, or use the legacy
proxy.

## Fixed private labels

- private input label:
  `crm-core-welcome-audio-authority-bootstrap-input-v1`
- private staging label:
  `crm-core-welcome-audio-authority-bootstrap-staging-v1`

The directory labels and the three fixed filenames below are safe schema
identifiers. All other private roots, filenames, identities, references,
timestamps, paths, digests, messages, screenshots, and payloads must remain
outside the repository and outside redacted receipts.

## Inputs

The builder accepts one owner-only private input directory containing exactly
these three owner-only files and no other entries:

1. `bootstrap-authorization-v1.json`
   - exact mission identifier and approved baseline;
   - bounded no-effect scope;
   - exact `record_cap` equal to eight;
   - explicit prohibition on live execution approval publication.
2. `source-capture-v1.json`
   - exact owner-account binding;
   - an exact campaign/backlog interval;
   - deterministic source order;
   - at most eight records;
   - for every record, exact identity, exact source timestamp, exact bound
     thread, exact owner-account evidence, exact source-event binding, and an
     absolute `source_observed_at` no more than five minutes old.
3. `asset-selection-v1.json`
   - exact approved audio bytes selected from an authorized, owner-owned,
     regular single-link source that is not group- or world-writable;
   - integrity evidence sufficient to bind the staged copy to those exact
     bytes.

Legacy candidate, dedupe, effect-history, and asset evidence may be consulted
only as separate owner-only mission evidence. It is not an additional builder
root, cannot substitute for an exact current builder field, and cannot be
copied into tracked files or redacted receipts.

## Source capture boundary

The later capture phase may use one dedicated standard Safari context to read
only:

- the approved Instagram notification source;
- at most eight historical backlog records;
- only the matching profile and bound thread required for each exact binding.

A fresh state is required before every UI action. The capture phase must stop
without publishing an output bundle if any identity, source time, interval
membership, owner account, or thread binding would require approximation,
relative-time conversion, OCR guesswork without exact corroboration, or any
other inference.

The source-read allowance does not authorize the attachment control, native
file chooser, upload preview, Send control, text, follow-back, like, comment,
reaction, MailerLite, CRM, campaign, Ads, proxy, Chrome, in-app browser, or any
unrelated profile, thread, or DM.

## Validation and staging

Before any private publication, the builder must:

- reject unknown, missing, duplicate, or extra root fields;
- reject more than eight records;
- reject relative, approximate, inferred, malformed, or out-of-interval
  timestamps;
- reject a future, stale, or missing source-observation timestamp, including
  by rechecking the five-minute bound against a fresh clock immediately before
  atomic publication;
- reject duplicate identities, duplicate thread bindings, owner mismatches,
  and non-deterministic order;
- reject symlinks, hard-link substitution, non-regular files, unsafe roots,
  or mutable source/target aliasing;
- copy the exact approved audio into new owner-only single-link storage;
- re-read and verify the copied bytes before publication;
- create directories and files with owner-only permissions;
- publish atomically only after the complete bundle validates;
- refuse to follow pre-existing links or overwrite an existing final bundle.
- convert every exported programmatic failure, including filesystem failures,
  into the typed aggregate blocked receipt without exposing a private path or
  raw system error.

On success, the owner-only staging bundle contains only the private forms of:

- the validated backlog interval;
- the deterministic manifest of at most eight records;
- exact identity, thread, owner, temporal, source-event, and source-observation
  bindings;
- the protected copied audio asset and its integrity binding;
- one aggregate redacted receipt.

The redacted receipt may expose schema labels, counts, booleans, status, and
non-secret error codes only. It must not expose private values, paths, digests,
identities, references, timestamps, messages, screenshots, or payloads.

## No live-authority publication

This builder must never create, update, rename, copy, or publish
`execution-approval-v1.json`, any equivalent live approval record, or any file
inside the fixed runtime live-authority root. A valid staging bundle remains
no-live and unusable for sending until a later, separately authorized mission
creates fresh authority bound to the then-current central commit and every
runtime gate.

The following flags remain false for this mission:

- `production_ready`
- `send_allowed`
- `live_authority`
- `attachment_control_invoked`
- `send_control_invoked`
- `mailerlite_effect_authorized`

## Fail-closed results

- `staged_no_live_bundle`: all required private evidence is exact and the
  owner-only bundle was published atomically. This is still a no-live staging
  result.
- `blocked_no_live_bundle`: no final staging bundle was published. A redacted
  blocker code distinguishes invalid schema, cardinality, ordering, timestamp,
  filesystem, integrity, an already-existing target, unsafe live-root
  proximity, or ambiguous evidence without exposing private values.

No blocked or invalid result may be converted to success by filling a value
from memory, normalizing an identity, deriving an exact time from relative
text, or broadening the source route.

## Review and integration gate

Repository implementation and deterministic tests may proceed on the exact
mission allowlist. Source capture is not complete merely because tests pass.
No central integration may occur until a worker independent from the
implementation returns a green review covering:

- exact effect allowlist and zero-effect UI boundary;
- privacy and identity handling;
- atomic owner-only filesystem publication and no-follow behavior;
- rejection of inference and relative time;
- absence of live-authority publication;
- absence of browser, network, send, MailerLite, campaign, Ads, CRM, proxy, or
  legacy-repository effects during builder validation.

Only a green independent verdict may advance the exact allowlisted delta to
one serialized central integration. Neither review nor integration authorizes
the later Safari capture phase or any live canary effect.

## Current checkpoint

- builder implementation: `in_progress`
- deterministic tests: `not_yet_recorded`
- independent review: `not_started`
- central integration: `not_started`
- Safari source capture: `not_started`
- records read: `0`
- records staged: `0`
- external effects: `0`

Do not update these outcomes without direct execution evidence and the required
independent review.

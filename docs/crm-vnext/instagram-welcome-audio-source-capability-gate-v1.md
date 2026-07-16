# Instagram Welcome Audio Source Capability Gate v1

Date: 2026-07-16

Status: repo-only synthetic contract; no source or live authority

## Purpose

This contract defines a pure, deterministic gate for classifying whether a
caller-supplied synthetic source observation contains enough explicit evidence
to support a later, separately approved source-capture step.

The gate does not acquire evidence. It cannot open Instagram, make notification
rows accessible, inspect a private artifact, create a candidate, stage a bundle,
or make a canary ready.

## Decisions

The gate returns exactly one of these decisions:

- `source_capable`
- `blocked_no_accessible_rows`
- `blocked_ambiguous_or_inferred`

No other success, warning, retry, unknown, or inferred-success state is valid.

## Decision Rules

Evaluation is fail-closed and follows this precedence:

1. Return `blocked_ambiguous_or_inferred` when the observation is malformed,
   has an invalid mission binding, surface binding, or fresh surface timestamp,
   when any required binding is missing or conflicting, when more than eight
   rows, a duplicate, nondeterministic order, an inaccessible or unverifiable
   row, or a mixed-accessibility row set is supplied, or when any conclusion
   depends on ambiguity, approximation, relative time, or inference. This also
   applies when a no-row envelope contains any campaign, owner, record,
   identity, thread, source-event, campaign-time, follow-time, or
   record-observation-time claim other than its exact no-row sentinels. The
   required fresh surface-observation timestamp is not such a private record
   claim.
2. Otherwise, return `blocked_no_accessible_rows` only for an exact, fresh,
   loaded, authenticated Notifications-surface observation with
   `row_access_status=not_exposed`, zero records, and the closed schema's
   explicit null/not-observed values for campaign, owner, and record evidence.
3. Return `source_capable` only when at least one and no more than eight
   accessible and verifiable rows are present, their order is deterministic, no
   duplicate is present, and every evaluated row has explicit evidence for all
   required bindings.

`blocked_no_accessible_rows` describes source capability only. It must never be
reported or interpreted as zero followers.

## Branch-Specific Evidence

### Source-Capable Branch

Every row evaluated for `source_capable` must be bound without inference to:

- one exact source event;
- one exact owner Instagram account;
- one exact candidate identity;
- one exact thread;
- one absolute source timestamp;
- one sealed backlog interval with explicit membership; and
- explicit evidence that the row is accessible and verifiable.

Accessibility is a set-level invariant. `exposed_exact` attests that the entire
closed `ordered_records` set is accessible and verifiable;
`not_exposed` is valid only with an empty set. A per-row or mixed-accessibility
claim is unrepresentable under the closed schema and closes the entire
observation as `blocked_ambiguous_or_inferred`.

Missing, relative, approximate, inferred, ambiguous, or conflicting evidence
for any required field closes the gate as
`blocked_ambiguous_or_inferred`.

Identity evidence must be preserved exactly. Alias folding, case or punctuation
normalization, OCR-only identity, derived timestamps, fabricated ordering, and
duplicate collapsing are inference and are forbidden.

### No-Accessible-Rows Branch

`blocked_no_accessible_rows` proves only all of the following:

- the exact mission and input schema are bound;
- the expected Instagram Notifications surface is loaded;
- the exact owner session is authenticated;
- the surface observation has a canonical UTC, non-future timestamp no more
  than five minutes old, with absolute-time and explicit non-inference evidence;
- `row_access_status=not_exposed`; and
- `ordered_records` is exactly empty.

The no-row envelope must use these exact values:

- `campaign_interval=null`;
- `record_order_evidence=no_rows_available_for_ordering`;
- `owner_account_reference_utf8=null`;
- `owner_binding_evidence=not_observed_due_to_no_accessible_rows`; and
- `ordered_records=[]`.

It must contain no target identity, thread, owner reference, source-event
reference, campaign membership, follow time, record observation time, or other
private claim. A missing or substituted sentinel, a nonempty record set, or any
private value makes the decision `blocked_ambiguous_or_inferred`.

This branch does not claim an exact campaign interval, absolute record time,
exact UTF-8 preservation, identity evidence, thread evidence, owner evidence,
or source-event evidence. `deterministic_order_verified=true` records only the
exact empty-set ordering sentinel, and `duplicate_free=true` records only the
structural fact that the closed record array is empty; neither is evidence about
an observed record.

## Input Boundary

The input is a closed-key, plain, data-only synthetic observation supplied by
the caller. It must not contain browser handles, callbacks, functions,
executable objects, filesystem paths to private artifacts, screenshots, OCR
payloads, private messages, credentials, tokens, or any capability that could
acquire source data.

The gate must reject non-plain or executable-shaped input without invoking
accessor values, callbacks, or function values. It may validate structure and
exact equality only; it may not fabricate, normalize, enrich, search for, or
infer missing evidence.

### Closed-Key Input Shape

The root object contains exactly:

- `schema_version`;
- `mission_id`;
- `surface_observation`;
- `campaign_interval`;
- `record_order_evidence`;
- `owner_account_reference_utf8`;
- `owner_binding_evidence`; and
- `ordered_records`.

`surface_observation` must be bound to the Instagram recent-follower
Notifications surface, the exact authenticated owner, and exactly one row-access
state: `exposed_exact` or `not_exposed`. Its observation time is canonical UTC
and its evidence must state absolute timestamps and explicit non-inference.

For the `source_capable` branch, `campaign_interval` contains canonical UTC
`start_at` and `end_at` values plus explicit interval and source-event
membership evidence. The interval must be well ordered and must not extend
beyond the surface observation.

For the `source_capable` branch, `record_order_evidence` requires exact source
order with contiguous ordinals. Every record contains exactly:

- `ordinal`;
- `exact_target_utf8` and `identity_binding_evidence`;
- `followed_at`, `source_observed_at`, and `follow_time_evidence`;
- `campaign_membership_evidence`;
- `bound_thread_reference_utf8` and `thread_binding_evidence`;
- `owner_account_reference_utf8` and `owner_binding_evidence`; and
- `source_event_reference_utf8` and `source_event_binding_evidence`.

For the `blocked_no_accessible_rows` branch, the root keys remain present with
`campaign_interval=null`,
`record_order_evidence=no_rows_available_for_ordering`,
`owner_account_reference_utf8=null`,
`owner_binding_evidence=not_observed_due_to_no_accessible_rows`, and
`ordered_records=[]`. The envelope is invalid if it reuses source-capable
evidence objects, alternate sentinels, or private strings.

The caller supplies an integer reference clock. The surface observation is
always canonical UTC, not in the future, and no more than five minutes old
relative to that clock. Only the `source_capable` branch may contain
`source_observed_at`; each such value has the same freshness constraint.
Historical `followed_at` values do not need to be recent, but each must be
canonical UTC and explicitly within the sealed campaign interval.

Objects and arrays are snapshotted only from own data descriptors. Accessors,
callbacks, functions, Proxies that cannot be safely inspected, unknown or
missing keys, sparse or extended arrays, and non-plain prototypes close the
gate. Accessor values, callbacks, and function values are never invoked; a
failed hostile-object inspection is contained and its thrown value is never
copied to the receipt.

## Redacted Receipt

The public result may expose only:

- the exact gate decision;
- aggregate row counts;
- aggregate required-binding counts or booleans;
- `source_execution=false`;
- `canary_ready=false`;
- `live_authority=false`; and
- a stable, non-private contract/version label.

The aggregate booleans may describe surface load/authentication, row access,
campaign interval, absolute-time evidence, deterministic order, exact UTF-8
preservation, exact identity/thread/owner/source-event evidence, duplicate
freedom, and whether normalization occurred. Stable blocker codes are allowed.
The receipt fixes `normalization_performed=false` and
`external_effect_invoked=false` in addition to the three false live flags.

For `blocked_no_accessible_rows`, the receipt fixes:

- zero aggregate row counts and `rows_accessible=false`;
- `surface_loaded=true` and `surface_authenticated=true`;
- `campaign_interval_exact=false` and
  `absolute_time_evidence_exact=false`;
- `deterministic_order_verified=true` only for the exact empty-set sentinel;
- `duplicate_free=true` only because the closed array is empty;
- `exact_utf8_preserved=false`, `identity_evidence_exact=false`,
  `thread_evidence_exact=false`, `owner_evidence_exact=false`, and
  `source_event_evidence_exact=false`; and
- `source_capable=false` plus every no-live/no-effect flag fixed false.

The sole blocker is the stable no-accessible-rows code. Surface timestamp
validity is an admission condition, not a claim of absolute record-time
evidence.

It must never expose identities, handles, profile or thread references, source
event references, timestamps, interval values, screenshots, OCR text, private
messages, raw payloads, tokens, credentials, or private artifact contents.

## Non-Effects

Evaluating this gate must have all of these properties:

- no Safari, Chrome, in-app browser, Instagram, Computer Use, OCR, or source
  execution;
- no private artifact read or write;
- no polling, retry, baseline/delta monitor, webhook, multi-browser fallback,
  or general source-capture abstraction;
- no candidate generation or authority-bundle publication;
- no attachment, upload, message, text, follow-back, or other representational
  action;
- no MailerLite, CRM, campaign, Ads, or proxy access;
- no network use and no external effect; and
- `source_execution=false`, `canary_ready=false`, and
  `live_authority=false` for every decision.

## Current Checkpoint

The preceding sealed-backlog bootstrap mission completed fail-closed at central
commit `adbdbfcceaab296af03d44afd1e64a9513105f1a`. It reached an authenticated
Instagram Notifications surface but found zero accessible and verifiable
follower rows. It opened zero profiles and zero threads, sealed zero records,
and caused zero external effects. This is a source-capability blocker, not
evidence of zero followers.

This gate is a repo-only proof seam for expressing that result deterministically.
It does not cure the source limitation, reopen the prior mission, or authorize a
new source attempt. `source_capable` for a synthetic fixture proves only the
gate's classification behavior; it is not a current source-health result.

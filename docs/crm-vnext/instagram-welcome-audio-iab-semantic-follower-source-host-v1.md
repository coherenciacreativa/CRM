# Instagram Welcome Audio IAB Semantic Follower Source Host v1

Date: 2026-07-19

This host gives CRM Core a read-only semantic source for recent Instagram
follower evidence. It does not attach a file, create a preview, send a message,
change a relationship, or operate Safari. Safari remains the only actuator in
the separate existing live rail.

The governing mission is
`crm_core_iab_semantic_source_to_safari_handoff_proof_v1_20260719`. This file
documents the repository boundary only. It grants no Stage 2, Stage 3,
integration, or live authority.

## Installed runtime boundary

Production accepts no driver or caller evidence. The environment installs one
facade as own data properties at both:

- `Symbol.for('crm-core/iab-semantic-source-runtime/v1')`
- `globalThis.crmCoreIabSemanticSourceRuntimeV1`

Both properties must contain the same object. The object must be a frozen,
closed, non-Proxy plain object with exactly these own data fields:

- `brand`, exactly `crm_core_iab_semantic_source_runtime_facade_v1`
- `open_isolated_instagram_tab_once`
- `qualify_notification_profile_pairs_once`
- `observe_follower_candidate_once`
- `finalize_isolated_tab_once`

Both global bindings use the exact descriptor
`{ value: facade, writable: false, enumerable: false, configurable: false }`.
Mutable, configurable, enumerable, accessor, inherited, missing, or
different-identity bindings fail closed before any runtime method is called.

The four operations are captured and bound before use. Replacing a global
binding later does not replace the captured methods.

The facade owns its isolated In-App Browser tab, approved Instagram routes,
bounded semantic queries, bounded activations, and cleanup. It exposes no raw
Browser object, tab, locator, DOM, selector, screenshot, coordinate, generic
evaluation callback, arbitrary network method, URL input, or backend selector.
The production host exports are zero-argument and reject every supplied value
before the runtime is touched. In particular, callers cannot supply identity,
thread, owner, time, unread state, dedupe state, or any truth boolean.

Every traversal calls `finalize_isolated_tab_once` exactly once after a valid
facade is captured, including blocked or thrown runtime paths. A complete
source capability is issued only if finalization returns its exact once-only
receipt.

Immediately before invoking `open_isolated_instagram_tab_once`, the host marks
`read_only_source_action_attempted: true`. It marks
`read_only_source_action_performed: true` only after the exact open report has
proved that the isolated source tab opened; therefore `performed` always equals
`isolated_tab_opened`. An open throw or malformed open report preserves
`attempted=true`, `performed=false`, and
`external_effect_possible_or_unknown=true`. Both failure modes still finalize
exactly once and issue no capability.

Receipt validation is blocker-aware. Failures reached before runtime open have
both action flags false and zero progress. A stage action that throws after an
exact open preserves `attempted=true`, `performed=true`, the exact open fact,
and `external_effect_possible_or_unknown=true`. Exact but rejected reports
preserve every safe aggregate, including rows scanned, threads opened, the
count of individually valid qualification pairs, distinctness, binding
milestones, and Seen evidence. Pair accounting completes before a higher-
priority row, thread, Seen, or challenge blocker is selected. An over-cap row
count remains visible instead of being reset or clamped.

The repo-only correction mission
`crm_core_iab_semantic_receipt_state_conformance_no_live_v1_20260719` closes
the invalid-report state space without changing either receipt schema. A
qualification `REPORT_INVALID` receipt retains safe lower-bound counts but
always marks `external_effect_possible_or_unknown=true`. A candidate
`REPORT_INVALID` receipt likewise retains safe aggregates while canonically
withholding Seen-absence proof and marking possible-or-unknown true. Those
canonical markers distinguish an actually invalid report from an otherwise
successful or pure row-cap aggregate whose blocker was merely relabeled.

`external_effect_invoked=true` means that the exact report explicitly observed
a Seen transition. On qualification reports whose raw thread and Seen counts
are valid, `external_effect_possible_or_unknown` equals exactly whether either
count is nonzero. The only qualification exception is canonical
`REPORT_INVALID`, where an invalid raw count is safely reduced to zero while
possible-or-unknown remains true. After any attempted observation action,
`external_effect_possible_or_unknown` equals exactly the inverse of
`seen_transition_absent`. Invoked always implies possible-or-unknown, but
possible-or-unknown does not assert that an effect occurred. Neither field
authorizes, confirms, or creates a capability or live action. A malformed or
Proxy report preserves no private or untrusted field data. If finalization
fails after an earlier violation, the earlier primary blocker is preserved
while `isolated_tab_finalized=false` records the cleanup failure.

## Runtime return contracts

`open_isolated_instagram_tab_once` returns exactly:

```text
isolated_tab_opened: true
source_backend: codex_in_app_browser_semantic_read_only_v1
```

`qualify_notification_profile_pairs_once` returns a bounded private report
with only `rows_scanned`, `thread_open_count`, `seen_transition_count`,
`challenge_or_error_status`, and `pairs`. Exactly two distinct pairs are
required. Each pair contains one row ordinal, exact notification and profile
identities, distinct private notification and profile references, an exact
3-to-7-day catch-up time bucket, `notification_profile_binding: exact`, and
`follower_event_binding: started_following_owner`. The host discards all pair
data after validation.

`observe_follower_candidate_once` returns a bounded private report with:

- rows scanned and one row ordinal, both capped at eight;
- exact private target, distinct notification, profile, thread, and owner
  references, plus an exact 3-to-7-day catch-up time bucket;
- exact notification-to-profile, profile-to-thread, and owner bindings;
- `relationship_binding: follows_owner`;
- `preopen_unread_inbound: explicit_none` before the thread is opened;
- exactly one thread open and `seen_transition: absent`;
- explicit absence of prior welcome audio and prior welcome attempt;
- clear dedupe, visible composer, usable attachment control, and no challenge
  or error.

Unread `present` or `unknown` must be reported with zero threads opened. Seen
absence is proven only when the report says `absent`, the thread count is
valid, and either zero threads opened or exactly one thread opened after
`preopen_unread_inbound: explicit_none`. Thus unsafe unread plus a thread open,
multiple thread opens, an unknown Seen value, or an invalid count records
possible-or-unknown effect evidence even when no explicit Seen transition was
reported. The environment wrapper owns that ordering; the host will not treat
a contradictory later claim as proof that no Seen transition occurred.

`finalize_isolated_tab_once` returns exactly:

```text
isolated_tab_finalized: true
finalize_count: 1
```

All runtime return values are exact-shape data objects. Proxies, accessors,
extra fields, malformed arrays, or ambiguous values fail closed. Arrays are
accepted only with the exact `Array.prototype`, an own data-only safe-integer
length, and dense own data indices. They are copied from property descriptors
by ordinal; inherited or own iterators are never consulted. Public receipt
validators are total and no-throw for untrusted inputs: revoked or hostile
Proxies, array subclasses, sparse or extra-key arrays, symbol properties,
accessor indices, poisoned iterators, and non-exact prototypes are rejected
without invoking caller traps, getters, or iterators.

## Stage 2 qualification

`qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce()` performs the
Stage 2 source qualification. Success requires:

- no more than eight notification rows;
- exactly two distinct notification-to-profile traversals;
- zero threads opened;
- zero Seen transitions;
- no challenge or error; and
- exact isolated-tab finalization.

Stage 2 always returns `private_complete_source_capability: null`. It cannot
issue a candidate capability even on success.

## Stage 3 complete candidate observation

`observeWelcomeAudioIabSemanticFollowerCandidateOnce()` performs the Stage 3
read-only observation. It issues one capability only after every complete
binding and finalization gate is green. Failure, ambiguity, unknown dedupe,
unread inbound content, prior welcome evidence, a missing composer, or a
missing attachment control returns no capability.

The production capability is frozen, opaque, WeakMap-backed, nonserializable,
literally noncloneable by `structuredClone`, and accepted only by
`consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce(capability)`.
Consumption burns the capability before freshness or payload validation. A
foreign object, spread clone, stale capability, or replay returns `null`.

Production and synthetic capabilities use separate WeakMap registries and an
internal family brand. The production consumer accepts only the production
registry. If it receives a known synthetic capability, it burns that synthetic
state and returns `null`. The `ForTest` consumer accepts only the synthetic
registry and likewise burns and rejects a known production capability. Neither
consumer can upgrade, translate, or move a capability between registries.
Both families use the same payload-free clone guard, so both are literally
rejected by `structuredClone`.

The capability expires exactly five minutes after observation and is valid
only while consumption occurs strictly before that expiry. Consumption never
renews the expiry. Its successful frozen private payload has exactly these
fields:

```text
source_contract_version
source_backend
source_mission_id
source_observed_at
source_expires_at
source_row_ordinal
exact_target_utf8
exact_notification_reference
exact_profile_reference
exact_thread_reference
exact_owner_account_reference
visible_time_bucket_utf8
notification_profile_binding
profile_thread_binding
owner_account_binding
relationship_binding
preopen_unread_inbound
seen_transition
prior_welcome_audio
prior_welcome_attempt
dedupe_status
composer_status
attachment_control_status
challenge_or_error_status
isolated_tab_finalized
```

Private payload data may flow only into the next opaque provenance consumer.
It must not be logged, serialized, persisted as a receipt, or returned to a
human-facing surface.

## Redacted receipts

The qualification and observation paths emit separate aggregate-only receipts
and validators:

- `validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt`
- `validateWelcomeAudioIabSemanticFollowerCandidateReceipt`

Receipt schema v2 contains counts, booleans, fixed enums, and allowlisted
blocker codes. It records action attempted separately from performed, explicit
effect evidence separately from possible-or-unknown effect evidence, the
qualification challenge state, and aggregate observation time-bucket validity.
Each validator applies a closed blocker-to-reachable-state matrix; changing a
blocker without its required aggregate cause fails validation. Receipts contain
no identity, handle, URL, reference, thread, owner, DOM, selector,
screenshot, coordinate, OCR, timestamp, or private text. Receipt validators
reject Proxies, accessors, extra fields, invalid decision combinations, and
unreachable count/effect combinations. Seen absence is accepted only with zero
threads, or with exactly one thread after explicit pre-open unread absence;
two or more opened threads can never coexist with a validated Seen-absence
claim.

## Test-only surface

Synthetic runtime installation, reset, audit, clock control, and traversal
helpers all end in `ForTest`:

- `installWelcomeAudioIabSemanticRuntimeFacadeForTest`
- `resetWelcomeAudioIabSemanticRuntimeFacadeForTest`
- `qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest`
- `observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest`
- `consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest`

The installer uses a module-internal captured test seam. It never writes,
replaces, or depends on either production global binding, and reset only clears
that internal seam. The installer accepts only enumerated scenarios. It does
not accept a caller
payload containing identity, URLs, thread, owner, truth booleans, runtime
methods, or a Browser driver. Downstream tests obtain a complete-source
capability by installing the exact synthetic scenario and calling the Stage 3
`ForTest` observer, then passes it only to the `ForTest` consumer. There is no
direct caller-payload capability publisher, and the production consumer never
admits that synthetic capability.

No `ForTest` hook grants live authority.

## 2026-07-22 Historical Catch-Up Policy Amendment

The ordinary source contract remains `ordinary_recent_v1` and keeps its
existing 3-to-7-day grammar and behavior unchanged. A separate policy named
`historical_catchup_pilot_v1` is admitted only through its own versioned host
entrypoints and opaque capability family.

Historical mode accepts an exact visible integer label only when it is:

- 8 through 30 with `d`, `day`, `days`, `día`, or `días`; or
- 1 through 4 with `w`, `week`, `weeks`, `sem`, `semana`, or `semanas`.

Day labels are classified as `displayed_day`; week labels are classified as
`coarse_week`. The exact visible label remains private and byte-preserved as
`age_evidence_raw`. The host also binds `selection_policy`,
`age_evidence_kind`, `age_bucket`, and
`actual_elapsed_age_claimed=false`. It never converts a displayed label into
an exact duration or follow timestamp and never claims campaign membership.

Historical mode rejects the ordinary 3-to-7-day labels, day 31 or greater,
week 5 or greater, decimals, approximate forms, ranges, inequalities, mixed
units, and unknown or ambiguous labels. The caller cannot provide the policy,
parsed age, relationship truth, identity, runtime, or browser facts. The
policy is selected inside the approved host path and the existing
environment-owned facade supplies the observation.

A current visible `follows_owner` signal remains the primary relationship
gate. An old notification label alone is never eligibility evidence. The
historical payload travels only through its separate opaque, one-use,
nonserializable family; ordinary and historical consumers burn and reject one
another's capabilities.

This amendment is repo-only. It authorizes no real Stage 2 or Stage 3 source
access, browser action, live execution, integration, or Send.

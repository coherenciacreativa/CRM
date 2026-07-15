# Instagram Welcome Audio Operational Rail v1

- `contract_version`: `crm_core_instagram_welcome_audio_operational_rail_v1`
- `execution_mode`: `deterministic_no_effect_test`
- `status`: `operational_rail_and_async_bridge_centrally_integrated_deferred_rendezvous_independent_review_green_artifact_review_pending_no_live`
- `production_ready`: `false`
- `send_allowed`: `false`
- `live_authority`: `false`
- `browser_used`: `false`
- `network_used`: `false`
- `external_effect_invoked`: `false`
- `future_mission_required`: `true`

## Purpose

This contract joins the two previously missing mechanical boundaries behind the
centrally integrated Welcome Audio guard and synthetic one-shot executor:

1. an owner-only compare-and-swap claim writer that promotes one authoritative
   `PRECLAIM` snapshot to one authoritative `READY` snapshot; and
2. a Safari-branded operational executor port that consumes that exact claim
   once, publishes terminal evidence before its deterministic actuation, and
   closes every attempted or ambiguous outcome to permanent no-retry.

The joined rail is a deterministic no-effect proof only. It does not open
Safari, Instagram, a DM, a native picker, or any private source. It does not
upload or send anything. The Safari branding fixes the future surface contract;
it is not a browser driver or evidence that the live surface is healthy.

## Centrally Integrated Async Browser Session Bridge

The integrated no-live bridge boundary is:

```text
crm_core_welcome_audio_async_browser_session_bridge_v1
```

It adds deterministic simulated asynchronous orchestration around the already
centrally integrated operational rail. It demonstrates only this mechanical
order:

```text
synthetic preparation
  -> authoritative durable PRECLAIM
  -> existing READY plus opaque same-process capability
  -> existing pending evidence durable
  -> capability consumption
  -> one modeled Send
  -> one modeled confirmation
  -> permanent terminal evidence and no-retry
```

The bridge does not add or claim a real actuator. Its
`send_control_actuation_count=1` is a modeled test event only and is never a
real message. For the bridge and every receipt produced by this lane:

```text
browser_used = false
network_used = false
external_effect_invoked = false
production_ready = false
send_allowed = false
live_authority = false
```

The integrated rail's `244/244` focused, `7/7` targeted adversarial, and
`1669/1670` full-suite known-baseline results validate only the inherited
dependency. Fresh bridge-lane validation is now reported separately:

```text
bridge_focused_validation = bridge_focused_green
bridge_only_focused_total = 44/44
bridge_plus_inherited_focused_total = 276/276
async_session_bridge_component = 25/25
operational_executor_component = 19/19
bridge_targeted_adversarial_validation = bridge_adversarial_green_13/13
bridge_full_validation = full_known_baseline_unchanged_240/241_files_1701/1702_tests
```

The sole full-suite failure remains the exact unchanged out-of-lane Launch OS
approval-queue baseline. None of these counts is evidence of a browser, real
actuator, Safari or Instagram use, picker access, audio delivery, surface
health, live issuer, or authorized canary.

## Deferred Actuator Rendezvous v1 (Current Lane)

The current no-live delta adds a same-process deferred rendezvous between the
integrated operation session and its deterministic actuator result. The
rendezvous authority is separate from the public port, opaque, frozen,
nonserializable, and paired privately to the exact port and operation binding.
The public port remains frozen and unchanged: it exposes no `invoke`, driver,
callback, browser handle, or payload.

The executor alone may arm the rendezvous, and only after durable `PENDING`,
claim-capability consumption, and prepared-session-authority consumption. One
valid resolution is accepted. Forged, cross-port, reused, concurrent-losing,
early, binding-drifted, invocation-mismatched, invalid, late, or absent results
fail closed. Early or otherwise pre-arm rejection remains the only rendezvous
path reported as `effect_boundary_entered=false` and count `0`. Once `ARMED`,
binding drift, an accessor-bearing/non-plain/Proxy or otherwise invalid result,
an invocation mismatch, timeout, or absence is recorded conservatively as
`effect_boundary_entered=true`, count `1`, terminal unknown, and permanent
no-retry. The input result is accepted only as one frozen data-only snapshot
built from own descriptors without invoking getters; that exact snapshot is
validated, compared, and stored without re-reading the caller object. An absent
result reaches a bounded deterministic timeout and never arms or accepts a
second resolution.

This is a seam for a future separately reviewed host; it is not a host-browser
implementation or a browser test. Current focused validation is `292/292`
across the five Welcome Audio files, including operation session `40/40` and
operational executor `20/20`. The prior centrally integrated bridge evidence
remains `44/44`, `276/276`, targeted `13/13`, and full known baseline
`1701/1702`. Current rendezvous full-suite validation is `240/241` files and
`1717/1718` tests with the same exact unchanged historical out-of-lane baseline.
Independent code, adversarial, and documentation reviews are green; formal
artifact review, commit, push, and central integration of this rendezvous delta
remain pending. All receipts still fix:

```text
browser_used = false
network_used = false
external_effect_invoked = false
production_ready = false
send_allowed = false
live_authority = false
```

## Combined Boundary

```text
authoritative PRECLAIM in shared owner-only store
  -> claim writer re-reads and revalidates under one mutex
  -> exclusive durable READY publication
  -> opaque same-process one-use capability
  -> operational executor re-reads READY under the same store and mutex
  -> synced pending attempted-terminal evidence
  -> capability consumed
  -> at most one deterministic branded-Safari port invocation
  -> exclusive durable terminal evidence
  -> confirmed or unknown terminal receipt
  -> permanent no-retry
```

The ordering is mandatory. No actuator-like invocation occurs before pending
terminal evidence is durable. No missing receipt, exception, timeout, partial
record, pre-existing record, stale mutex, process loss, or ambiguous result can
reopen the attempt.

## Components

| Component | Public contract | Responsibility |
| --- | --- | --- |
| Shared one-shot store | `crm_core_instagram_welcome_audio_one_shot_store_v1` | One set of owner-only preclaim, READY, pending, terminal, and mutex primitives for claim issuance and consumption |
| Claim writer | `crm_core_instagram_welcome_audio_claim_writer_v1` | Validate authoritative preclaim, win the durable claim once, publish READY, and return an opaque same-process capability plus a redacted receipt |
| Existing one-shot executor | `crm_core_instagram_welcome_audio_one_shot_executor_v1` | Preserve the integrated synthetic boundary-A proof while reusing the shared store primitives |
| Safari-branded operational executor | `crm_core_instagram_welcome_audio_safari_operational_executor_v1` | Consume the opaque claim, publish terminal evidence before deterministic actuation, invoke the branded port at most once, and close terminally |
| Composite | `runWelcomeAudioOperationalRailOnce(...)` | Keep claim issuance and claim consumption in the same process without serializing or reconstructing the private capability |

## Shared Owner-Only One-Shot Store

The claim writer and Safari operational executor share one operational-rail
namespace and the same store mechanics. The existing synthetic boundary-A
executor reuses those mechanics under its existing executor-specific namespace,
so its earlier synthetic record addressing remains isolated. In this lane the
only accepted policy is:

```text
deterministic_no_effect_test
```

The store is restricted to an owner-only `0700` directory directly beneath the
canonical operating-system temporary root. Records are owner-only `0600`
regular files. The root and records may not be symlinks; record reads require a
single hard link, `O_NOFOLLOW`, exact ownership/mode, bounded size, and stable
before/after metadata. The root device and inode are pinned and revalidated.

One operation fingerprint derives private local names for:

- authoritative preclaim input;
- authoritative READY state;
- incomplete READY publication evidence (`READY_PARTIAL`);
- pending attempted-terminal evidence;
- final terminal evidence;
- the exclusive per-operation mutex;
- non-replace temporary publication names.

The names, canonical digest, claim lineage, private operation data, and exact
timestamps remain private and never enter a redacted receipt.

The mutex is acquired with exclusive `mkdir`. It is never aged, reaped,
reclaimed, or broken. A pre-existing mutex fails closed. Durable publication is
exclusive and non-replacing, with file and directory sync. Existing READY,
pending, terminal, partial, colliding, or malformed evidence dominates any
request to proceed.

This is a cooperative owner-only serialization boundary. It is not a sandbox
against an actively malicious process running as the same local user.

### READY_PARTIAL Semantics

An exclusive READY temporary publication name without a final READY record is
classified `READY_PARTIAL`, never silently ignored.

- When another invocation still holds the per-operation mutex, the partial is
  treated as an in-flight publication and the contender returns `BUSY` with no
  claim and no capability.
- When the current invocation wins serialization and the partial still exists
  on the under-mutex evidence recheck, it is abandoned/ambiguous evidence and
  returns `UNKNOWN` with permanent no-retry.

No process deletes, repairs, ages, or reclaims the partial to manufacture a new
claim.

## Claim Writer Contract

The public API is:

```text
issueWelcomeAudioClaim({
  registry_root,
  authoritative_preclaim_record_path,
  expected_canonical_operation_sha256,
  registry_policy,
  now_ms
})
```

The caller must supply the independently trusted canonical-operation digest.
The writer never derives trust from the record it is validating.

Before serialization and again under the mutex, the writer requires the pure
operation guard to report exactly:

```text
phase = preclaim_eligible
decision = eligible_for_atomic_claim
state_valid = true
claim_allowed = true
send_allowed = false
terminal = false
blockers = []
```

The preclaim record must be byte- and metadata-identical across both reads.
After winning the mutex, the writer creates fresh opaque claim owner, token,
attempt, and registry-revision lineage, derives the only permitted READY
transition, validates that READY through the integrated guard, publishes it
exclusively, and re-reads it before returning.

The returned object contains:

- `private_claim_capability`: an opaque same-process capability only when the
  current invocation created and revalidated READY;
- `redacted_receipt`: one exact allowlisted claim receipt.

Every blocked, busy, replayed, stale, changed, or ambiguous path returns no
capability.

## Opaque Same-Process Capability

The claim capability is intentionally not a bearer token and not a serialized
permit.

- Its state lives in a module-private weak association.
- It cannot be reconstructed from READY, receipt fields, lineage, or JSON.
- JSON serialization throws.
- It is accepted only in the same process that created it.
- It binds the store identity, canonical digest, exact claim lineage, READY
  digest, READY device/inode metadata, and deterministic registry policy.
- It is consumed once by the operational executor, including fail-closed paths
  that discover terminal or ambiguous evidence.

Raw capability peek/inspect exports do not exist. The only public verification
bridge returns one fixed capability status:

```text
fresh
consumed
invalid
```

The consume bridge returns only:

```text
consumed_now
already_consumed
invalid
```

Neither bridge returns or serializes the registry root, canonical digest, claim
lineage, READY digest, record metadata, timestamps, or any private operation
value. Callers provide the binding values they already hold and receive only a
fixed enum.

A copied object, a receipt, a pre-existing READY record, or a second invocation
cannot recreate current-invocation authority.

## Claim Receipt

The claim receipt has exactly these 12 fields:

```text
receipt_schema_version
claim_writer_contract_version
redaction_status
execution_mode
decision
preclaim_guard_decision
ready_guard_decision
claim_created_by_current_invocation
ready_record_present
terminal_or_ambiguous_evidence_present
retry_disposition
blocker_codes
```

The validator rejects missing fields, extra fields, unknown enums, duplicate
blockers, and incoherent decision/evidence combinations. Validation is
blocker-specific: every blocker is accepted only with its exact permitted
decision, guard-state, evidence, retry, and blocker-count tuple. No private
value is copied into this receipt.

## Deterministic Safari-Branded Port

The port is created only through:

```text
createWelcomeAudioSafariActuatorPort({
  execution_mode: deterministic_no_effect_test,
  deterministic_scenario
})
```

It is branded in module-private state, frozen, bound to the canonical Safari
surface enums, and rejected if a caller fabricates a lookalike object. It has
no browser handle, callback, shell, network client, UI driver, file picker,
path, identity, or payload.

The deterministic result has exactly these seven fields:

```text
result_schema_version
bound_to_current_operation
effect_boundary_entered
send_control_actuation_count
attempted_at
confirmation_marker
confirmation_checked_at
```

Deterministic scenarios cover a strong current confirmation, no or ambiguous
confirmation, late confirmation, mismatched confirmation, failure immediately
after the modeled effect boundary, a canonical pre-boundary zero-actuation
result, and an invalid multiple-actuation result. These are proof fixtures, not
live outcomes. Every receipt still fixes
`external_effect_invoked=false`, `browser_used=false`, and
`network_used=false`.

The canonical pre-boundary zero result means that the branded deterministic
port was invoked but never modeled the Send control being actuated. Port
invocation alone is not effect-boundary entry. Its terminal receipt must carry
this exact fail-closed tuple:

```text
effect_boundary_entered = false
derived_effect_boundary_entry_count = 0
send_control_actuation_count = 0
claim_consumed_by_current_invocation = true
current_capability_status = consumed
terminal_record_present = true
pending_record_present = false
retry_disposition = retry_forbidden_permanently_after_attempt
blocker_codes = [ACTUATION_COUNT]
```

`derived_effect_boundary_entry_count` documents the semantic derivation and is
not an additional public receipt field. Durable terminal evidence is required
before the pending record is removed. The operational receipt validator passes
the zero-actuation case only for the complete tuple above; weakening or mixing
any member fails closed. An actuation count of `2`, or any other multiple count,
remains receipt-invalid and is never normalized into this valid terminal case.

## Operational Executor API

The single-attempt API is:

```text
executeWelcomeAudioSafariAttempt({
  registry_root,
  private_claim_capability,
  expected_canonical_operation_sha256,
  branded_safari_actuator_port,
  now_ms
})
```

The composite API is:

```text
runWelcomeAudioOperationalRailOnce({
  registry_root,
  authoritative_preclaim_record_path,
  expected_canonical_operation_sha256,
  registry_policy,
  branded_safari_actuator_port,
  now_ms
})
```

The composite returns a claim receipt and, only when claim issuance returned a
fresh private capability, an operational receipt. The capability never leaves
the same-process call chain.

## Strict Attempt Ordering

The operational executor enforces this sequence:

1. validate the private capability, independently trusted digest, store root,
   and branded port;
2. inspect the shared store and reject existing pending or terminal evidence;
3. read READY and match its digest, device, inode, canonical digest, and exact
   owner/token/revision/attempt lineage to the capability;
4. acquire the same per-operation mutex;
5. re-read the same READY record and repeat the integrated guard validation;
6. derive an attempted-terminal snapshot with the claim token consumed, attempt
   count `1`, terminal attempt state, attempted-unconfirmed send claim, and
   permanent no-retry;
7. publish and sync pending attempted-terminal evidence;
8. consume the private capability;
9. invoke the branded deterministic port once;
10. validate the returned actuation count, current-operation binding,
    confirmation marker, and exact five-minute confirmation window;
11. publish final terminal evidence exclusively and durably;
12. return one redacted terminal receipt.

The only successful accepted actuation count is exactly `1`. Count `0` is not
success and is accepted only as the exact durable pre-boundary terminal
`ACTUATION_COUNT` tuple above. Count `2` or any other multiple/malformed count
is receipt-invalid. A port exception, missing/late/mismatched confirmation, or
publication uncertainty is terminal unknown/no-retry. No second invocation is
permitted to repair any of these outcomes.

## Operational Receipt

The operational receipt has exactly these 19 fields:

```text
receipt_schema_version
operational_executor_contract_version
redaction_status
execution_mode
decision
ready_guard_decision
terminal_guard_decision
claim_consumed_by_current_invocation
pending_record_present
terminal_record_present
effect_boundary_entered
send_control_actuation_count
confirmation_marker
external_effect_invoked
browser_used
network_used
retry_disposition
production_ready
blocker_codes
```

For this v1 lane the fixed public values include:

```text
execution_mode = deterministic_no_effect_test
external_effect_invoked = false
browser_used = false
network_used = false
production_ready = false
```

Receipt semantics are fail-closed:

- only `blocked_before_attempt` may carry
  `retry_disposition=not_applicable_before_attempt`;
- every operational decision other than `blocked_before_attempt` carries
  `retry_disposition=retry_forbidden_permanently_after_attempt`;
- first discovery of pre-existing pending or terminal evidence consumes the
  fresh current-invocation capability and records that fact;
- replay with a capability already consumed by an earlier invocation reports
  `claim_consumed_by_current_invocation=false` while remaining permanently
  non-retryable;
- the valid zero-actuation `ACTUATION_COUNT` tuple leaves the current capability
  durably consumed, terminal evidence present, pending evidence absent, and
  retry permanently forbidden;
- the validator rejects a decision, evidence, capability-consumption, actuation,
  confirmation, retry, or blocker tuple that does not match its exact semantic
  shape, including blocker-specific fail-closed requirements.

The private terminal record may bind the canonical digest, claim lineage,
terminal snapshot, guard decision, and deterministic actuator result. It stays
owner-only and never enters tracked documentation or the redacted receipt.

## Evidence Dominance And No Retry

- Existing READY before the current claim is replayed and grants no capability.
- `READY_PARTIAL` under a still-held mutex is `BUSY`; the same partial after the
  current serialized recheck is `UNKNOWN` and permanently non-retryable.
- Existing pending or partial evidence is unknown terminal and non-retryable;
  the first current invocation that discovers it consumes its fresh capability.
- Existing final evidence is replayed terminal and non-retryable; the first
  current invocation that discovers it consumes its fresh capability.
- Re-presenting an already-consumed capability cannot claim consumption by the
  replaying invocation and cannot reopen the operation.
- A busy mutex is fail-closed and is never reclaimed.
- READY changed between reads is terminal unknown for the current capability.
- Once pending evidence is durable, every later failure remains terminal.
- A missing or invalid receipt never reopens the attempt.
- A fresh process cannot reconstruct the consumed capability.

### Crash-Boundary Truth

When the deterministic actuator models a failure after the effect boundary, the
executor first fixes one immutable modeled result: boundary entered, one
actuation, no current confirmation. It never reconstructs that result from the
later filesystem state.

If terminal promotion then fails, the executor performs exactly one read-only
evidence reinspection. Evidence dominance alone derives the receipt flags:

- pending only -> `UNKNOWN`, pending present, permanent no-retry;
- terminal plus pending -> terminal dominates, terminal present, permanent
  no-retry.

The adversarial crash/concurrency subset covers both states and replay. The
second invocation reports zero boundary entry and zero actuation, so the two
invocations together can never exceed the single modeled actuation.

For the pre-boundary zero-actuation terminal case, replay also reports zero
boundary entry and zero Send-control actuations. It cannot mint a new
capability, consume a second capability effect, invoke a second modeled Send,
or alter the already-consumed status. The original terminal evidence remains
authoritative and permanent no-retry.

## Validation Record

Inherited operational-rail focused validation remains green:

- operation guard: `157/157`;
- shared-store-refactored synthetic one-shot executor: `45/45`;
- claim writer: `30/30`;
- deterministic Safari operational executor/composite: `12/12`;
- combined four-file focused total: `244/244`;
- targeted adversarial crash/concurrency/invalid-port subset: `7/7`.

The post-hardening owner-only captured full repository suite remains inherited
evidence for the integrated operational rail:

- files: `239/240`;
- tests: `1669/1670`;
- sole failure: the exact unchanged out-of-lane MailerLite approval-queue
  baseline.

Focused validation, the captured full-suite result, `git diff --check`, review,
commit, push, and central integration are complete for the inherited
operational rail. Fresh bridge-lane validation is also green: bridge-only
focused `44/44`; combined bridge-plus-inherited focused `276/276`, including
async session bridge `25/25` and operational executor `19/19`;
bridge-targeted adversarial `13/13`; and full repository `240/241` files and
`1701/1702` tests with only the exact unchanged out-of-lane Launch OS
approval-queue baseline failing. Independent code/adversarial and documentation
reviews, formal artifact review, commit, push, and central integration of the
exact bridge allowlist are complete. Those completed no-live gates grant no
send authority. The deferred rendezvous delta described above has completed
independent review and is the current artifact-review-pending lane.

### Redacted Validation Incident

A pre-existing full-suite fixture emitted a controlled test-recipient identifier
to local tool output before private output capture was enforced. Repetition
stopped immediately, and an owner-only redacted incident receipt was recorded
outside the repository. No production or private follower, token, credential,
live payload, network call, or external effect was involved. Future broad-run
output must be captured privately and reduced to aggregate counts only. Any
fixture replacement remains a separate out-of-lane follow-up; this document
neither quotes nor authorizes inspection or reproduction of the value.

The previously integrated synthetic one-shot executor proof retains its own
historical validation record. That record does not validate this new combined
rail.

## Closed Gates

- no live run;
- no Safari, Instagram, browser, UI, Computer Use, file picker, upload, preview,
  or send;
- no source read, profile opening, DM opening, candidate creation, or private
  identity use;
- no arbitrary callback or live actuator;
- no live registry or non-temporary operational state;
- no MailerLite, campaign, legacy proxy, CRM, card, Fact Store, ledger, scoring,
  automation, or source mutation;
- no private operational artifact or live receipt creation;
- no claim that the current deferred rendezvous formal artifact review, commit,
  push, or central integration is complete before those gates actually close;
- no reuse of the closed pilot or historical send as authority;
- no production readiness, send authority, or live authority.

## Future Canary Boundary

The deterministic rail and simulated async bridge are centrally integrated;
the independently reviewed, artifact-review-pending rendezvous delta also
grants no send authority. A future
one-recipient, one-audio, one-attempt
canary requires all of the following as later, separate gates:

1. a newly written mission contract bound to the exact integrated commit;
2. fresh explicit CEO approval for that exact canary effect;
3. fresh private source, exact identity/thread, exact asset, context, dedupe,
   and already-welcomed evidence;
4. an owner-only live store and claim issuer reviewed for that mission;
5. a separately reviewed real browser-bound Safari actuator that preserves the
   claim-to-pending-to-one-actuation-to-terminal ordering;
6. exact action-time confirmation if the future mission requires it;
7. strong current-operation confirmation and permanent no-retry for every
   attempted, timed-out, ambiguous, or unknown outcome.

No item above is created, approved, or satisfied by this lane.

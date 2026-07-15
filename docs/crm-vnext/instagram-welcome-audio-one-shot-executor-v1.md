# Instagram Welcome Audio One-Shot Executor v1

- `contract_version`: `crm_core_instagram_welcome_audio_one_shot_executor_v1`
- `execution_mode`: `synthetic_no_effect_proof_only`
- `status`: `shared_store_refactor_focused_and_full_green_external_review_pending_no_live`
- `live_authority`: `false`
- `send_allowed`: `false`
- `future_mission_required`: `true`

## Purpose

This contract closes one narrow technical gap left intentionally open by the
integrated Welcome Audio operation guard: serialization and durable one-shot
consumption of an already-authoritative `READY` operation. In the current lane,
its filesystem mechanics are factored into the shared owner-only one-shot store
used by the new claim writer and deterministic Safari operational rail. The
executor keeps its original public contract, decisions, receipt, synthetic-only
mode, and executor-specific record namespace.

The v1 executor proves only that one attempt budget can cross the durable
boundary once. It does not prove delivery, does not operate Instagram, and
does not grant live authority.

## Chosen Boundary

The Chief Architect selected boundary `A`:

```text
authoritative READY already exists
  -> executor re-reads and revalidates it
  -> executor consumes it durably once
  -> terminal unconfirmed no-retry snapshot exists
```

The executor does not:

- create a claim;
- promote `PRECLAIM` to `READY`;
- accept a caller-provided second copy of the READY snapshot;
- infer trusted digest or claim lineage from the READY record itself;
- create a reusable permit;
- change the guard's invariant `send_allowed=false`.

Claim issuance remains a separate future boundary.

## Exact Inputs

The function accepts only:

- an owner-only synthetic registry directory that is a direct child of the
  operating system temporary directory;
- a trusted canonical operation SHA-256 supplied independently of the READY
  record;
- an exact independently supplied claim lineage:
  - `claim_owner_id`;
  - `claim_token_id`;
  - `registry_revision`;
  - `attempt_id`;
- a numeric clock value;
- an optional deterministic synthetic fault-point enum.

No private value appears in the public receipt.

## Shared Store Boundary

The executor now consumes the shared primitives defined by
`crm_core_instagram_welcome_audio_one_shot_store_v1`. The registry remains
temporary, local, owner-only and proof-only. Reuse of the shared store module
does not merge executor records with the operational-rail namespace and does
not create a live registry.

- directory mode must be `0700`;
- record mode must be `0600`;
- ownership must match the current local user;
- the registry must be a direct child of the canonical system temporary root;
- the registry and READY record must not be symlinks;
- the READY record must have exactly one hard link;
- reads use `O_NOFOLLOW` and stable before/after file metadata;
- registry device and inode are pinned and revalidated;
- every registry mutation is bracketed by canonical-root identity checks;
- the serialization mutex device and inode are pinned before release;
- paths, digests, lineage and timestamps never enter the redacted receipt.

This is a cooperative owner-only serialization boundary, not a sandbox against
an actively malicious process running as the same local user. Any registry or
mutex identity drift that the executor observes fails closed and cannot reopen
the attempt.

The deterministic operation fingerprint derives only the private filenames
for:

- immutable authoritative READY input;
- pending terminal evidence;
- final terminal tombstone;
- per-operation serialization mutex.

These filenames are private local implementation details.

The shared store refactor must preserve the existing executor behavior exactly:
stable READY re-read, non-reclaiming mutex, synced pending evidence, exclusive
non-replace terminal publication, evidence dominance, replay closure, and the
fixed 15-field public receipt. The refactor required the focused and integrated
proof to be rerun against the current lane. That focused
rerun and the post-hardening owner-only captured full suite are now recorded
green for this lane below; external review remains pending.

The shared store also distinguishes incomplete READY publication as
`READY_PARTIAL`. In this existing boundary-A executor, partial READY evidence is
terminal-unknown/no-retry; it is never repaired or reclaimed into another
consumption attempt. The combined claim-writer rail applies the narrower
in-flight rule documented in `instagram-welcome-audio-operational-rail-v1.md`:
held mutex means `BUSY`, while a partial surviving the serialized recheck means
`UNKNOWN` and permanent no-retry.

## Authoritative READY Gate

The READY record is read before serialization and then re-read under the
mutex. Device, inode, size, modification time, change time, exact mode, hardlink
count, owner and byte digest must stay identical. The tests perform a real
deterministic replacement between those reads and require a fail-closed result
with no pending or final publication.

Under the mutex the integrated operation guard must return exactly:

```text
phase = postclaim_send_ready
decision = ready_for_one_send_attempt
state_valid = true
send_ready = true
send_allowed = false
one_shot_consumer_required = true
terminal = false
blockers = []
```

The READY record's canonical digest and all owner/token/revision/attempt
bindings in `effect_claim`, `execution` and `confirmation` must match the
independently supplied values exactly.

Any mismatch is `blocked_before_consume` and creates no terminal evidence.

## Atomic Boundary

The executor uses a deterministic per-operation mutex created by exclusive
`mkdir`.

- it never waits indefinitely;
- it never breaks, ages, reaps or reclaims an existing mutex;
- an existing mutex returns `serialization_busy_no_consume`;
- a mutex left by a crashed process remains fail-closed.

After the final READY re-read, the executor derives a terminal snapshot with
only the allowed lifecycle transition:

```text
claim_token_status = consumed
send_attempt_count = 1
attempt_state = attempted_terminal
send_claim = attempted_unconfirmed
retry_disposition = retry_forbidden_permanently_after_attempt
claim_token_consumed_at = boundary time
attempted_at = boundary time
confirmation_marker = none
confirmation.checked_at = boundary time
```

That snapshot must revalidate through the integrated guard as:

```text
phase = terminal_no_retry
decision = attempted_or_unknown_terminal_no_retry
state_valid = true
terminal = true
send_allowed = false
```

The private terminal record is synced to an exclusive pending file. The final
tombstone is then published from that same inode by an exclusive same-filesystem
hard link. The directory is synced. The pending name is removed only after
final publication, and the directory is synced again.

The implementation never uses a replacing rename.

## Evidence Dominance

Durable evidence always wins over retry:

- existing final tombstone -> `preexisting_or_replayed_terminal`;
- pending evidence without final -> `unknown_terminal_no_retry`;
- final plus pending -> final terminal evidence wins;
- partial pending/final temporary evidence -> `unknown_terminal_no_retry`;
- malformed, unsafe or colliding terminal evidence is never repaired into a
  new attempt;
- a missing receipt never reopens consumption.

No dead-owner or expired-mutex reclaim exists in v1.

## Deterministic Fault Points

The production module exposes no actuator callback. Tests may request only one
of three fixed fault enums:

| fault point | durable state after simulated crash | next invocation |
| --- | --- | --- |
| before pending publication | mutex only | busy, no consume |
| after pending publication | mutex plus pending | unknown terminal, no retry |
| after final publication | mutex plus pending plus final | replayed terminal, no retry |

The fault enums never invoke an external effect.

## Relationship To The Combined Operational Rail

The new combined no-effect contract is documented in
`instagram-welcome-audio-operational-rail-v1.md`. It adds a claim writer, an
opaque same-process one-use capability, a deterministic Safari-branded port,
an operational executor, and a same-process composite.

The capability exposes no raw peek or inspect API. Its verification bridge
returns only `fresh`, `consumed`, or `invalid`; its consumption bridge returns
only `consumed_now`, `already_consumed`, or `invalid`. Neither bridge returns
store, digest, lineage, or record metadata.

This existing executor is not silently promoted into that operational
executor. It remains the boundary-A consumer of an already-authoritative READY
record and exposes no capability issuer or actuator. Its shared store module is
the common mechanical substrate only.

For the combined rail, ordering is separately enforced as:

```text
claim issuance -> READY -> pending terminal evidence
  -> opaque capability consumption -> at most one deterministic actuation
  -> terminal evidence -> permanent no-retry
```

Every live/browser/source gate remains false.

## Public Receipt

The receipt has exactly these 15 fields:

```text
receipt_schema_version
executor_contract_version
redaction_status
execution_mode
decision
input_guard_decision
terminal_guard_decision
consumed_by_current_invocation
terminal_record_present
attempt_budget_consumed
external_effect_invoked
browser_used
network_used
retry_disposition
blocker_codes
```

All values are typed and enum-constrained. The receipt validator rejects extra
fields, missing fields and incoherent combinations.

The five public decisions are:

- `consumed_once_terminal_unconfirmed_no_effect`;
- `blocked_before_consume`;
- `serialization_busy_no_consume`;
- `preexisting_or_replayed_terminal`;
- `unknown_terminal_no_retry`.

Every receipt fixes these values:

```text
external_effect_invoked = false
browser_used = false
network_used = false
```

## Forbidden Capabilities

The productive executor module has no:

- browser or Computer Use driver;
- Safari, Chrome or in-app-browser integration;
- Instagram navigation;
- upload or file chooser action;
- arbitrary callback or actuator;
- network client;
- shell or child process;
- operational CLI;
- scheduler or recurrence;
- MailerLite, CRM, campaign or proxy access;
- live or owner-only operational registry access.

Importing the module causes no filesystem or external effect.

## Required Proof

The lane is not green until tests cover:

- one valid READY consumption and terminal guard revalidation;
- exact replay closure;
- digest and all lineage mismatches;
- preclaim, blocked and terminal input rejection;
- READY replacement between precheck and serialized re-read;
- two and 32 concurrent callers;
- independent multiprocess contention;
- all three deterministic crash points;
- final, pending, partial and coexisting evidence;
- real non-replace publication collisions at pending and final publication;
- stale mutex non-reclaim;
- path escape, private real path, symlink, mode, ownership and hardlink gates;
- receipt field allowlist, semantics and privacy;
- import in a fresh process with zero filesystem or output side effects;
- static absence of operational browser, network, child-process, CLI and
  actuator capability from the productive module;
- all five public decisions.

Historical validation record before the shared-store refactor:

- executor-focused suite: `45/45` green;
- integrated guard plus executor: `202/202` green;
- full repository suite: `1627/1628`; the sole failure is the unchanged
  out-of-lane MailerLite Launch OS approval-queue baseline;
- three independent code, adversarial-test and documentation/scope reviews:
  green with no remaining findings;
- Node syntax and `git diff --check`: green.

Current shared-store refactor validation is `45/45` green, and the combined
guard plus one-shot, claim-writer, and operational-executor focused total is
`244/244` green, including a `7/7` targeted adversarial
crash/concurrency/invalid-port subset. The
fresh post-hardening owner-only captured full repository suite was completed:
`239/240` files and `1669/1670` tests,
with the sole failure the exact unchanged out-of-lane MailerLite approval-queue
baseline. Independent delta review and final external verdict remain pending. The historical counts
above were not reused as proof of the new rail; the focused and full results
were rerun against the current lane.

The combined executor's crash receipt does not infer actuation from promotion
state. It fixes the modeled after-boundary result before promotion, performs one
read-only evidence reinspection after a promotion fault, and lets terminal
evidence dominate pending evidence. Pending-only and terminal-plus-pending tests
both close permanently with no second actuation.

The combined rail also has one canonical pre-boundary zero-actuation terminal
case. Invoking its branded deterministic port does not itself enter the effect
boundary. The case is valid only with `effect_boundary_entered=false`, derived
boundary-entry count `0`, `send_control_actuation_count=0`, the current
capability durably consumed, final terminal evidence present, pending evidence
absent after completion, permanent no-retry, and the `ACTUATION_COUNT` blocker.
Replay keeps both boundary and actuation counts at zero and cannot mint or
consume a second capability effect. An actuation count of `2` remains an
invalid receipt rather than a second terminal shape.

## Completion Boundary

Green tests prove only the local one-shot serialization boundary. The current
shared-store refactor and combined rail must first receive their own fresh
validation and review.

They do not make the system production-ready and do not authorize a send. A
future live path still requires:

- central integration of the current no-effect operational-rail lane after its
  validation and review;
- a separately reviewed live claim-issuance boundary; the deterministic claim
  writer in the operational-rail lane is not a live issuer;
- an explicitly written and freshly approved mission contract;
- fresh private evidence, exact identity binding, asset binding and dedupe;
- an approved real browser-bound adapter that invokes an exact effect only
  after durable pending terminal evidence; the deterministic Safari-branded
  port is not a browser driver;
- strong post-send confirmation and permanent no-retry handling.

Only after those gates are integrated may a newly written mission plus fresh
explicit CEO approval authorize a one-recipient, one-audio, one-attempt canary.

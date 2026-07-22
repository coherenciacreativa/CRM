# CRM Core IAB Semantic Source to Safari Handoff Proof Mission v1

Date: 2026-07-19

```yaml
mission_id: crm_core_iab_semantic_source_to_safari_handoff_proof_v1_20260719
contract_version: v1_20260719_repo_and_bounded_read_only_proof
status: approved_for_repo_only_implementation_no_live_effect
approved_baseline: efddb21ef6c598e1452ea2a9912235dea431e2ef
source_branch: codex/crm-core-iab-semantic-source-to-safari-handoff-v1
excluded_commit: e9545637c88e6e1cab8ac7be34d9725410a363ec
business_outcome: >-
  Give CRM Core reliable read-only semantic eyes for recent Instagram follower
  evidence, bind one complete candidate through opaque one-use capabilities,
  and hand only authenticated provenance into the existing PRECLAIM and
  Safari-only actuation rail.
architecture:
  source_backend: codex_in_app_browser_semantic_read_only_v1
  actuator_backend: safari_computer_use_existing_rail_unchanged
  chrome_fallback: forbidden
  safari_source_fallback: forbidden
  ocr_or_screenshot_fallback: forbidden
  downstream_policy: expand_and_close_downstream_provenance_in_the_same_mission
  production_chain:
    - private_complete_source_capability
    - private_source_artifact_capability
    - private_draft_admission_capability
    - fixed_live_canary_runner
  legacy_plain_data: compatibility_no_live_only_never_productive_admission
exact_allowlist:
  - scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.spec.ts
  - docs/crm-vnext/instagram-welcome-audio-iab-semantic-follower-source-host-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-artifact-materializer-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-canary-packet-materializer-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-preclaim-builder-and-live-canary-runner-v1.md
  - docs/crm-vnext/crm-core-real-new-follower-welcome-e2e-proof-mission-v0.md
  - docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md
  - docs/crm-vnext/crm-core-next-action.md
  - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
runtime_seam:
  slot: crm-core/iab-semantic-source-runtime/v1
  owner: environment_same_process
  requirements:
    - fixed own-property branded slot and same-identity alias
    - frozen closed non-Proxy facade with exact methods
    - facade owns isolated tab routes bounded queries bounded clicks and finalize
    - no caller runtime driver facade URL selector DOM snapshot clock identity thread owner or truth boolean
    - no raw Browser tab locator screenshot coordinate evaluate callback network or backend selector exposure
  test_installation: ForTest_exports_only
capability_rules:
  - every production capability is opaque nonserializable noncloneable and WeakMap-backed
  - consume burns before mismatch freshness or later validation
  - replay foreign clone stale expiry out-of-order or cross-mission use fails closed
  - capabilities are never persisted and dedupe UNKNOWN blocks
stage_1_repo_only:
  - deterministic adversarial tests and complete compatibility suite
  - no Browser Safari source private fixed root upload preview Send or external effect
stage_2_real_read_only_requires_fresh_exact_approval:
  max_rows_per_traversal: 8
  exact_distinct_notification_profile_traversals: 2
  max_threads_opened: 0
  capabilities_issued: 0
  seen_transitions: 0
stage_3_real_read_only_requires_fresh_exact_approval:
  max_rows: 8
  max_candidates: 1
  max_threads_opened: 1
  uploads: 0
  previews: 0
  sends: 0
  preopen_unread_inbound_required: explicit_none
  unread_or_unknown: block_before_thread_open
  seen_transition_authorized: false
  seen_transition_observed_required: false
  success: complete_source_candidate_qualified_read_only
forbidden_scope:
  - attachment file chooser upload preview or Send
  - text follow-back reaction comment or relationship change
  - MailerLite CRM campaign Ads proxy or any mutation
  - live source access without a fresh exact CEO approval for Stage 2 or Stage 3
  - any backend fallback source family file or permission outside this contract
  - any central integration before stages review and a separate integration verdict
correction_budget:
  implementation_corrections_after_first_build: 2
  stage_attempts: one_normal_plus_one_bounded_recovery
  repeated_same_cause: abandon_and_replan_route
review_and_integration:
  - exact allowlist and diff checks green
  - focused tests green; full compatibility green or closed only by the frozen-checkpoint baseline_environment_equivalent_non_regression rule below
  - Stage 2 and Stage 3 green on the frozen commit under fresh exact approval
  - independent adversarial review has no unresolved P0-P2 finding
  - formal Chief Architect integration review is separately complete
  - one serialized central integration only after explicit safe-to-integrate authority
later_live_gate: >-
  This mission grants no Send or live authority. A one-recipient canary requires
  a fresh approval bound to the exact integrated commit, current owner-only
  audio and mission artifacts, green Safari gates, claim-before-effect, one
  Send, visible same-thread confirmation, and permanent no-retry ambiguity.
```

The In-App Browser is a read-only source in this mission. Safari remains the
only possible actuator. Splitting discovery from actuation is admitted only by
the capability chain above and does not create a second Send surface.

## Atomic P2 Truthfulness Closure — 2026-07-19

The controlling Chief Architect boundary permits one bounded same-branch,
repo-only correction round for receipt truthfulness. It does not authorize
Stage 2, Stage 3, source execution, central integration, a live invocation, or
any external effect; `safe_to_self_integrate_now=false` remains controlling.

Within the exact eighteen-file final-diff allowlist, the packet and runner edge
must close these two downstream inconsistencies in the same implementation
pass:

1. packet v2 reserves `INPUT_SCHEMA` for rejection before capability
   consumption, uses a distinct blocker for an invalid test clock found after
   successful burn/admission, and preserves
   `source_artifact_capability_consumed=true` under every later blocker; and
2. runner v2 validates exact reachable progress by blocker and decision, with
   `DRAFT_ADMISSION_INVALID` and every other early blocker requiring zero later
   milestones.

Acceptance requires the focused packet and runner suites fully green, syntax
checks for both scripts, `git diff --check`, exact allowlist preservation, and
independent review with no unresolved P0–P2. A newly required file, productive
export, backend, capability, authority, browser route, or live behavior stops
the closure instead of widening it. Even a green result remains an isolated
repo-only implementation pending a later formal integration verdict.

## Narrow Production-Emitter Compatibility Assertion — 2026-07-20

The qualification-receipt test uses a bounded, representative compatibility
claim. It does not claim completeness, surjectivity, or equivalence over every
safe integer or every value combination admitted by the public validator.

The correction micro-allowlist is exactly:

1. `__tests__/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.spec.ts`
2. `docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md`

The test witnesses are collected only through the productive
`qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce` entrypoint. The
`ForTest` emitter is not a witness source. Representative productive emissions
include exact success, pre-open failures, malformed reports, finalize failure,
and accepted safe-integer boundary families represented with
`Number.MAX_SAFE_INTEGER` for row, thread, and seen-transition counts.

Acceptance requires every representative productive emission to validate,
deterministic safety-relevant forgeries to reject, and receipt canonicalization
to match the validator's accepted data-object semantics. Key insertion order
and property enumerability, writability, or configurability are not treated as
contract requirements because the public validator does not impose them.

This correction changes no production code, validator behavior, public schema,
export, capability, authority, backend, browser selection, source access,
private artifact access, central integration state, or external effect. A
failure in either allowlisted file or any need to widen that scope remains
`HOLD`.

## Frozen Baseline-Environment-Equivalent Non-Regression Closure — 2026-07-21

For this exact frozen repo-only checkpoint only, the classification
`baseline_environment_equivalent_non_regression` may satisfy the
full-compatibility portion of `review_and_integration`. It does not classify the
failing tests as green, create a reusable failure allowlist, or waive any other
mission gate.

The correction micro-allowlist is exactly:

1. `docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md`

All other lane content must remain byte-identical to the pre-amendment
checkpoint. After this amendment, the lane must be frozen by exact HEAD,
status, and complete diff digest before testing; that frozen state must remain
unchanged through review.

Admission requires every condition below:

1. clean central and the lane share the exact approved baseline;
2. the focused source suite and the bounded four-suite
   semantic-source-to-Safari bridge set are fully green on the frozen lane;
3. the same complete compatibility command is executed once on clean central
   and then once on the frozen lane, consecutively on the same host, operating
   system, Node toolchain, dependency state, command, and test configuration,
   without filtering, retry, dependency change, or intervening repository
   change;
4. central and lane produce the exact same normalized failure fingerprint,
   limited to the two host-normalized unsafe mode fixtures and the same single
   timeout coupled to the same `fs.watch` `EMFILE` resource-exhaustion
   diagnostic; aggregate pass and total cardinalities are recorded but are not
   an equivalence criterion because the lane adds a fully green focused suite;
5. test identity, fixture identity, error class, assertion outcome, timeout
   identity, and normalized diagnostic family match between central and lane;
   there is no additional failure, timeout, skipped test, unhandled error,
   changed assertion, or lane-only diagnostic;
6. clean-central status and the frozen lane HEAD, status, and complete diff
   digest are unchanged after both runs; and
7. independent adversarial review reports no unresolved P0–P2 finding.

Any mismatch, nondeterministic outcome, additional failure, changed checkpoint,
need for another file, or inability to prove exact equivalence remains `HOLD`.
Historical cardinality or a prior occurrence is never sufficient evidence for
this classification.

This closure grants no Stage 2, Stage 3, source access, central integration,
live invocation, browser authority, or external effect. Stage 2 remains blocked
until this closure is complete and still requires its separate fresh exact
approval under the existing mission contract.

## Combined Repo-Only Integration Gate Supersession — 2026-07-22

For this combined repo-only integration only, the earlier requirement to
execute real Stage 2 and real Stage 3 before central integration is explicitly
superseded. The pinned reviewed implementation subrange runs from central
baseline `efddb21ef6c598e1452ea2a9912235dea431e2ef` through corrective
checkpoint `fb2a40497b24938f1a2dcc818b8fedab7d0d82c2` and comprises exactly 3
commits across 21 files. This narrow supersession does not waive any test,
independent-review, formal Chief Architect review, or serialized-integration
gate, and it grants no source or live authority.

The subsequent docs-only closeout commit is outside that 3-commit/21-file
implementation subrange. A fresh integration packet must count and identify it
separately while still reporting the complete final integration range.

The semantic source-to-Safari bridge in that range is a no-live foundation
only. Repo-only implementation is closed as complete with
`real_stage_2_executed=false`, `real_stage_3_executed=false`,
`source_actions=0`, `canary_ready=false`, `production_ready=false`,
`send_allowed=false`, and `live_authority=false`.

A historical v3 draft-admission capability presented to the productive live
v2 consumer is burned and rejected. It is never admitted to the runner or to
the Safari actuation rail.

Productive Stage 2 authority must be designed and reviewed under a separate
future mission before any real source action. Any real Stage 3 must likewise
be introduced by its own later mission after Stage 2 evidence exists. The sole
next product boundary after this repo-only integration closeout is the design
and review of that productive Stage 2 authority; neither real stage is part of
this combined integration.

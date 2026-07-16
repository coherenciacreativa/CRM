# CRM Core Welcome Audio Source Capability Gate Proof Mission v1

Date: 2026-07-16

- `mission_id`:
  `crm_core_welcome_audio_source_capability_gate_proof_v1_20260716`
- `mode`: `proof`
- `status`: `approved_in_progress_repo_only_synthetic_no_source_authority`
- `approved_baseline`:
  `adbdbfcceaab296af03d44afd1e64a9513105f1a`
- `authorization_phrase`: `adelante con el siguiente desarrollo`

## Business Outcome

Implement and prove one pure deterministic gate that classifies a synthetic,
caller-supplied source observation as exactly one of:

- `source_capable`;
- `blocked_no_accessible_rows`; or
- `blocked_ambiguous_or_inferred`.

The mission makes the prior fail-closed source result explicit and testable. It
does not access or improve the source, generate candidates, create a private
bundle, or make a real canary ready.

## Baseline Truth

The prior mission
`crm_core_sealed_backlog_manifest_bootstrap_no_effect_v1_20260716` completed
fail-closed at central commit
`adbdbfcceaab296af03d44afd1e64a9513105f1a`.

- authenticated Instagram Notifications surface reached: true
- accessible and verifiable follower rows found: 0
- profiles opened: 0
- threads opened: 0
- records sealed: 0
- external effects: 0

The row result means the source exposed no accessible and verifiable follower
rows to that bounded bootstrap. It must never be restated as zero followers.

## Exact File Allowlist

Only these six tracked files may change:

1. `scripts/crm-vnext-instagram-welcome-audio-source-capability-gate.mjs`
2. `__tests__/crm-vnext-instagram-welcome-audio-source-capability-gate.spec.ts`
3. `docs/crm-vnext/instagram-welcome-audio-source-capability-gate-v1.md`
4. `docs/crm-vnext/crm-core-welcome-audio-source-capability-gate-proof-mission-v1.md`
5. `docs/crm-vnext/crm-core-next-action.md`
6. `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`

Any required change outside this allowlist blocks the mission pending new
approval.

## Approved Scope

- read the current repo baseline and the exact allowlisted files;
- implement the pure data-only gate;
- add deterministic synthetic tests for every decision and fail-closed edge;
- update only the allowlisted contracts and routing pointers;
- run focused and compatibility tests that have no source, browser, network, or
  private-artifact access;
- obtain an independent adversarial review; and
- if implementation, tests, allowlist audit, privacy audit, and independent
  review are all green, perform at most one serialized central integration
  under the established central lock.

The authorization phrase covers only this repo-only synthetic implementation,
tests, review, and one green locked integration.

## Observable Success

The mission is green only when all of the following are true:

- the gate can return only the three exact decisions;
- `source_capable` requires at least one accessible and verifiable row and
  explicit exact evidence for source event, owner account, identity, thread,
  absolute source time, and sealed-interval membership for every evaluated row;
- the input contains at most eight rows, has a deterministic exact order, and
  contains no duplicate rows or bindings;
- `blocked_no_accessible_rows` requires an exact fresh loaded/authenticated
  Notifications-surface observation, `row_access_status=not_exposed`, zero
  records, `campaign_interval=null`,
  `record_order_evidence=no_rows_available_for_ordering`,
  `owner_account_reference_utf8=null`, and
  `owner_binding_evidence=not_observed_due_to_no_accessible_rows`, without
  claiming zero followers;
- the no-row receipt affirms the exact surface admission facts and zero counts;
  campaign interval, absolute record time, UTF-8, identity, thread, owner, and
  source-event evidence remain false, while deterministic order and duplicate
  freedom are true only as structural facts of the exact empty-set sentinel;
- malformed, missing, conflicting, approximate, relative-time, ambiguous, or
  inferred evidence, more than eight rows, duplicates, and nondeterministic
  order all yield `blocked_ambiguous_or_inferred`;
- an invalid mission, surface, or fresh surface timestamp, a missing or
  substituted no-row sentinel, a nonempty record set, or any private campaign,
  owner, record, identity, thread, source-event, campaign-time, follow-time, or
  record-observation-time claim in a no-row envelope yields
  `blocked_ambiguous_or_inferred`;
- any supplied inaccessible or unverifiable row, including one row in a mixed
  accessibility set, yields `blocked_ambiguous_or_inferred` before the empty-row
  rule is considered;
- accessibility is represented only as a set-level invariant:
  `exposed_exact` attests the complete closed record set, `not_exposed` is valid
  only with zero records, and any per-row or mixed claim is unrepresentable and
  therefore fail-closed;
- identity normalization, duplicate collapsing, derived ordering, OCR-only
  identity, or any other evidence completion is rejected as inference;
- the surface observation timestamp is always canonical UTC, not future, and
  fresh within five minutes of the caller-supplied integer reference clock;
  only the source-capable branch contains per-record observation and historical
  follow times, with fresh record observation and exact sealed-interval
  membership respectively;
- plain closed-key inputs are snapshotted from own data descriptors, while
  accessors, callbacks, executable-shaped values, unsafe Proxies, unknown keys,
  sparse arrays, and non-plain prototypes fail closed; accessor values,
  callbacks, and functions are never invoked, and hostile-object failures never
  reflect thrown values into the receipt;
- the result is aggregate and redacted, with no private evidence echoed;
- every path fixes `source_execution=false`, `canary_ready=false`, and
  `live_authority=false`;
- focused tests and the relevant compatibility suite are green;
- an independent reviewer returns a green verdict with no unresolved P0-P2
  finding; and
- the exact six-file allowlist is preserved through the optional single locked
  integration.

## Forbidden Scope

- Safari, Chrome, in-app browser, Instagram, Computer Use, OCR, screenshots, or
  any source execution;
- reading, creating, updating, or inspecting private artifacts;
- notification, profile, thread, DM, candidate, or backlog source access;
- candidate generation, sealed bundles, staging bundles, live approval packets,
  or canary execution;
- attachment, upload, audio, text, follow-back, reaction, comment, resend, or
  any representational effect;
- MailerLite, CRM, campaign, Ads, or proxy access or mutation;
- network use, secrets, credentials, tokens, raw payloads, or private values in
  tracked files or receipts;
- polling, retry, baseline/delta monitoring, webhooks, multi-browser fallback,
  or a general source-capture abstraction;
- any file outside the exact six-file allowlist; and
- more than one central integration attempt.

## Review Contract

The independent reviewer must adversarially verify:

- exact three-decision closure and precedence;
- branch-specific no-row sentinels and receipt truth, with no campaign, owner,
  record, identity, thread, source-event, campaign-time, follow-time, or
  record-observation-time evidence smuggled into the no-row path, while
  preserving the required fresh surface-observation timestamp;
- no-row receipt consistency: surface load/authentication true, row access
  false, campaign/record-time/UTF-8/identity/thread/owner/source-event evidence
  false, and deterministic-order plus duplicate-free true only as structural
  facts of the exact empty-set sentinel;
- no inference, normalization, fabricated bindings, or relative-time acceptance;
- rejection of executable-shaped or capability-bearing input;
- no private value reflection in the public result;
- immutable false live flags for every path;
- no browser, source, network, private-artifact, or external-effect capability;
- exact six-file diff scope; and
- no statement that the prior result proved zero followers.

A reviewer must not edit implementation files. Any unresolved P0-P2 finding or
ambiguous review verdict blocks integration.

## Central Integration Gate

At most one integration may occur, under the central lock, after all observable
success and review conditions are green. The integrator must recheck:

- exact source commit and clean expected worktree state;
- exact six-file allowlist;
- focused and compatibility validation;
- independent green verdict;
- no private or external artifacts in the diff; and
- `source_execution=false`, `canary_ready=false`, and
  `live_authority=false` in code, tests, and contracts.

Integration does not authorize source execution, reopen the failed bootstrap,
make rows accessible, create candidates, or make a canary ready.

## Stop Conditions

Stop without integration if any requirement needs inference, if a private value
or source capability enters scope, if any file outside the allowlist changes,
if a test or review is not green, or if central lock integrity cannot be proven.

## Required Closeout

Report only aggregate repo evidence:

- final decision vocabulary;
- focused and compatibility test counts;
- independent review verdict;
- exact changed-file count;
- integration status and canonical commit if integration occurs; and
- fixed flags: `source_execution=false`, `canary_ready=false`,
  `live_authority=false`, `external_effects=0`.

Never include private identities, handles, IDs, group references, source
anchors, screenshots, OCR text, private messages, raw payloads, tokens,
credentials, or private artifact contents.

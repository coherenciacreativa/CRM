# CRM Core Consultant UI Relay / Autonomous Lane Sprint Protocol v0

Date: 2026-07-02
Status: no-run central protocol

## Purpose

Define how CRM Core can let a Codex lane worker interact with a dedicated
ChatGPT consultant through browser UI relay, receive structured verdicts, apply
bounded lane-local fixes, commit lane-local docs-only artifacts, and stop
before source/action boundaries.

This protocol does not authorize UI relay execution, ChatGPT access, Chrome,
Safari, Computer Use, APIs, Instagram, DMs, welcome audio, MailerLite, Gmail,
Meta Business Suite, private artifact inspection, candidate queue generation,
source actions, CRM/source writes, Launch OS docs, or
`/Users/alejandrogomez/CRM`.

Storage and Mantis-operator boundaries are governed by
`docs/crm-vnext/crm-core-storage-and-mantis-operator-boundary-policy-v0.md`.

## Proven Pilot Evidence

The Welcome Audio lane proved the following pattern during Pilot 6:

- Chrome target chat confirmation.
- Direct consultant target/bookmark usage.
- `chrome_clipboard_paste_single_message` transport.
- Copy-button response capture.
- Packet ID validation.
- Consultant ID validation.
- Sentinel validation.
- Compact packet recovery after oversized packet failure.
- Consultant selected a next task.
- Codex executed lane-local no-run design.
- Consultant requested one mechanical fix.
- Codex applied one mechanical fix.
- Consultant returned `green_to_commit_later`.
- Codex committed and pushed lane-local docs.
- Central integration later merged the lane artifacts.

Commit references:

- `8224373068ee50e260d62e775f38a44938f39ea6`
- `d3d03ce48db6080459fcb7fd51dfd7d73a88adc4`
- central integration commit:
  `35b85df906d2c5628a685d248a9ed95ee75767e9`

## Three-Lane Proof Status

Consultant UI Relay / Autonomous Lane Sprint is now proven across the first
three CRM Core lanes:

- Welcome Audio proved the first bounded autonomous consultant-Codex sprint
  with task selection, artifact execution, mechanical fix,
  `green_to_commit_later`, commit/push, and central integration.
- Instagram API readiness proved the private target URL registry route,
  direct-open handshake, task selection, artifact review,
  `green_to_commit_later`, commit/push, and central integration.
- MailerLite onboarding proved the private target URL registry route in a
  third lane, with setup inventory answer-intake packet design,
  `green_to_commit_later`, and commit/push.
- The three-lane proof does not authorize live source actions, APIs,
  Instagram, MailerLite UI, Gmail, DMs, welcome audio, candidate queue
  generation, private artifact inspection beyond explicit target registries,
  or CRM/source writes.
- The proven v0 use case is docs-only, no-run, lane-owned artifact development
  with consultant review.

Commit references:

Welcome Audio:

- `8224373068ee50e260d62e775f38a44938f39ea6`
- `d3d03ce48db6080459fcb7fd51dfd7d73a88adc4`
- `35b85df906d2c5628a685d248a9ed95ee75767e9`

Instagram API:

- `5ec16f72d87394c6acdfc03fac9bc16cb652bb83`
- `ad0777c9fad2acd6dbac22310043d74850678445`

MailerLite:

- `0c5a8840069d0f4acdaabcffbec4539c46b4e77a`

## Private Target URL Registry Route

The Instagram API readiness pilot proved a more robust target route than
bookmark-menu or active-tab detection. The target URL registry route is the
preferred v0 target route when available.

- The target URL may be captured only after Alejandro opens the correct
  consultant chat and copies the URL intentionally.
- The preferred future target registry path is:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

- Raw target URLs must never be printed in chat, Mantis-Reports, tracked docs,
  receipts, or returned output.
- The registry stores `target_url_secret=true`.
- Central integration must not inspect or copy raw target URLs.
- Future relay runs may open Chrome directly to the private registry URL only
  for consultant UI relay.
- Every direct-open run must still perform a harmless handshake before sending
  lane packets.
- No action may proceed unless the handshake returns:
  - expected `packet_id`;
  - expected `consultant_id`;
  - `target_verdict=target_confirmed`;
  - expected target sentinel.
- If direct-open handshake fails, stop.
- If the registry is missing, stale, ambiguous, or exposes unrelated ChatGPT
  content, stop and escalate.
- The registry route does not authorize ChatGPT history browsing, browser
  history, bookmarks, new chat creation, project browsing, or unrelated chat
  inspection.
- Existing target registry under Mantis-Private-Source-Artifacts may remain as
  a legacy continuity path only for non-Chief-Architect historical targets.
  It is forbidden for every Chief Architect relay. Future registry writes
  should prefer CRM-Core-Private-Artifacts.

### Chief Architect Canonical Project Gate

Every relay whose `consultant_id` is `chief-architect-integration`, or is an
explicitly registered mission target matching
`chief-architect-mission-contract-YYYY-MM-DD-<slug>`, uses two fail-closed
phases built into Consultant Relay Lock v0:

1. `direct_target_open` first passes the static private-registry gate, opens
   the registered target while holding the lock, and confirms the visible
   exact project and chat.
2. Every handshake, send, capture, reformat, or receipt acquisition then passes
   the dynamic gate using that fresh visible observation.

The preflight requires all of the following:

- the private registry and its directory are owner-only;
- the target is bound to project name exactly `CRM Core — Chief Architect`;
- the standing target chat is exactly `00 — North Star & Portfolio`;
- a mission target uses an exact `Mission — <outcome> — YYYY-MM-DD` label whose
  date matches its target id, has its own registry entry and route receipt, and
  leaves the standing target byte-for-byte unchanged;
- a mission target's project-route fingerprint exactly matches the standing
  target's project-route fingerprint;
- the target URL is a project-chat route whose private route fingerprint
  and private chat fingerprint match the registered canonical fingerprints;
- Project-only memory, private/unshared state, the canonical instructions,
  thirteen sources, and the four required standing chats were verified;
- the binding was verified after the 2026-07-11 bootstrap;
- `legacy_project_used=false`;
- before any post-open action, the operator supplies a fresh visible UI
  observation, no older than ten
  minutes, confirming the exact project, exact standing chat, Project-only
  memory, private state, canonical instructions, and redacted project/chat
  route fingerprints matching the registry.

`CRM build` and every other project fail closed. A prior handshake cannot
override this gate. Preflight output is boolean/redacted and never returns the
raw target URL or registry contents.

## Chief Architect Integration Relay

Lane Codex workers may use the confirmed `chief-architect-integration`
consultant target for central integration review packets.

This target is for central integration review only, not lane artifact review.

Chief Architect Integration Consultant may return `green_to_self_integrate`
only under the Central Integration Self-Service Protocol.

Consultant UI Relay Lock v0 is required for the relay critical sections.

Central integration remains single-threaded.

Actual self-integration is not fully enabled until Central Integration Lock v0
exists or Alejandro explicitly approves a one-off central integration.

Reference:

```text
docs/crm-vnext/crm-core-central-integration-self-service-protocol-v0.md
```

## Consultant Relay Lock v0

CRM Core may allow multiple lane workers to prepare work in parallel, but
Chrome/clipboard/Copy-button/target-registry critical sections must be
serialized.

The lock is required before any operation that uses:

- macOS clipboard;
- Chrome consultant UI;
- ChatGPT composer paste;
- ChatGPT Copy button;
- private target registry write/update;
- consultant response capture.

Default lock path:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/.relay-lock
```

Utility:

```text
scripts/crm-vnext-consultant-relay-lock.mjs
```

Package script:

```text
npm run crm:vnext:consultant-relay-lock -- <command>
```

The utility uses atomic `mkdir` for acquisition. Lock metadata must be
redacted. Raw target URLs must never be stored in lock metadata, receipts,
tracked docs, or returned output.

Owner token may be returned only to the process that acquired the lock; lock
metadata stores only token hash. Release requires a matching owner token.

Stale locks are reported but not automatically broken in v0. A stale lock
requires Alejandro / Chief Architect decision or a future explicit stale-lock
cleanup boundary.

Hold the lock only for short critical sections. Release the lock before waiting
for consultant response. Do not hold the lock for the full 45-minute sprint.
Waiting for consultant thinking/generation does not require the lock.

Preparing docs, writing lane artifacts, running `git diff --check`, applying
mechanical fixes, and committing lane-local docs do not require the lock.

If lock cannot be acquired within bounded wait, stop and report. If a lane
crashes while holding a lock, the next lane must report stale/held lock and stop
unless a separate stale-lock cleanup is approved.

The lock coordinates Codex workers, not Alejandro's manual browser use; if
Alejandro is using Chrome during a critical section, stop or wait.

### Critical Section Pattern

1. Acquire lock.
2. Open/direct target or focus confirmed consultant route.
3. Paste/send packet or use Copy button/capture reply.
4. Validate immediate UI result if applicable.
5. Release lock.
6. Wait for consultant response without lock.
7. Re-acquire lock for capture.
8. Copy response.
9. Release lock.
10. Validate packet_id, consultant_id, verdict, and sentinel outside or after
    critical section.

Chief Architect carve-out: the `direct_target_open` lock is static-open-only.
It may open the registered route and confirm the visible exact project/chat,
then it must be released. A separate dynamic post-open acquisition with a fresh
UI observation is mandatory before handshake, paste/send, Copy response, or
capture. Never reuse the static-open lock for a post-open action.

### Parallelism Rule

Multiple lanes may work concurrently on local docs, task packet preparation,
artifact drafting, and waiting for consultant responses.

Only one lane may perform consultant UI relay critical sections at a time.

Central integration remains single-threaded.

Source/live actions remain single-threaded and separately approval-gated.

Consultant UI relay parallelism does not authorize source actions, APIs, DMs,
welcome audio sends, MailerLite/Gmail access, private artifact inspection,
candidate queue generation, or CRM/source writes.

## Parallel Full-Power Lane Coordination

Consultant Relay Lock v0 allows multiple lanes to prepare local work in
parallel while serializing Chrome/clipboard/Copy-button/target-registry
critical sections.

Parallel full-power mode must also follow:

```text
docs/crm-vnext/crm-core-parallel-full-power-lane-coordination-protocol-v0.md
```

Parallel task packets must include freshness tokens and parallel conflict
guardrails.

Consultant UI relay parallelism still does not authorize source actions, APIs,
DMs, welcome audio, MailerLite/Gmail access, private artifact inspection,
candidate queue generation, or CRM/source writes.

## Canonical Transport

Canonical v0 accepts target routes in this priority order:

1. Private target URL registry + direct Chrome open + handshake.
2. User-opened active tab + handshake.
3. Direct bookmark or saved target + visible confirmation or handshake.
4. Manual relay fallback.

For any accepted target route, the transport remains:

- Before using Chrome/clipboard/Copy button, acquire Consultant Relay Lock v0.
- Chrome only.
- Dedicated consultant chat.
- Visible target confirmation or handshake required.
- No ChatGPT history browsing.
- No unrelated chats.
- No project browsing.
- Prepare the complete prompt before touching the composer.
- Insert it with one clipboard paste; never stream multiline content with
  repeated typing actions.
- Send by clicking the Send button, never by pressing Enter.
- Copy the final assistant message using ChatGPT's Copy response button and
  verify that the clipboard was replaced before parsing it.
- Store copied reply under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Existing historical relay receipts under Mantis-Reports/consultant-relay may
remain. Future consultant-relay telemetry should use
CRM-Core-Reports/consultant-relay.

After capture, validate:

- packet id;
- consultant id;
- verdict field;
- expected sentinel.

No action may be taken from a relay response until all required identifiers and
the expected sentinel are present.

## Packet Format

Every relay packet must include:

- `packet_id`
- `expected_consultant_id`
- `target_chat_label`
- `source_workstream`
- `source_branch`
- `source_worktree`
- `purpose`
- `current_repo_state`
- `files_changed`
- `task_artifact_summary`
- `closed_gates`
- `consultant_question`
- `required_response_format`
- `sentinel`

Packet fields must be redacted. Packets must not include private artifacts,
source data, handles, emails, names, tokens, cookies, headers, env values,
credentials, screenshots, DMs, or unrelated ChatGPT content.

## Consultant Verdict Schema

Allowed verdicts:

- `green_to_commit_later`
- `needs_mechanical_fix`
- `needs_lane_redesign`
- `hold`
- `ceo_decision_needed`
- `central_decision_needed`

Required response fields:

- `packet_id`
- `consultant_id`
- `consultant_verdict`
- `reason`
- `required_mechanical_fix`
- `safe_to_apply_mechanical_fix_now`
- `safe_to_commit_later`
- `ceo_decision_needed`
- `forbidden_scope_concerns`
- `integration_note`
- `recommended_next_step`
- `sentinel`

Responses that omit any required field are non-actionable. If the response is
ambiguous, the lane must stop or request a compact clarification within the
bounded recovery rules.

## Sentinels

Standard sentinels:

- `RELAY_VERDICT_COMPLETE`
- `RELAY_TASK_PACKET_REVIEW_COMPLETE`
- `RELAY_ARTIFACT_REVIEW_COMPLETE`
- `RELAY_NEXT_TASK_SELECTION_COMPLETE`
- `RELAY_SELECTED_TASK_REVIEW_COMPLETE`

No action may be taken if the expected sentinel is absent.

## Transport Recovery

Target recovery must not use browser history or ChatGPT history search.
Bookmark manager/menu access is not required and may be avoided. The private
registry direct-open route is preferred when available.

Bounded recovery sequence:

1. Compact packet.
2. Clear-composer retry.
3. Reload target retry.
4. Reopen target retry.
5. Ultra-compact fallback.
6. Stop.

No infinite loops are allowed. A lane must not keep fighting the UI. If target
confirmation, copy capture, packet validation, consultant validation, or
sentinel validation fails after bounded recovery, stop and escalate.

## Delegated Consultant Authority

Consultants may authorize only:

- lane-local docs-only mechanical fixes;
- lane-local docs-only commit/push when all of the following are true:
  - files are lane-owned;
  - no central files changed;
  - `git diff --check` passes;
  - no private artifacts/reports are in repo;
  - no source/API/UI execution occurred;
  - verdict says `green_to_commit_later`;
  - `safe_to_commit_later=true`.

Consultants may not authorize:

- central integration;
- source actions;
- APIs;
- UI source browsing;
- Instagram actions;
- DM opening;
- welcome audio send;
- MailerLite/Gmail access;
- private artifact inspection;
- candidate queue generation;
- CRM/source writes;
- Launch OS work;
- `/Users/alejandrogomez/CRM`.

Any such request requires Alejandro / Chief Architect escalation.

## Autonomous Sprint Limits

Default limits:

- max wall time: 45 minutes.
- max autonomous development cycles: 2.
- max mechanical fix rounds per cycle: 1.
- max consultant relay attempts per packet: compact, one retry,
  reload/reopen, ultra-compact fallback.
- no recursive/new unbounded task generation.
- no central integration inside lane sprint.
- no source actions.

If a sprint reaches any limit, it stops and returns a lane closeout with
blockers, proposed next step, and confirmation that closed gates stayed closed.

## Mechanical Fix Rules

Allowed mechanical fixes:

- add missing closed gates.
- clarify redacted receipt behavior.
- clarify private artifact behavior.
- align future approval phrase.
- add stop condition.
- update lane status.
- correct wording that does not expand scope.

Forbidden mechanical fixes:

- change approval scope into execution.
- touch central files.
- add API/UI/source action.
- inspect private artifacts.
- create candidate queue.
- open DMs.
- send audio.
- write CRM/source state.

If a requested fix would expand scope, touch central files, or cross a
source/action boundary, the lane must stop and escalate.

## Receipts

Relay receipts live under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Existing historical relay receipts under Mantis-Reports/consultant-relay may
remain. Future consultant-relay telemetry should use
CRM-Core-Reports/consultant-relay.

Receipts may include:

- pilot/sprint id.
- packet id.
- target chat label.
- target confirmation.
- transport mode.
- recovery steps.
- verdicts.
- commits.
- `lock_acquired`: boolean.
- `lock_released`: boolean.
- blockers.
- next step.

Receipts must not include:

- unrelated ChatGPT content.
- lock owner token.
- private chats.
- private artifacts.
- source data.
- handles.
- emails.
- names.
- DMs.
- tokens.
- cookies.
- headers.
- env values.
- credentials.
- screenshots.

## Capture Reliability Telemetry

Every consultant relay capture receipt must include, when applicable:

- `capture_method`
- `copy_button_used`
- `copied_latest_assistant_message`
- `generation_complete_before_copy`
- `response_char_count`
- `response_line_count`
- `field_presence_map`
- `sentinel_presence_map`
- `parser_error_code`
- `reformat_request_used`
- `copied_message_role`
- `copied_message_relative_position`
- `manual_selection_used`
- `clipboard_capture_used`
- `screenshot_or_ocr_used`
- `raw_target_url_printed`
- `owner_token_recorded_in_receipt`

Rules:

- Copy-button capture is preferred.
- The lane must not act on a response unless generation is complete or the
  response was explicitly recovered with a complete compact verdict.
- The copied message must be the latest relevant assistant message for the
  packet being validated.
- If `copied_message_relative_position` is `non_latest_assistant` or
  `unknown`, the lane must request a verdict-only recovery or stop.
- The receipt must include `field_presence_map` and `sentinel_presence_map` for
  every actionable task, artifact, or integration verdict.
- If required fields or sentinels are absent, the response is non-actionable.
- If `parser_error_code` suggests wrong packet, wrong message, partial copy, or
  incomplete generation, the lane must recover once with a verdict-only request
  or stop.
- Receipt telemetry must not include raw target URLs, owner tokens, private
  chats, private artifacts, handles, emails, names, DMs, message text, tokens,
  cookies, headers, env values, credentials, or screenshots.

## Consultant Evidence Request Rights

A consultant may return a non-final evidence request instead of green when the
provided packet is insufficient.

Allowed consultant evidence requests:

- diffstat
- changed file list
- focused diff for named files or sections
- full diff, only when scope is small and docs-only
- specific artifact section excerpts
- validation command output
- field_presence_map
- sentinel_presence_map
- closed gate checklist
- storage policy checklist
- raw target URL grep result
- owner token grep result
- private-content grep result

Suggested verdict/status for this case:

`needs_evidence_packet`

Rules:

- A consultant may request additional evidence before green.
- Codex may provide requested evidence only if it stays inside allowed
  repo/docs scope and does not expose private artifacts, raw handles, emails,
  DMs, source data, target URLs, tokens, cookies, headers, env values,
  credentials, or screenshots.
- Full diffs are not mandatory by default; the preferred review ladder is:
  1. file list + diffstat + summary + closed gates;
  2. focused diff or section excerpts;
  3. full diff only for small docs-only changes;
  4. stop if evidence would expose private/source content.
- If requested evidence would cross source/private/action boundaries, Codex
  must stop and report.
- If the consultant cannot decide without forbidden evidence, the verdict must
  be `hold` or `ceo_decision_needed`.

## Verdict-Only Recovery

When a consultant response is incomplete, too long, still generating, missing
required fields, or appears to be the wrong message:

- Codex may send one compact verdict-only recovery request.
- The recovery request must name the prior `packet_id`.
- The recovery request must ask for only the required response schema and
  sentinels.
- If the recovered response is still incomplete after one reformat request,
  stop.
- If the recovered response references the wrong `packet_id`, stop.
- If the recovered response is a task verdict when an artifact verdict was
  requested, request one reformat/recovery or stop.
- Do not infer green from partial natural-language approval.

## CEO Escalation

Escalate to Alejandro / Chief Architect when:

- consultant verdict is `ceo_decision_needed`.
- consultant verdict is `central_decision_needed`.
- task crosses source/action boundary.
- source/API/UI/private artifact access is requested.
- target chat mismatch.
- raw target URL exposure risk.
- target registry mismatch.
- target registry missing or stale.
- direct-open target handshake failure.
- sentinel missing after reformat.
- transport fails after recovery.
- private content exposure risk.
- commit would touch central files.
- scope would expand into a new lane task outside approved menu.

Escalation should preserve the lane closeout format: branch, status, files
changed, checks run, verdicts, blockers, proposed integration note, and
confirmation of no forbidden scope.

## When To Use UI Relay vs Subagent vs Manual

- UI relay: best for leveraging ChatGPT Pro consultant judgment and preserving
  external specialist review.
- Codex subagent reviewer: best for technical/diff/scope checks, potentially
  higher Codex quota use.
- Manual relay: fallback for ambiguous or CEO-sensitive decisions.
- API agents: future option when cost/volume justifies it.

Use UI relay only when the value of external consultant judgment outweighs the
operational overhead and the task stays inside docs-only, no-run, lane-owned
boundaries.

## Initial Approved Use Cases

Recommended initial v0 use:

- docs-only lane work;
- no-run design artifacts;
- lane-owned files;
- low-risk consultant review loops;
- no source actions.
- docs-only, no-run, lane-owned design artifacts across Welcome Audio,
  Instagram API readiness, and MailerLite onboarding.

Do not use initially for:

- APIs;
- Instagram;
- MailerLite UI/source actions;
- Gmail;
- DMs;
- welcome audio send;
- UI source browsing;
- MailerLite mutations;
- Gmail access;
- candidate queue generation;
- CRM writes;
- central integration automation.

## Completion Boundary

Complete when CRM Core has a reusable protocol for Consultant UI Relay /
Autonomous Lane Sprints that defines transport, validation, recovery,
consultant authority, autonomous commit limits, receipts, stop conditions, and
escalation.

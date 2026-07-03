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
  a legacy continuity path until re-registered. Future registry writes should
  prefer CRM-Core-Private-Artifacts.

## Canonical Transport

Canonical v0 accepts target routes in this priority order:

1. Private target URL registry + direct Chrome open + handshake.
2. User-opened active tab + handshake.
3. Direct bookmark or saved target + visible confirmation or handshake.
4. Manual relay fallback.

For any accepted target route, the transport remains:

- Chrome only.
- Dedicated consultant chat.
- Visible target confirmation or handshake required.
- No ChatGPT history browsing.
- No unrelated chats.
- No project browsing.
- Clipboard paste single-message transport.
- Send by clicking Send button, not pressing Enter.
- Copy final assistant message using the ChatGPT Copy button.
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
- blockers.
- next step.

Receipts must not include:

- unrelated ChatGPT content.
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

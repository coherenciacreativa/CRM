# CRM Core Integration Queue v0

Date: 2026-06-29
Status: central integration queue

This queue tracks lane outputs that may enter the central integration branch.
It does not authorize execution, source access, private artifact inspection,
CRM writes, source mutations, or Launch OS work.

## Pending Integration

No lane outputs pending at creation.

## In Review

No lane outputs in review at creation.

## Merged / Closed

### parallel_lane_bootstrap_2026-06-29

- `source_workstream`: `integration`
- `source_branch`: `codex/crm-core-reentry`
- `commits`: pending
- `files_changed`: board, integration queue, first three workstream files,
  next-action
- `summary`: bootstrapped first three parallel workstream branches/worktrees
- `tests_or_checks`: `git diff --check`, `git worktree list`
- `private_artifacts_touched`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: first lane task prompts / consultant chat setup
- `integration_recommendation`: commit bootstrap docs, then create first three
  consultant chats and issue lane-specific prompts

### first_parallel_lane_artifact_batch_2026-07-01

- `source_workstream`: `integration`
- `source_branch`: `codex/crm-core-reentry`
- `merged_source_branches`:
  - `codex/crm-core-mailerlite-onboarding`
  - `codex/crm-core-instagram-api`
  - `codex/crm-core-welcome-audio`
- `commits`:
  - `69f84fadc321065b2e16ecc3295627ca12514154`
  - `4183dc6942c4c5dad0a211a86b00b9c2388d0cc4`
  - `c99fb3ce3eab0bbf828eabf399af3a030a4ee93d`
  - `dc75ef680117a960a9cc9c259176046c6f5fb5eb`
  - `e4cf1f4968a3522de70987b15b414ce1bfeb55e6`
  - `b3a72bf2b75f76910f062f90d9092f9a7e44d4da`
- `files_changed`:
  - `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md`
  - `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`
  - `docs/crm-vnext/workstreams/mailerlite-onboarding.md`
  - `docs/crm-vnext/instagram-crm-prior-art-inventory-v0.md`
  - `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md`
  - `docs/crm-vnext/workstreams/instagram-api-readiness.md`
  - `docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`
  - `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
- `summary`: integrated first parallel lane artifact batch: MailerLite
  onboarding setup inventory packet/questionnaire, Instagram API setup
  decision/prior-art inventory, and Welcome Audio send boundary.
- `tests_or_checks`: `git diff --check`
- `private_artifacts_touched`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: choose next lane approvals after first parallel artifacts
- `integration_recommendation`: central review of next lane approvals; no
  execution

### welcome_audio_autonomous_sprint_pilot_6_2026-07-02

- `source_workstream`: `welcome-audio-send-boundary`
- `source_branch`: `codex/crm-core-welcome-audio`
- `commits`:
  - `8224373068ee50e260d62e775f38a44938f39ea6`
  - `d3d03ce48db6080459fcb7fd51dfd7d73a88adc4`
- `files_changed`:
  - `docs/crm-vnext/instagram-welcome-audio-asset-registry-and-history-packet-v0.md`
  - `docs/crm-vnext/instagram-welcome-audio-send-approval-packet-template-v0.md`
  - `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
- `summary`: Integrated the first successful autonomous consultant-Codex
  sprint result for the Welcome Audio lane.
- `tests_or_checks`: `git diff --check`
- `private_artifacts_touched`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: choose whether to formalize Consultant UI Relay /
  Autonomous Lane Sprint protocol and select next lane direction
- `integration_recommendation`: keep source/action gates closed; review pilot
  and decide next protocol/design step.

### instagram_api_autonomous_sprint_pilot_1_2026-07-03

- `source_workstream`: `instagram-api-readiness`
- `source_branch`: `codex/crm-core-instagram-api`
- `commits`:
  - `5ec16f72d87394c6acdfc03fac9bc16cb652bb83`
- `files_changed`:
  - `docs/crm-vnext/instagram-meta-api-prior-art-review-packet-v0.md`
  - `docs/crm-vnext/workstreams/instagram-api-readiness.md`
  - `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/workstreams/integration.md`
- `summary`: Integrated the successful Instagram API readiness Consultant UI
  Relay autonomous sprint and updated the relay protocol with the private
  target URL registry route.
- `tests_or_checks`: `git diff --check`
- `private_artifacts_touched`: consultant_target_registry_written_by_lane_only
- `private_artifacts_integrated`: false
- `raw_target_url_printed`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: choose next autonomy or source-readiness direction
- `integration_recommendation`: keep source/action gates closed; consider
  MailerLite UI relay pilot, continue Instagram API setup review, or design
  Codex subagent reviewer protocol.

### mailerlite_autonomous_sprint_pilot_1_2026-07-03

- `source_workstream`: `mailerlite-onboarding`
- `source_branch`: `codex/crm-core-mailerlite-onboarding`
- `commits`:
  - `0c5a8840069d0f4acdaabcffbec4539c46b4e77a`
- `files_changed`:
  - `docs/crm-vnext/mailerlite-onboarding-setup-inventory-answer-intake-packet-v0.md`
  - `docs/crm-vnext/workstreams/mailerlite-onboarding.md`
  - `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/workstreams/integration.md`
- `summary`: Integrated the successful MailerLite onboarding Consultant UI
  Relay autonomous sprint and recorded that the relay protocol is now proven
  across the first three CRM Core lanes.
- `tests_or_checks`: `git diff --check`
- `private_artifacts_touched`: consultant_target_registry_written_by_lane_only
- `private_artifacts_integrated`: false
- `raw_target_url_printed`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: choose whether to continue autonomy work, design Codex
  subagent reviewer pilot, continue MailerLite setup path, continue Instagram
  API readiness, or pause automation
- `integration_recommendation`: keep source/action gates closed; review
  three-lane proof and choose next autonomy/source-readiness direction.

### welcome_audio_sandbox_send_strategy_pilot_1b_2026-07-03

- `source_workstream`: `welcome-audio-send-boundary`
- `source_branch`: `codex/crm-core-welcome-audio`
- `commits`:
  - `debb861cd64616b61cef6378c7dde41afaeb9551`
- `files_changed`:
  - `docs/crm-vnext/instagram-welcome-audio-sandbox-send-strategy-design-v0.md`
  - `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`
  - `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/workstreams/integration.md`
- `summary`: Integrated the first plan-aligned Controlled Welcome Flow Proof
  lane sprint: Welcome Audio sandbox send strategy design.
- `tests_or_checks`: `git diff --check`
- `private_artifacts_touched`: consultant_target_registry_read_or_updated_by_lane_only
- `private_artifacts_integrated`: false
- `used_crm_core_reports`: lane_only
- `used_mantis_reports`: false
- `used_mantis_memory`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: choose next Controlled Welcome Flow Proof step
- `integration_recommendation`: keep source/action gates closed; next
  recommended proof step is controlled new-follower evidence packet design,
  unless Alejandro prefers MailerLite or Instagram API readiness.

## Rejected / Needs Rework

No lane outputs rejected at creation.

## CEO Decision Required

Decision required: choose the next Controlled Welcome Flow Proof step after the
Welcome Audio sandbox send strategy design, or pause. Prior lane approval
options remain available for:

- `mailerlite-onboarding`
- `instagram-api-readiness`
- `welcome-audio-send-boundary`

## Queue Item Template

```md
## <item_id>

- `source_workstream`:
- `source_branch`:
- `commits`:
- `files_changed`:
- `summary`:
- `tests_or_checks`:
- `private_artifacts_touched`:
- `source_actions_executed`:
- `central_files_requested`:
- `conflicts_expected`:
- `decision_needed`:
- `integration_recommendation`:
```

## Intake Rules

- Do not accept lane output unless branch, changed files, and scope match the
  lane status file.
- Reject any output that commits private artifacts or redacted report files.
- Reject any output that executed a source action without exact approval.
- Escalate central-file changes to the Chief Architect / Integration Chat.

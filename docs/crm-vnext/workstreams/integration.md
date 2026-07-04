# CRM Core Workstream: Integration

- `workstream_id`: `integration`
- `branch`: `codex/crm-core-reentry`
- `consultant_chat`: Chief Architect / Integration Chat
- `codex_worker`: Integration Worker
- `status`: `active`
- `objective`: Maintain architecture, board, queue, central next actions.
- `why_now`: Parallel CRM Core work needs a central coordination lane before
  multiple consultants and Codex workers begin.
- `allowed_files`:
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - central policy and architecture docs when explicitly approved
- `forbidden_files`:
  - private artifacts
  - Mantis-Reports receipts
  - Launch OS docs
  - `/Users/alejandrogomez/CRM`
- `allowed_scope`:
  - central integration review
  - branch/workstream coordination
  - conflict resolution
  - board and queue updates
- `forbidden_scope`:
  - APIs
  - UI, Computer Use, or `@Chrome`
  - source actions
  - CRM/source writes
  - candidate queue generation
  - welcome audio
- `private_artifact_policy`: Never inspect, copy, commit, or paste private
  artifact contents.
- `redacted_receipt_policy`: Source/operator receipts stay outside repo under
  `/Users/alejandrogomez/Documents/Mantis-Reports/`; future CRM Core
  development telemetry should use `/Users/alejandrogomez/Documents/CRM-Core-Reports/`.
- `current_tasks`:
  - maintain board
  - maintain integration queue
  - review lane outputs
  - first three lanes bootstrapped:
    - `mailerlite-onboarding` on `codex/crm-core-mailerlite-onboarding` at
      `/Users/alejandrogomez/CRM-core-mailerlite`
    - `instagram-api-readiness` on `codex/crm-core-instagram-api` at
      `/Users/alejandrogomez/CRM-core-instagram-api`
    - `welcome-audio-send-boundary` on `codex/crm-core-welcome-audio` at
      `/Users/alejandrogomez/CRM-core-welcome-audio`
  - no lane execution started
  - central branch remains the integration source
  - first parallel lane artifact batch integrated:
    - `codex/crm-core-mailerlite-onboarding`
    - `codex/crm-core-instagram-api`
    - `codex/crm-core-welcome-audio`
  - central coordination files updated:
    - `docs/crm-vnext/crm-core-next-action.md`
    - `docs/crm-vnext/crm-core-workstream-board-v0.md`
    - `docs/crm-vnext/crm-core-integration-queue-v0.md`
    - `docs/crm-vnext/workstreams/integration.md`
  - no lane execution occurred during integration
  - next central task: review next lane approvals
  - Welcome Audio autonomous sprint pilot 6 integrated
  - source branch merged: `codex/crm-core-welcome-audio`
  - central coordination files updated for Pilot 6:
    - `docs/crm-vnext/crm-core-next-action.md`
    - `docs/crm-vnext/crm-core-workstream-board-v0.md`
    - `docs/crm-vnext/crm-core-integration-queue-v0.md`
    - `docs/crm-vnext/workstreams/integration.md`
  - no lane source execution occurred during Pilot 6 integration
  - next central task: review autonomous sprint result and decide next protocol
    step
  - Consultant UI Relay / Autonomous Lane Sprint protocol documented
  - Instagram API autonomous sprint pilot 1 integrated
  - private target URL registry route was proven by the lane and documented
    centrally
  - raw target URL was not printed or integrated
  - source branch merged: `codex/crm-core-instagram-api`
  - central coordination files updated for Instagram API pilot 1:
    - `docs/crm-vnext/crm-core-next-action.md`
    - `docs/crm-vnext/crm-core-workstream-board-v0.md`
    - `docs/crm-vnext/crm-core-integration-queue-v0.md`
    - `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
    - `docs/crm-vnext/workstreams/integration.md`
  - no lane source execution occurred during Instagram API pilot 1 integration
  - next central task: choose next autonomy/source-readiness direction
  - MailerLite autonomous sprint pilot 1 integrated
  - Consultant UI Relay / Autonomous Lane Sprint is now proven across Welcome
    Audio, Instagram API readiness, and MailerLite onboarding
  - private target URL registry route was reused successfully
  - raw target URLs were not printed or integrated
  - source branch merged: `codex/crm-core-mailerlite-onboarding`
  - central coordination files updated for MailerLite pilot 1:
    - `docs/crm-vnext/crm-core-next-action.md`
    - `docs/crm-vnext/crm-core-workstream-board-v0.md`
    - `docs/crm-vnext/crm-core-integration-queue-v0.md`
    - `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
    - `docs/crm-vnext/workstreams/integration.md`
  - no lane source execution occurred during MailerLite pilot 1 integration
  - next central task: choose next autonomy/source-readiness direction after
    reviewing the three-lane proof
  - active next step: choose next autonomy/source-readiness direction or pause
  - Storage/operator boundary policy created
  - Consultant relay telemetry path policy changed for future runs
  - Mantis remains future operator, not current development memory
  - Active next action is Controlled Welcome Flow Proof plan
  - No execution occurred during storage/operator boundary policy patch
  - Controlled Welcome Flow Proof plan created
  - Active next step is first lane sprint selection
  - No execution occurred during Controlled Welcome Flow Proof plan creation
  - Storage/operator boundary policy remains active
  - Welcome Audio sandbox send strategy design integrated
  - This was the first plan-aligned lane sprint for the Controlled Welcome Flow
    Proof
  - CRM-Core-Reports was used by the lane for development telemetry
  - Mantis-Reports and Mantis memory were not used
  - source branch merged: `codex/crm-core-welcome-audio`
  - central coordination files updated for Welcome Audio sandbox strategy:
    - `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`
    - `docs/crm-vnext/crm-core-workstream-board-v0.md`
    - `docs/crm-vnext/crm-core-integration-queue-v0.md`
    - `docs/crm-vnext/crm-core-next-action.md`
    - `docs/crm-vnext/workstreams/integration.md`
  - no lane source execution occurred during Welcome Audio sandbox strategy
    integration
  - next central task: choose next Controlled Welcome Flow Proof step
  - no execution occurred during protocol design
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: next Controlled Welcome Flow Proof step not yet selected
- `next_approval_needed`: choose the next Controlled Welcome Flow Proof step,
  or pause
- `proposed_integration_note`: central integration lane owns merges into
  `codex/crm-core-reentry`.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

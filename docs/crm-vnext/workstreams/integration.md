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
- `redacted_receipt_policy`: Receipts stay outside repo under
  `/Users/alejandrogomez/Documents/Mantis-Reports/`.
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
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: next lane approval sequence not chosen
- `next_approval_needed`: choose next lane approvals after first integrated
  artifacts
- `proposed_integration_note`: central integration lane owns merges into
  `codex/crm-core-reentry`.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

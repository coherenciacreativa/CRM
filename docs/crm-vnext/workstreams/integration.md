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
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: first lane bootstrap approval
- `next_approval_needed`: approve first parallel workstream bootstrap
- `proposed_integration_note`: central integration lane owns merges into
  `codex/crm-core-reentry`.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

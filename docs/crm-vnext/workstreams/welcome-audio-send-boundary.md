# CRM Core Workstream: Welcome Audio Send Boundary

- `workstream_id`: `welcome-audio-send-boundary`
- `branch`: `codex/crm-core-welcome-audio`
- `consultant_chat`: Welcome audio consultant
- `codex_worker`: Welcome audio lane worker
- `status`: `ready_to_design`
- `objective`: Audio asset registry, already-welcomed history, send approval
  packet, duplicate prevention.
- `why_now`: Welcome audio is a high-value action lane, but no send is
  authorized and duplicate prevention must exist before execution.
- `allowed_files`:
  - `docs/crm-vnext/welcome-audio-*.md`
  - `docs/crm-vnext/instagram-welcome-audio-*.md`
  - `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`
- `forbidden_files`:
  - central files unless integration approves
  - private artifacts
  - Mantis-Reports receipts
  - Launch OS docs
- `allowed_scope`:
  - design only
  - audio asset registry design
  - already-welcomed history design
  - send approval packet design
  - duplicate prevention design
- `forbidden_scope`:
  - sending audio
  - opening DMs
  - Instagram actions
  - UI/Computer Use
  - candidate queue generation
  - CRM/source writes
- `private_artifact_policy`: No private artifact inspection; future welcome
  history artifacts must remain outside repo.
- `redacted_receipt_policy`: Receipts may include counts and status only; no
  identities or message content.
- `current_tasks`:
  - design send boundary after bootstrap approval
  - keep send gate closed
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: parallel lane bootstrap approval; no audio send approval
- `next_approval_needed`: approve lane bootstrap
- `proposed_integration_note`: lane should define send prerequisites before any
  future source action.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

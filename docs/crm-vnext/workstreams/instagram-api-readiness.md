# CRM Core Workstream: Instagram API Readiness

- `workstream_id`: `instagram-api-readiness`
- `branch`: `codex/crm-core-instagram-api`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-instagram-api`
- `consultant_chat`: Meta/Instagram API consultant
- `codex_worker`: Instagram API readiness lane worker
- `status`: `bootstrapped_ready`
- `objective`: Meta setup facts, app readiness, API/webhook path, no secrets.
- `why_now`: Official docs did not show follower deltas, while DM/reply and
  messaging/webhook routes remain plausible but setup-dependent.
- `allowed_files`:
  - `docs/crm-vnext/instagram-meta-*.md`
  - `docs/crm-vnext/workstreams/instagram-api-readiness.md`
- `forbidden_files`:
  - central files unless integration approves
  - private artifacts
  - Mantis-Reports receipts
  - Launch OS docs
- `allowed_scope`:
  - no-secret setup facts
  - API/webhook readiness design
  - official-docs research
  - no-call healthcheck planning
- `forbidden_scope`:
  - API calls
  - Meta Business Suite
  - app configuration
  - webhook setup
  - tokens
  - secrets
  - token handling
  - Instagram UI
  - DMs
  - welcome audio
  - CRM/source writes
- `private_artifact_policy`: No private artifact inspection.
- `redacted_receipt_policy`: Redacted setup/readiness receipts stay outside repo.
- `current_tasks`:
  - current task seed: Meta/Instagram setup readiness, API/webhook
    source-health planning, no secrets
  - next suggested task: setup decision packet or no-secret API healthcheck
    plan only after Alejandro approval
  - no execution gates: no API calls, no Meta Business Suite, no tokens, no
    secrets, no webhook setup, no UI
  - keep follower-source UI repair parked
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: first lane task prompt approval; setup remains partial/unknown
- `next_approval_needed`: approve lane-specific prompt
- `proposed_integration_note`: API lane should report whether capabilities move
  to healthcheck, setup decision, or parked status.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

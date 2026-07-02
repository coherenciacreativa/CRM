# CRM Core Workstream: Welcome Audio Send Boundary

- `workstream_id`: `welcome-audio-send-boundary`
- `branch`: `codex/crm-core-welcome-audio`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-welcome-audio`
- `consultant_chat`: Welcome audio consultant
- `codex_worker`: Welcome audio lane worker
- `status`: `ready_for_lane_local_commit_review`
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
  - completed no-run send-boundary design
  - artifact:
    `docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`
  - no execution gates: no DM opening, no welcome audio send, no candidate
    queue generation, no Instagram actions
  - keep send gate closed
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: no audio send approval; no candidate queue approval; no approved
  send packet; no private artifact inspection; no approved audio asset registry
  implementation; no already-welcomed/send-history implementation
- `next_approval_needed`: lane-local review/commit after full document
  integrity repair; separate future approval before any candidate queue, private
  artifact inspection, DM opening, welcome audio send, Instagram action,
  MailerLite/Gmail access, CRM/source write, or source action
- `proposed_integration_note`: Welcome audio send remains a separate closed
  no-run boundary. This lane-local design defines universal business
  eligibility for confirmed new Instagram followers while preserving the send
  boundary: future approved audio asset registry, already-welcomed/send-history
  safeguards, candidate set requirements, bounded send approval packet, exact
  future approval phrase, final fail-closed dedupe, redacted receipts, stop
  conditions, and separation from detection, reply monitoring,
  MailerLite/Gmail onboarding, CRM writes, private artifact inspection, source
  mutation, and source actions. No central file update is needed now.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

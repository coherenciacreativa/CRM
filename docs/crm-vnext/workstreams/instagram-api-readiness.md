# CRM Core Workstream: Instagram API Readiness

- `workstream_id`: `instagram-api-readiness`
- `branch`: `codex/crm-core-instagram-api`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-instagram-api`
- `consultant_chat`: Meta/Instagram API consultant
- `codex_worker`: Instagram API readiness lane worker
- `status`: `task_complete_pending_integration`
- `objective`: Meta setup facts, app readiness, API/webhook path, no secrets.
- `why_now`: Official docs reviewed for this lane did not show a new-follower
  webhook, per-follower identity stream, or CRM-usable follower-delta candidate
  source, while DM/reply and messaging/webhook routes remain plausible but
  setup-dependent.
- `allowed_files`:
  - `docs/crm-vnext/instagram-meta-*.md`
  - `docs/crm-vnext/instagram-*.md`
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
  - completed no-run setup decision packet design
  - completed no-run repo-local prior-art inventory
  - completed no-run prior-art review packet design
  - completed no-run welcome-audio sandbox send strategy design
  - completed no-run controlled new-follower evidence packet design
  - completed no-run controlled candidate queue and sandbox send approval packet
    design
  - completed no-run reply monitoring and email handoff boundary design
  - new artifacts:
    - `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md`
    - `docs/crm-vnext/instagram-crm-prior-art-inventory-v0.md`
    - `docs/crm-vnext/instagram-meta-api-prior-art-review-packet-v0.md`
    - `docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`
    - `docs/crm-vnext/instagram-welcome-audio-controlled-candidate-queue-and-sandbox-send-approval-packet-design-v0.md`
    - `docs/crm-vnext/instagram-reply-monitoring-email-handoff-boundary-design-v0.md`
  - no API calls, UI, Computer Use, `@Chrome`, Instagram, Meta Business Suite,
    MailerLite, Gmail, private artifact inspection, DMs, welcome audio,
    candidate queue generation, CRM/source writes, Launch OS docs, or
    `/Users/alejandrogomez/CRM` use occurred
  - next suggested task: selected-task artifact consultant review for the reply
    monitoring and email handoff boundary design, then lane-local commit if
    green
  - no execution gates: no API calls, no Meta Business Suite, no tokens, no
    secrets, no webhook setup, no UI
  - keep follower-source UI repair parked
- `latest_commit`: pending reply monitoring and email handoff boundary design
  lane-local commit
- `latest_receipt`: none
- `blockers`: setup remains partial/unknown; live API calls remain unapproved
- `next_approval_needed`: approve selected-task artifact review for the reply
  monitoring and email handoff boundary design, then Chief Architect
  self-integration review if green
- `proposed_integration_note`: Integrate
  `docs/crm-vnext/instagram-crm-prior-art-inventory-v0.md`,
  `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md`, and
  `docs/crm-vnext/instagram-meta-api-prior-art-review-packet-v0.md`, plus
  `docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`
  as lane-owned, no-run Instagram API readiness artifacts. The controlled
  new-follower evidence packet design defines the future proof boundary for an
  Alejandro-owned or controlled test follow while preserving the distinction
  between manual evidence, notifications, bounded follower-source evidence, and
  API/webhook source-health. It keeps candidate queue generation, welcome audio
  send, reply monitoring, MailerLite onboarding, CRM card enrichment, ledgers,
  Fact Store, scoring, source actions, Launch OS, Mantis memory, and
  `/Users/alejandrogomez/CRM` closed. No API calls, UI access, Meta Business
  Suite access, secrets, webhooks, DMs, welcome audio, candidate queue
  generation, CRM/source writes, or central CRM edits are authorized. Also
  integrate
  `docs/crm-vnext/instagram-reply-monitoring-email-handoff-boundary-design-v0.md`
  as a lane-owned, no-run Controlled Welcome Flow Proof artifact after
  consultant green. It connects a future approved welcome audio send receipt to
  private reply evidence, email/name/city/country/phone handoff candidate
  classification, assistant reply policy design, MailerLite no-write payload
  preview, and CRM enrichment preview while keeping DM opening, reply
  monitoring, MailerLite/Gmail access, CRM/source writes, outreach, source
  actions, Launch OS, Mantis memory, OpenClaw/Mantis workspace, and
  `/Users/alejandrogomez/CRM` closed.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

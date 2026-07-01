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
  - new artifact:
    `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md`
  - no API calls, UI, Computer Use, `@Chrome`, Instagram, Meta Business Suite,
    MailerLite, Gmail, private artifact inspection, DMs, welcome audio,
    candidate queue generation, CRM/source writes, Launch OS docs, or
    `/Users/alejandrogomez/CRM` use occurred
  - next suggested task: setup decision packet review or no-secret API
    healthcheck plan only after Alejandro approval
  - no execution gates: no API calls, no Meta Business Suite, no tokens, no
    secrets, no webhook setup, no UI
  - keep follower-source UI repair parked
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: setup remains partial/unknown; live API calls remain unapproved
- `next_approval_needed`: approve integration of the setup decision packet,
  then approve setup decision review, no-secret API healthcheck plan, manual
  follower evidence packet design, or MailerLite parallel continuation
- `proposed_integration_note`: Integrate
  `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md` as a
  lane-owned, no-run Instagram API readiness artifact after tightening
  follower-delta language to distinguish aggregate analytics/insights from
  new-follower webhook, follower identity, or CRM-usable candidate-source
  support. The artifact recommends
  `crm_core_instagram_meta_app_setup_decision_packet_review_awaiting_approval_v0`
  by default, with MailerLite allowed to continue in parallel as the faster CEO
  path if desired. No API calls, UI access, Meta Business Suite access, secrets,
  webhooks, DMs, welcome audio, candidate queue generation, CRM/source writes,
  or central CRM edits are authorized.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

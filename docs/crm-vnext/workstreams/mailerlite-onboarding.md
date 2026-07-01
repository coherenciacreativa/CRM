# CRM Core Workstream: MailerLite Onboarding

- `workstream_id`: `mailerlite-onboarding`
- `branch`: `codex/crm-core-mailerlite-onboarding`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-mailerlite`
- `consultant_chat`: MailerLite onboarding consultant
- `codex_worker`: MailerLite onboarding lane worker
- `status`: `setup_inventory_packet_design_complete`
- `objective`: No-secret setup inventory, no-write payload, future mutation
  packet.
- `why_now`: MailerLite onboarding is the highest-leverage downstream lane once
  Instagram/DM/manual evidence provides email handoff.
- `allowed_files`:
  - `docs/crm-vnext/mailerlite-*.md`
  - `docs/crm-vnext/workstreams/mailerlite-onboarding.md`
  - future MailerLite-specific scripts/tests after explicit approval
- `forbidden_files`:
  - `docs/crm-vnext/crm-core-next-action.md` unless integration approves
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - private artifacts
  - Mantis-Reports receipts
  - Launch OS docs
- `allowed_scope`:
  - design only until exact approval
  - no-secret setup inventory prompts
  - no-write payload planning
  - redacted receipt planning
- `forbidden_scope`:
  - MailerLite API calls
  - MailerLite UI
  - Gmail
  - Instagram
  - secrets
  - subscriber/group/field/automation mutation
  - candidate queue generation
  - CRM writes
  - source mutation
- `private_artifact_policy`: Do not inspect private artifacts unless a future
  exact approval names the artifact and route.
- `redacted_receipt_policy`: Receipt paths may be referenced by label/path only;
  do not commit receipts.
- `current_tasks`:
  - current task seed:
    `crm_core_mailerlite_onboarding_setup_inventory_awaiting_approval_v0`
  - current task completed as no-run design:
    `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md`
  - no-secret setup inventory packet, setup decision path, receipt model,
    idempotency expectations, and future approval language drafted.
  - CEO-friendly no-secret setup inventory questionnaire drafted:
    `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`
  - next suggested task: collect no-secret MailerLite onboarding setup
    inventory only after Alejandro approval
  - no execution gates: no MailerLite API, no MailerLite UI, no Gmail, no
    Instagram, no secrets, no CRM writes
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: first lane task prompt approval; setup inventory collection still
  requires exact Alejandro approval
- `next_approval_needed`: approve lane-specific prompt and setup inventory
  collection
- `proposed_integration_note`: no central file change required for this lane
  doc update. After review, Integration may record that the MailerLite lane has
  a dedicated no-secret setup inventory packet design at
  `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md` and a
  CEO-friendly questionnaire at
  `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`,
  while setup inventory collection remains unexecuted and requires exact
  Alejandro approval.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

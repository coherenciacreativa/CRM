# CRM Core Workstream: MailerLite Onboarding

- `workstream_id`: `mailerlite-onboarding`
- `branch`: `codex/crm-core-mailerlite-onboarding`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-mailerlite`
- `consultant_chat`: MailerLite onboarding consultant
- `codex_worker`: MailerLite onboarding lane worker
- `status`: `setup_inventory_answer_intake_packet_drafted`
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
  - setup inventory questionnaire reconciled with prior local MailerLite
    onboarding history so Alejandro does not need to answer already-resolved
    facts from scratch.
  - local history prefilled the protected v1 onboarding posture, v2 migration
    posture, known trigger/completion labels, canonical supporting groups,
    prior aggregate scan families, and onboarding policy blockers.
  - next suggested task: either collect only the reduced no-secret answers from
    Alejandro or request exact approval for one read-only no-secret MailerLite
    setup verification using existing internal credentials.
  - consultant UI relay pilot selected and drafted no-run answer-intake packet:
    `docs/crm-vnext/mailerlite-onboarding-setup-inventory-answer-intake-packet-v0.md`
  - answer-intake packet defines safe answer types, forbidden content,
    validation rules, blocker handling, redacted receipt behavior, future
    approval phrases, stop conditions, and closed gates.
  - no execution gates: no MailerLite API, no MailerLite UI, no Gmail, no
    Instagram, no secrets, no CRM writes
- `latest_commit`: pending
- `latest_receipt`: none
- `blockers`: setup inventory collection still requires exact Alejandro
  approval; read-only setup verification remains unexecuted and requires exact
  separate approval
- `next_approval_needed`: approve no-secret setup inventory collection or
  approve one read-only no-secret MailerLite setup verification
- `proposed_integration_note`: no central file change required for this lane
  doc update. After review, Integration may record that the MailerLite lane has
  a dedicated no-secret setup inventory packet design at
  `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md` and a
  CEO-friendly questionnaire at
  `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`.
  The questionnaire now includes a local-history reconciliation that reduces
  Alejandro's manual answer burden; setup inventory collection and any
  read-only API verification remain unexecuted and require exact Alejandro
  approval. The lane now also has a no-run answer-intake packet at
  `docs/crm-vnext/mailerlite-onboarding-setup-inventory-answer-intake-packet-v0.md`
  for safe future collection of no-secret setup answers.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.

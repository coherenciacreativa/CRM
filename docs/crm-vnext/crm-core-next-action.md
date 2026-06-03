# CRM Core Active Next Action Contract

Purpose:

This file records the active CRM Core next action for safe parallel Goals/play
work. It keeps CRM Core resumes separate from Launch OS resumes and prevents a
future run from advancing MailerLite, Shopify, outbound, cards, ledgers, or
scoring by accident.

This contract does not authorize implementation beyond the active scope. It is a
routing and completion pointer.

## Active Next Action Schema

- `next_action_id`:
- `status`: `active | blocked | superseded | completed`
- `created_at`:
- `updated_at`:
- `objective`:
- `why_now`:
- `allowed_scope`:
- `forbidden_scope`:
- `expected_files`:
- `validation_commands`:
- `stop_conditions`:
- `resume_instruction`:
- `completion_definition`:

## Completed Next Actions

- `next_action_id`: `crm_core_signal_readiness_board_v0`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `completed_by_commit`: `dfe3d9a`
- `completion_artifact`:
  `docs/crm-vnext/community-signal-readiness-board-v0.md`
- `completion_definition`: CRM Core has a concise read-only Signal Readiness
  Board / capability map that identifies available CRM Core surfaces, validation
  commands, lane boundaries, shared-contract coordination points, and the safest
  next milestone. No Launch OS functionality, live systems, cards, ledgers,
  Fact Store, scoring, writes, or outbound channels were touched.

- `next_action_id`: `crm_core_community_source_health_reality_audit_v0`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `completion_artifact`:
  `docs/crm-vnext/community-source-health-reality-audit-v0.md`
- `completion_definition`: Source-health reality audit exists and classifies
  Instagram, MailerLite/email, Gmail/newsletter replies, identity blockers, safe
  dry-run preview inputs, review-only signals, no-send CEO/operator brief
  surface, and not-yet-automated areas; no live systems or CRM state were
  touched.

- `next_action_id`: `crm_core_community_source_health_verification_packets_v0`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `completion_artifact`:
  `docs/crm-vnext/community-source-health-verification-packets-v0.md`
- `completion_definition`: CRM Core has read-only/no-live source-health
  verification packets for Instagram, MailerLite/email and Gmail/newsletter
  replies that define safe verification boundaries, approval requirements,
  routes, forbidden actions, redaction rules, output artifacts, and what remains
  unknown; no verification was run and no live systems or CRM state were touched.

- `next_action_id`: `crm_core_first_source_health_verification_decision_v0`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `decision`: Email/MailerLite first.
- `selected_route_preference`: Local snapshot/export freshness or no-secret
  metadata verification before any live API route.
- `note`: No verification was run.
- `completion_definition`: Alejandro chose Email/MailerLite as the first
  verification route. No live API call, UI access, snapshot/export read, source
  mutation, CRM state mutation, Launch OS doc touch, or use of
  `/Users/alejandrogomez/CRM` occurred.

- `next_action_id`: `crm_core_mailerlite_email_source_health_approval_packet_v0`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `completion_artifact`:
  `docs/crm-vnext/mailerlite-email-source-health-approval-packet-v0.md`
- `completion_definition`: CRM Core has a compact no-live Email/MailerLite
  source-health approval packet that defines the selected source family,
  preferred local snapshot/export metadata route, forbidden actions, output
  artifacts, exact approval phrase, and what remains forbidden after a green
  result. No verification was run.

- `next_action_id`: `crm_core_mailerlite_email_source_health_verification_awaiting_approval_v0`
- `status`: `superseded`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `outcome`: Superseded by Alejandro's standing read-only source authorization.
- `note`: No verification was run in this transition.
- `completion_definition`: The exact-phrase approval wait is no longer the
  active gate because Alejandro approved a standing read-only source policy for
  MailerLite/email and Gmail/newsletter reply metadata. No source check,
  source mutation, CRM state mutation, private-content read, Launch OS doc touch,
  or use of `/Users/alejandrogomez/CRM` occurred in this transition.

- `next_action_id`: `crm_core_email_mailerlite_gmail_readonly_source_intake_v0`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `result`: `blocked`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_email_mailerlite_gmail_readonly_source_intake_2026-06-03.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_email_mailerlite_gmail_readonly_source_intake_2026-06-03.json`
- `findings`:
  - No local MailerLite/email snapshot/export artifacts were found by the
    metadata-only probe.
  - No local Gmail/newsletter reply discovery artifacts were found by the
    metadata-only probe.
  - MailerLite live healthcheck was not run under the prior interpretation of
    the policy because the command retrieves stored credentials internally.
  - Gmail discovery was not run.
  - Redacted receipts were generated.
- `completion_definition`: CRM Core completed the first bounded read-only
  intake and correctly blocked source execution where no safe local artifacts
  existed and the policy boundary around internally used credentials needed
  clarification. No source check, live API, UI access, credential output,
  private-content output, source mutation, CRM state mutation, Launch OS doc
  touch, or use of `/Users/alejandrogomez/CRM` occurred.

- `next_action_id`: `crm_core_readonly_source_command_inventory_v0`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `completion_artifact`:
  `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`
- `completion_definition`: CRM Core clarified the standing read-only source
  policy for existing internally used credentials and created a connector-safe
  inventory of candidate MailerLite/email and Gmail/newsletter reply commands,
  classifying read-only confidence, credential behavior, output safety, mutation
  risk, standing-policy allowance, and recommended next steps. No source check,
  live API, connector call, UI access, credential output, private-content output,
  source mutation, CRM state mutation, Launch OS doc touch, or use of
  `/Users/alejandrogomez/CRM` occurred.

## Active Next Action

- `next_action_id`: `crm_core_mailerlite_healthcheck_redacted_readonly_run_v0`
- `status`: `blocked`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `objective`: Run the first actual CRM Core read-only source-health command
  only after confirming a redaction guard for MailerLite healthcheck output.
- `why_now`: The command inventory identifies the MailerLite healthcheck as the
  best first source-health candidate because it is documented as read-only and
  directly tests the Email/MailerLite source. It remains blocked until terminal,
  chat, and receipt output are guaranteed not to expose credential source,
  credential length, credential fingerprint, tokens, subscriber rows, campaign
  bodies, or private content.
- `allowed_scope`:
  - Follow `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`.
  - Read `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`.
  - Present or confirm the exact redaction guard for
    `crm:vnext:mailerlite-healthcheck`.
  - If approved and redaction-safe, run only the MailerLite healthcheck with low
    page caps and aggregate-only receipt output.
  - Produce redacted receipts in `/Users/alejandrogomez/Documents/Mantis-Reports`
    if the command is run.
- `forbidden_scope`:
  - No source check until the redaction guard is confirmed.
  - No credential source, credential length, or credential fingerprint in
    terminal, chat, or receipts.
  - No token, header, cookie, env value, secret, subscriber list, raw row, full
    email body, private URL, campaign body, or private content output.
  - No MailerLite mutation.
  - No Gmail, Shopify, Instagram, or UI access.
  - No source mutation.
  - No CRM state mutation.
  - No card, ledger, Fact Store, Signal Event Ledger, Engagement Snapshot
    Ledger, source-result ledger, or scoring write.
  - No outbound action.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `expected_files`:
  - `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`
  - `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Redaction guard is not confirmed.
  - Command output would include credential source, credential length,
    credential fingerprint, token, header, cookie, env value, secret,
    subscriber row, campaign body, or private content.
  - Any required credential, token, env, or secret print/inspection by Codex.
  - Any need to open UI.
  - Any request to print raw rows, subscriber lists, full email bodies, or
    private content.
  - Any mutation, write, or outbound action.
  - Any ambiguity about whether a command is read-only.
  - Root is not `/Users/alejandrogomez/CRM-core`.
  - Branch is not `codex/crm-core-reentry`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read
  `docs/crm-vnext/crm-core-codex-profile.md`, this file,
  `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`, and
  `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`. Do not run
  any source check until the MailerLite healthcheck redaction guard is confirmed.
- `completion_definition`: CRM Core either confirms the redaction guard and runs
  the first aggregate-only MailerLite source-health check, or blocks with the
  exact output field or command behavior that prevents a safe run. No source
  mutation, CRM write, private-content output, Launch OS doc touch, or use of
  `/Users/alejandrogomez/CRM` occurs.

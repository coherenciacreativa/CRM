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

## Active Next Action

- `next_action_id`: `crm_core_email_mailerlite_gmail_readonly_source_intake_v0`
- `status`: `active`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `objective`: Use the standing read-only source policy to run the first
  autonomous CRM Core read-only source checks for Email/MailerLite and
  Gmail/newsletter replies, producing redacted source-health receipts and no
  CRM/source mutations.
- `why_now`: Alejandro approved standing read-only access for MailerLite/email
  and Gmail/newsletter reply metadata. CRM Core can now move from approval packet
  preparation to controlled source-health/intake execution without asking for a
  phrase each time, while still keeping writes, scoring, private content,
  Instagram UI and outbound actions gated.
- `allowed_scope`:
  - Follow `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`.
  - Read MailerLite/email metadata read-only where existing connectors/scripts
    support it.
  - Run Gmail/newsletter reply metadata-only discovery where existing
    connectors/scripts support it.
  - Produce redacted receipts in
    `/Users/alejandrogomez/Documents/Mantis-Reports`.
  - Run local dry-run adapters only if safe and non-mutating.
  - Summarize aggregate counts, freshness, field availability, and blockers.
- `forbidden_scope`:
  - No source mutation.
  - No CRM state mutation.
  - No card writes.
  - No ledger writes.
  - No Fact Store writes.
  - No scoring writes.
  - No full email bodies.
  - No subscriber list dumps.
  - No raw rows.
  - No private URLs or campaign bodies.
  - No Instagram UI, DM, or private inspection.
  - No outbound actions.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `expected_files`:
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Any required credential, token, env, or secret read/print.
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
  `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`, and relevant
  MailerLite/Gmail CRM Core docs/scripts/tests. Execute only read-only checks
  allowed by the standing policy. Produce redacted receipts and stop before any
  write/scoring/outbound/Instagram UI boundary.
- `completion_definition`: CRM Core has generated redacted read-only
  source-health/intake receipts for the first safe Email/MailerLite and/or Gmail
  newsletter reply metadata checks, without printing sensitive data, mutating
  source systems, writing CRM state, or touching Launch OS.

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

## Active Next Action

- `next_action_id`: `crm_core_first_source_health_verification_decision_v0`
- `status`: `blocked`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `objective`: Choose which source family should receive the first real
  source-health verification and by which safe route.
- `why_now`: The verification packet plan is ready, but running any verification
  would cross a new approval boundary. Alejandro must choose the first source
  family and approve the route before CRM Core performs any source-health check.
- `allowed_scope`:
  - Summarize the three available verification options.
  - Recommend the safest first verification.
  - Wait for Alejandro's decision.
  - No execution.
- `forbidden_scope`:
  - No live API calls.
  - No Instagram UI.
  - No Gmail search.
  - No MailerLite API call.
  - No source snapshots/exports unless explicitly supplied/approved.
  - No CRM state mutation.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `options_to_present`:
  1. Instagram source-health verification packet.
  2. MailerLite/email snapshot or no-secret health verification packet.
  3. Gmail/newsletter reply metadata-only verification packet.
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Any attempted source-health verification.
  - Any live API call, UI access, credential access, private content read, source
    mutation, CRM state mutation, Launch OS doc touch, or use of
    `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read
  `docs/crm-vnext/crm-core-codex-profile.md`, this file,
  `docs/crm-vnext/community-source-health-reality-audit-v0.md`, and
  `docs/crm-vnext/community-source-health-verification-packets-v0.md`. Do not
  run verification. Present the choice to Alejandro and stop.
- `completion_definition`: Alejandro chooses one first verification route and
  gives explicit approval or declines all options.

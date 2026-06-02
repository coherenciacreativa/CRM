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

## Active Next Action

- `next_action_id`: `crm_core_community_source_health_verification_packets_v0`
- `status`: `active`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `objective`: Prepare read-only/no-live source-health verification packets for
  Instagram, MailerLite/email and Gmail/newsletter replies. The packets should
  define what can be verified safely, what would require approval, what commands
  or UI/manual evidence routes would be used, what must not be printed, and what
  would still remain unknown.
- `why_now`: The reality audit showed that local adapters/contracts exist, but
  live/source availability, snapshot freshness, Gmail metadata health and
  Instagram source access are not yet verified. Before identity bridge work, heat
  preview, or CEO/operator brief automation, CRM Core needs source-health
  verification boundaries.
- `allowed_scope`:
  - Update CRM Core docs only.
  - Prepare approval/verification packets.
  - No live execution.
  - No connector/API calls.
  - No secrets.
  - No source-system mutation.
  - No CRM state mutation.
- `forbidden_scope`:
  - No live checks yet.
  - No Instagram browsing.
  - No Gmail search.
  - No MailerLite API call.
  - No card/ledger/scoring/Fact Store writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Any verification would require live API, UI login, credentials, private
    message content, source mutation, or CRM state write.
  - Root is not `/Users/alejandrogomez/CRM-core`.
  - Branch is not `codex/crm-core-reentry`.
  - Launch OS docs would be touched.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read
  `docs/crm-vnext/crm-core-codex-profile.md`, this file,
  `docs/crm-vnext/community-signal-readiness-board-v0.md` and
  `docs/crm-vnext/community-source-health-reality-audit-v0.md`. Prepare
  verification packets only; do not run verification.
- `completion_definition`: CRM Core has read-only/no-live verification packets
  for Instagram, MailerLite/email, and Gmail/newsletter replies that define safe
  verification boundaries, approval requirements, commands or UI/manual evidence
  routes, secret/private-content redaction rules, and what remains unknown.

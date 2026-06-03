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

## Active Next Action

- `next_action_id`: `crm_core_mailerlite_email_source_health_verification_awaiting_approval_v0`
- `status`: `blocked`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `objective`: Wait for Alejandro's exact approval phrase before running the
  local snapshot/export metadata-only Email/MailerLite source-health
  verification.
- `why_now`: The approval packet exists, but executing even a local metadata
  verification crosses a new approval boundary. The system must wait for
  Alejandro to paste the exact approval phrase or decline.
- `allowed_scope`:
  - Present the exact approval phrase from the packet.
  - Answer clarifying questions.
  - Wait.
  - No execution.
- `forbidden_scope`:
  - No verification run.
  - No live MailerLite API.
  - No MailerLite UI.
  - No Gmail.
  - No Instagram.
  - No source snapshots/exports unless explicitly supplied/approved.
  - No secrets.
  - No subscriber list dumps.
  - No raw rows.
  - No CRM state mutation.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `approval_phrase_required`:
  `I approve the CRM Core Email/MailerLite source-health verification using local snapshot/export metadata only. Do not call live APIs, open UI, print subscriber lists, mutate MailerLite, or write CRM state.`
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Alejandro has not provided the exact approval phrase.
  - Alejandro declines or asks to modify the verification route.
  - Any attempted source-health verification before exact approval.
  - Any live API call, UI access, credential access, private content read,
    snapshot/export inspection, subscriber list dump, raw row print, source
    mutation, CRM state mutation, Launch OS doc touch, or use of
    `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read
  `docs/crm-vnext/crm-core-codex-profile.md`, this file, and
  `docs/crm-vnext/mailerlite-email-source-health-approval-packet-v0.md`. Do not
  run verification unless Alejandro provides the exact approval phrase.
- `completion_definition`: Alejandro either provides the exact approval phrase,
  declines, or asks to modify the verification route.

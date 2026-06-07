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

- `next_action_id`: `crm_core_mailerlite_healthcheck_redacted_readonly_run_v0`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `result`: `healthy`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_final_cursor_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_final_cursor_2026-06-03.md`
- `findings`:
  - Groups probe succeeded.
  - Subscribers probe succeeded.
  - Subscriber cursor scan succeeded.
  - Scan exhausted before cap.
  - 14 pages scanned.
  - 1373 subscribers scanned.
  - Credential metadata absent from terminal, Markdown receipt, and JSON
    receipt.
  - No source or CRM writes.
- `completion_definition`: CRM Core confirmed MailerLite read-only source health
  with redacted aggregate receipts, no credential metadata leakage, no raw
  subscriber output, no MailerLite mutation and no CRM state mutation.

- `next_action_id`: `crm_core_mailerlite_engagement_metadata_intake_plan_v0`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-04`
- `completed_at`: `2026-06-04`
- `completion_artifact`:
  `docs/crm-vnext/mailerlite-engagement-metadata-intake-plan-v0.md`
- `objective`: Plan the next no-write MailerLite engagement metadata intake
  step now that MailerLite source health is confirmed healthy.
- `why_now`: CRM Core can read MailerLite safely at the source-health level. The
  next useful step is to define how engagement metadata should be ingested or
  supplied for local dry-run processing without printing raw rows, writing CRM
  state, writing ledgers, changing scoring, or mutating MailerLite.
- `allowed_scope`:
  - Read CRM Core MailerLite engagement docs/scripts/tests.
  - Inspect command contracts without running live engagement intake yet.
  - Define safe fields, redaction rules, limits, output receipts, and dry-run
    adapter path.
  - Prepare the next execution plan.
- `forbidden_scope`:
  - No live engagement intake yet.
  - No raw subscriber row printing.
  - No subscriber list dumps.
  - No card writes.
  - No ledger writes.
  - No Fact Store writes.
  - No scoring writes.
  - No MailerLite mutation.
  - No outreach.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `expected_files`:
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`
  - `docs/crm-vnext/mailerlite-engagement-signals.md`
  - `scripts/crm-vnext-mailerlite-engagement-signals.mjs`
  - `__tests__/crm-vnext-mailerlite-engagement-signals.spec.ts`
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Any need to run live engagement intake before a plan is approved.
  - Any need to print raw rows, subscriber lists, private emails, campaign
    bodies, credentials, tokens, headers, env values, or private content.
  - Any source mutation, CRM write, scoring write, ledger write, or outbound
    action would be required.
  - Launch OS docs or `/Users/alejandrogomez/CRM` would be touched.
  - Root is not `/Users/alejandrogomez/CRM-core`.
  - Branch is not `codex/crm-core-reentry`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read
  `docs/crm-vnext/crm-core-codex-profile.md`, this file,
  `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`,
  `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`, and
  relevant MailerLite engagement docs/scripts/tests. Do not run engagement
  intake yet. Produce a no-write intake plan and stop.
- `completion_definition`: CRM Core has a concise no-write MailerLite engagement
  metadata intake plan that defines safe source route, allowed fields, forbidden
  outputs, receipt paths, validation commands, dry-run adapter path and next stop
  condition. No source check, live engagement intake, CRM write, ledger write,
  scoring write, MailerLite mutation, Launch OS doc touch, or use of
  `/Users/alejandrogomez/CRM` occurred.

- `next_action_id`: `crm_core_mailerlite_engagement_metadata_execution_approval_packet_v0`
- `status`: `superseded`
- `created_at`: `2026-06-04`
- `updated_at`: `2026-06-05`
- `completed_at`: `2026-06-05`
- `superseded_by`:
  `crm_core_mailerlite_engagement_snapshot_artifact_readiness_v0`
- `latest_guard`: `692771c Add redacted MailerLite engagement summary mode`
- `note`: The generic approval-packet action is superseded because the
  engagement adapter now has a committed redacted summary mode. The next
  boundary is artifact readiness, not a generic execution packet.
- `objective`: Prepare a compact approval packet for the first no-write
  MailerLite engagement metadata intake execution using supplied or approved
  snapshot/export metadata only.
- `why_now`: MailerLite source health is confirmed healthy and the no-write
  intake plan exists, but even local engagement metadata processing can expose
  subscriber-level rows if the route is not bounded and redacted. CRM Core needs
  an exact approval boundary before running the adapter or consuming any
  supplied source artifact.
- `allowed_scope`:
  - Read CRM Core routing docs, standing read-only source policy, command
    inventory, and the MailerLite engagement metadata intake plan.
  - Define the exact future source route, input artifact expectations, output
    receipt paths, redaction rules, validation commands, and approval phrase.
  - Keep the work non-executing.
- `forbidden_scope`:
  - No live engagement intake.
  - No MailerLite API call.
  - No MailerLite UI.
  - No command execution that processes subscriber engagement rows.
  - No snapshot/export inspection unless explicitly supplied and approved for
    the execution step.
  - No raw rows, subscriber lists, private emails, private URLs, campaign
    bodies, raw payloads, credentials, tokens, headers, env values, or private
    content.
  - No card writes.
  - No Signal Event Ledger writes.
  - No Engagement Snapshot Ledger writes.
  - No Fact Store writes.
  - No scoring writes.
  - No MailerLite mutation.
  - No outreach.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `expected_files`:
  - `docs/crm-vnext/crm-core-next-action.md`
  - `docs/crm-vnext/crm-core-standing-readonly-source-policy-v0.md`
  - `docs/crm-vnext/crm-core-readonly-source-command-inventory-v0.md`
  - `docs/crm-vnext/mailerlite-engagement-metadata-intake-plan-v0.md`
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Any request to run engagement intake, source checks, live APIs, UI routes, or
    adapters before Alejandro approves the execution boundary.
  - Any route would print or expose raw rows, subscriber lists, private emails,
    private URLs, campaign bodies, raw payloads, credentials, tokens, headers,
    env values, or private content.
  - Any CRM write, ledger write, Fact Store write, scoring write, MailerLite
    mutation, or outbound action would be required.
  - Launch OS docs or `/Users/alejandrogomez/CRM` would be touched.
  - Root is not `/Users/alejandrogomez/CRM-core`.
  - Branch is not `codex/crm-core-reentry`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `crm-core-readonly-source-command-inventory-v0.md`, and
  `mailerlite-engagement-metadata-intake-plan-v0.md`. Prepare the approval
  packet only; do not run intake, inspect snapshots/exports, call live systems,
  or write CRM state.
- `completion_definition`: CRM Core has a compact no-write execution approval
  packet that defines the source route, input boundary, redaction guarantees,
  receipt paths, validation commands, exact approval phrase, and stop
  conditions, or Alejandro declines or modifies the route.

- `next_action_id`: `crm_core_mailerlite_engagement_private_artifact_export_command_v0`
- `status`: `completed`
- `created_at`: `2026-06-05`
- `updated_at`: `2026-06-05`
- `completed_at`: `2026-06-05`
- `completion_artifacts`:
  - `scripts/crm-vnext-mailerlite-engagement-artifact-export.mjs`
  - `__tests__/crm-vnext-mailerlite-engagement-artifact-export.spec.ts`
  - `package.json`
- `completion_definition`: CRM Core has a focused read-only MailerLite
  engagement private artifact export command that writes raw source rows only to
  a private local artifact path outside the repo, writes redacted JSON/Markdown
  receipts, blocks artifact paths inside the repo before source access, avoids
  raw terminal/receipt output, includes upstream HTTP failure redaction coverage,
  keeps mutation/CRM flags false, and was validated without running the real
  export.

## Active Next Action

- `next_action_id`: `crm_core_mailerlite_engagement_private_artifact_export_run_v0`
- `status`: `active`
- `created_at`: `2026-06-05`
- `updated_at`: `2026-06-06`
- `objective`: Run the first bounded read-only MailerLite engagement private
  artifact export with low caps, writing the private artifact outside the repo
  and redacted receipts to Mantis-Reports.
- `why_now`: The export command exists, redaction/error-path tests pass, and
  standing read-only policy allows controlled MailerLite read-only source checks.
  CRM Core can now create the private source artifact needed for later
  `--redacted-summary` engagement processing.
- `allowed_scope`:
  - Run only `crm:vnext:mailerlite-engagement-artifact-export`.
  - Use low caps.
  - Write private artifact only under
    `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`.
  - Write redacted receipts only under
    `/Users/alejandrogomez/Documents/Mantis-Reports/`.
  - Produce aggregate/redacted output only.
- `forbidden_scope`:
  - No subscriber list printing.
  - No raw rows in terminal/chat/receipts.
  - No private URLs/campaign bodies.
  - No secrets/credential metadata.
  - No CRM state mutation.
  - No Signal Event Ledger write.
  - No Engagement Snapshot Ledger write.
  - No card write.
  - No Fact Store write.
  - No scoring write.
  - No MailerLite mutation.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `expected_files`:
  - `scripts/crm-vnext-mailerlite-engagement-artifact-export.mjs`
  - `__tests__/crm-vnext-mailerlite-engagement-artifact-export.spec.ts`
  - `package.json`
- `validation_commands`:
  - `node --check scripts/crm-vnext-mailerlite-engagement-artifact-export.mjs`
  - `npx vitest run __tests__/crm-vnext-mailerlite-engagement-artifact-export.spec.ts`
  - `git diff --check`
- `stop_conditions`:
  - Root is not `/Users/alejandrogomez/CRM-core`.
  - Branch is not `codex/crm-core-reentry`.
  - Working tree is not clean before the real export run.
  - The command would print raw rows, subscriber lists, private URLs, campaign
    bodies, credentials, credential metadata, tokens, headers, env values, or
    private content.
  - The command would write inside the repo or outside the approved private
    artifact and report directories.
  - Any source mutation, CRM write, ledger write, card write, Fact Store write,
    scoring write, or outbound action would be required.
  - Launch OS docs or `/Users/alejandrogomez/CRM` would be touched.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `crm-core-readonly-source-command-inventory-v0.md`, and the export command. Run
  only the bounded export command if the working tree is clean and root/branch
  match.
- `completion_definition`: A private MailerLite engagement source artifact exists
  outside the repo, redacted JSON/Markdown receipts exist in Mantis-Reports, no
  raw rows or secrets were printed, no source mutation or CRM write occurred, and
  the next step can be `npm run crm:vnext:mailerlite-engagement-signals -- --snapshot-file <private-artifact> --redacted-summary`.

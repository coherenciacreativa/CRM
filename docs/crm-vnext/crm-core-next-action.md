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

- `next_action_id`: `crm_core_mailerlite_engagement_private_artifact_export_run_v0`
- `status`: `completed`
- `created_at`: `2026-06-05`
- `updated_at`: `2026-06-07`
- `completed_at`: `2026-06-07`
- `completion_artifacts`:
  - `private_artifact_label`: `crm_core_mailerlite_engagement_source_artifact_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_artifact_export_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_artifact_export_2026-06-07.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_redacted_summary_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_engagement_redacted_summary_2026-06-07.md`
- `result`: `completed`
- `findings`:
  - Private artifact export completed with `1373` aggregate rows and no blockers.
  - Redacted-summary adapter processing completed with `1373` records inspected
    and `0` records skipped.
  - `dryRunProcessingEligible`: `true`.
  - `lifetimeOpens`: `12074`.
  - `lifetimeClicks`: `305`.
  - `lifetimeSent`: `20204`.
  - `recordsWithRepeatedOpens`: `972`.
  - `recordsWithRepeatedClicks`: `59`.
  - Identity anchors summary: `1373` email anchors, `0` Instagram handles, and
    `0` person ids.
  - Lifetime engagement and repeated open/click patterns are available.
  - Recent 30d/90d engagement is unavailable or zero.
  - `lastOpenAt` and `lastClickAt` are unavailable.
  - Campaign activity is unavailable.
  - Status and suppression are available.
  - No raw rows, subscriber lists, emails, private URLs, campaign bodies,
    credentials, credential metadata, tokens, headers, env values, or private
    content were printed.
  - No CRM writes, Signal Event Ledger writes, Engagement Snapshot Ledger writes,
    card writes, Fact Store writes, scoring writes, source mutations, outbound
    actions, Launch OS doc touches, or `/Users/alejandrogomez/CRM` use occurred.
- `completion_definition`: CRM Core completed the bounded MailerLite engagement
  private artifact export and local redacted-summary adapter processing using
  aggregate/redacted outputs only. The run produced redacted receipts, kept the
  private artifact path and contents out of chat and docs, avoided raw row output,
  and did not mutate MailerLite, CRM state, cards, ledgers, Fact Store, scoring,
  source-result ledgers, outbound channels, Launch OS docs, or
  `/Users/alejandrogomez/CRM`.

- `next_action_id`: `crm_core_mailerlite_email_relationship_depth_preview_v0`
- `status`: `completed`
- `created_at`: `2026-06-07`
- `updated_at`: `2026-06-07`
- `completed_at`: `2026-06-07`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_relationship_depth_preview_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_relationship_depth_preview_2026-06-07.md`
- `result`: `completed`
- `findings`:
  - Historical email relationship depth exists.
  - Repeated-open and repeated-click cohorts exist.
  - Email identity anchors are available.
  - Suppression/status context is available.
  - Recent heat, topic affinity, campaign-specific intent, last-open/last-click
    recency, Instagram bridge readiness, and person-level outreach readiness
    cannot be inferred from the aggregate result.
  - Proposed no-write tiers: repeated-click depth, repeated-open depth, broad
    historical reader, low/no historical email engagement, and
    suppression/safety review.
  - Opens remain weaker than clicks, lifetime engagement is not recent intent,
    engagement is not permission to contact, and suppression/status outranks
    warmth.
  - No raw artifact rows, subscriber-level arrays, emails, names, private URLs,
    campaign bodies, headers, tokens, env values, credential metadata, or private
    content were inspected or printed.
  - No CRM writes, Signal Event Ledger writes, Engagement Snapshot Ledger writes,
    card writes, Fact Store writes, scoring writes, outbound actions, source
    mutations, Launch OS doc touches, or `/Users/alejandrogomez/CRM` use occurred.
- `completion_definition`: CRM Core has a no-write email relationship-depth
  preview that explains what can be inferred from historical MailerLite
  engagement aggregates, what remains unknown, what gates stay closed, and what
  would be needed before any person-level preview, scoring, or outreach.

- `next_action_id`: `crm_core_mailerlite_email_person_level_private_preview_plan_v0`
- `status`: `completed`
- `created_at`: `2026-06-07`
- `updated_at`: `2026-06-07`
- `completed_at`: `2026-06-07`
- `completion_artifact`:
  `docs/crm-vnext/mailerlite-email-person-level-private-preview-plan-v0.md`
- `result`: `completed`
- `findings`:
  - A no-run plan exists for a private local person-level MailerLite email
    relationship-depth preview.
  - The plan requires private person-level artifacts to live outside the repo
    under `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`.
  - The plan defines redacted receipt rules for aggregate counts, tier counts,
    blocker counts, suppression/status counts, confidence categories, and next
    safe operator step.
  - The plan forbids names, emails, subscriber IDs, raw rows, private artifact
    contents, campaign bodies, private URLs, tokens, headers, env values,
    credential metadata, and private content in chat or standard receipts.
  - The plan defines preview-only private tiers: repeated-click depth,
    repeated-open depth, broad historical reader, low/no historical email
    engagement, suppression/safety review, and insufficient data / identity
    review.
  - The plan defines validation requirements and an exact future approval phrase.
  - No person-level preview was executed.
  - No raw rows, names, emails, CRM writes, source mutations, Launch OS docs, or
    `/Users/alejandrogomez/CRM` were touched.
- `completion_definition`: CRM Core has a no-run plan for a private person-level
  email relationship-depth preview that defines artifact storage, redaction,
  validation, stop conditions, identity handling, and what approval is required
  before any local person-level processing.

- `next_action_id`: `crm_core_mailerlite_email_person_level_private_preview_awaiting_approval_v0`
- `status`: `completed`
- `created_at`: `2026-06-07`
- `updated_at`: `2026-06-07`
- `completed_at`: `2026-06-07`
- `completion_artifacts`:
  - `private_preview_artifact_label`: `crm_core_mailerlite_email_person_level_private_preview_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_person_level_private_preview_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_person_level_private_preview_2026-06-07.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_person_level_private_preview_closeout_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_person_level_private_preview_closeout_2026-06-07.md`
- `result`: `completed`
- `findings`:
  - Person-level private preview executed locally from the private artifact.
  - Private preview artifact was written outside the repo.
  - Redacted receipt and closeout receipt were generated.
  - `recordsProcessed`: `1373`.
  - `countsByTier`: `repeated_click_depth=58`,
    `repeated_open_depth=786`, `broad_historical_reader=59`,
    `low_no_historical_email_engagement=260`,
    `suppression_safety_review=210`,
    `insufficient_data_identity_review=0`.
  - `blockers`: `missingIdentity=0`, `suppressionSafetyReview=210`,
    `insufficientEngagementData=260`.
  - `suppressionStatusSummary`: `active=1155`, `unsubscribed=136`,
    `bounced=74`, `complained=0`, `unknown=8`.
  - No names, emails, subscriber IDs, subscriber-level arrays, raw rows, private
    URLs, campaign bodies, tokens, headers, env values, credential metadata, or
    private content were printed.
  - No CRM writes, Signal Event Ledger writes, Engagement Snapshot Ledger writes,
    card writes, Fact Store writes, scoring writes, outreach, source mutations,
    Launch OS doc touches, or `/Users/alejandrogomez/CRM` use occurred.
- `completion_definition`: CRM Core completed the approved private local
  person-level MailerLite email relationship-depth preview, wrote the private
  preview artifact outside the repo, generated redacted receipts, printed no
  private identities or raw rows, and kept CRM state, cards, ledgers, Fact Store,
  scoring, outreach, source systems, Launch OS docs, and
  `/Users/alejandrogomez/CRM` untouched.

- `next_action_id`: `crm_core_mailerlite_email_relationship_depth_operator_brief_v0`
- `status`: `completed`
- `created_at`: `2026-06-07`
- `updated_at`: `2026-06-08`
- `completed_at`: `2026-06-08`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_relationship_depth_operator_brief_2026-06-07.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_relationship_depth_operator_brief_2026-06-07.md`
- `result`: `completed`
- `findings`:
  - The brief explains that historical email relationship-depth cohorts exist at
    aggregate level.
  - The repeated-click cohort is the strongest candidate for future private
    review design.
  - The repeated-open cohort is useful for relationship awareness but remains
    weaker than click behavior.
  - Suppression/status context outranks warmth.
  - Historical depth is not recent heat and does not authorize outreach.
  - Recent heat, topic affinity, campaign-specific intent, last-open/last-click
    recency, Instagram bridge readiness, and outreach readiness remain unknown.
  - Recommended safe next steps are private review queue design, future
    person-card bridge/write packet only after gates, Gmail reply metadata as a
    possible next relationship-depth source, and keeping Launch OS separate.
  - No private identities, raw rows, subscriber-level arrays, private artifact
    contents, private URLs, campaign bodies, tokens, headers, env values,
    credential metadata, or private content were printed.
  - No CRM writes, card writes, Signal Event Ledger writes, Engagement Snapshot
    Ledger writes, Fact Store writes, scoring writes, outreach, source mutation,
    Launch OS doc touches, or `/Users/alejandrogomez/CRM` use occurred.
- `completion_definition`: CRM Core has a redacted operator brief explaining the
  meaning of the MailerLite relationship-depth cohorts, safety blockers, what can
  and cannot be inferred, and the next safe gates before any CRM write, scoring,
  or outreach.

- `next_action_id`: `crm_core_mailerlite_email_private_review_queue_design_v0`
- `status`: `completed`
- `created_at`: `2026-06-08`
- `updated_at`: `2026-06-08`
- `completed_at`: `2026-06-08`
- `completion_artifact`:
  `docs/crm-vnext/mailerlite-email-private-review-queue-design-v0.md`
- `result`: `completed`
- `findings`:
  - A no-run private review queue design exists for selected MailerLite
    relationship-depth cohorts.
  - The design requires private queue artifacts to live outside the repo under
    `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`.
  - The design allows redacted receipts to include total queue candidates, counts
    by tier, counts by review status, suppression/safety counts, blocker counts,
    and next safe operator step.
  - The design forbids names, emails, subscriber IDs, raw rows, private artifact
    contents, campaign bodies, private URLs, tokens, headers, env values,
    credential metadata, and private content in redacted receipts and chat.
  - Candidate selection rules prioritize `repeated_click_depth`, treat
    `repeated_open_depth` as useful but weaker, keep `broad_historical_reader`
    lower priority, route `suppression_safety_review` to safety review, and avoid
    treating historical depth as recent heat.
  - Review states are defined for private review only.
  - Mantis behavior is limited to aggregate counts, private path labels, and
    approval questions without revealing identities in general chat or storing
    queue entries in general memory.
  - A future exact approval phrase is defined for generating or opening the
    private queue.
  - No queue was executed.
  - No private artifact rows, identities, CRM writes, source mutations, Launch OS
    docs, or `/Users/alejandrogomez/CRM` were touched.
- `completion_definition`: CRM Core has a private review queue design that
  defines how Mantis/Alejandro could inspect selected MailerLite relationship
  cohorts safely without exposing identities in chat or writing CRM state.

- `next_action_id`: `crm_core_mailerlite_email_private_review_queue_awaiting_approval_v0`
- `status`: `completed`
- `created_at`: `2026-06-08`
- `updated_at`: `2026-06-08`
- `completed_at`: `2026-06-08`
- `completion_artifacts`:
  - `private_queue_artifact_label`: `crm_core_mailerlite_email_private_review_queue_2026-06-08.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_private_review_queue_2026-06-08.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_private_review_queue_2026-06-08.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_private_review_queue_closeout_2026-06-08.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_email_private_review_queue_closeout_2026-06-08.md`
- `result`: `completed`
- `findings`:
  - Private review queue was generated from the private local relationship-depth
    preview.
  - Private queue artifact was written outside the repo.
  - Redacted receipt and closeout receipt were generated.
  - `totalQueueCandidates`: `1373`.
  - `countsByTier`: `repeated_click_depth=58`,
    `repeated_open_depth=786`, `broad_historical_reader=59`,
    `low_no_historical_email_engagement=260`,
    `suppression_safety_review=210`,
    `insufficient_data_identity_review=0`.
  - `countsByReviewStatus`: `pending_private_review=903`,
    `suppression_blocked=210`, `not_for_outreach=260`.
  - `suppressionStatusSummary`: `active=1155`, `unsubscribed=136`,
    `bounced=74`, `complained=0`, `unknown=8`.
  - No names, emails, subscriber IDs, subscriber-level arrays, raw rows, private
    URLs, campaign bodies, tokens, headers, env values, credential metadata, or
    private content were printed.
  - No CRM writes, Signal Event Ledger writes, Engagement Snapshot Ledger writes,
    card writes, Fact Store writes, source-result ledger writes, scoring writes,
    outreach, source mutations, Launch OS doc touches, or
    `/Users/alejandrogomez/CRM` use occurred.
- `completion_definition`: CRM Core generated the approved private MailerLite
  relationship-depth review queue artifact outside the repo, generated redacted
  receipts, recorded aggregate queue counts, printed no identities or raw rows,
  and kept CRM state, ledgers, cards, Fact Store, scoring, outreach, source
  systems, Launch OS docs, and `/Users/alejandrogomez/CRM` untouched.

- `next_action_id`: `crm_core_mailerlite_email_private_review_queue_inspection_future_boundary`
- `status`: `parked_blocked`
- `created_at`: `2026-06-08`
- `updated_at`: `2026-06-08`
- `meaning`: MailerLite relationship-depth private review queue exists, but
  opening or inspecting person-level queue entries, showing identities, writing
  CRM state, scoring, creating outreach lists, or sending communications requires
  a future explicit approval and likely a dedicated private review surface.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_daily_signal_capture_design_v0`
- `status`: `completed`
- `created_at`: `2026-06-08`
- `updated_at`: `2026-06-09`
- `completed_at`: `2026-06-09`
- `completion_artifact`: `docs/crm-vnext/instagram-daily-signal-capture-design-v0.md`
- `objective`: Design, but do not execute, the first Instagram daily signal
  capture ritual for CRM Core, including frequent story viewers, new followers,
  DMs, story replies, comments, likes, Instagram-to-email bridge, and the future
  welcome audio DM lane.
- `why_now`: MailerLite now provides historical email relationship-depth and a
  private review queue. The next highest-leverage CRM Core source is Instagram,
  because it is Alejandro's main public/community channel and captures live
  signals such as follows, story views, DMs, replies, email handoffs, likes, and
  comments.
- `allowed_scope`:
  - Design only.
  - No Instagram UI execution.
  - No API calls.
  - No DMs sent.
  - No story viewer inspection yet.
  - No private thread opening.
  - No source mutation.
  - No CRM writes.
  - Define read-only capture ritual, private artifact behavior, redacted receipt
    behavior, stop conditions, and future approval boundaries.
- `forbidden_scope`:
  - No Instagram UI browsing.
  - No Computer Use execution.
  - No API/webhook probing.
  - No DM replies.
  - No welcome audio sending.
  - No follows/likes/reactions.
  - No story viewer collection yet.
  - No private content export.
  - No CRM writes.
  - No scoring writes.
  - No ledgers/cards/Fact Store writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `expected_files`:
  - `docs/crm-vnext/crm-core-next-action.md`
- `validation_commands`:
  - `git diff --check`
- `stop_conditions`:
  - Root is not `/Users/alejandrogomez/CRM-core`.
  - Branch is not `codex/crm-core-reentry`.
  - Any need to browse Instagram UI, use Computer Use, call APIs/connectors, send
    DMs, collect story viewers, open private threads, export private content,
    perform source mutation, or write CRM state.
  - Any need to write ledgers, cards, Fact Store, scoring, source-result ledgers,
    outreach lists, or outbound actions.
  - Launch OS docs or `/Users/alejandrogomez/CRM` would be touched.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `crm-core-readonly-source-command-inventory-v0.md`, and the Instagram sections
  of `community-signal-readiness-board-v0.md` and
  `community-source-health-reality-audit-v0.md`. Design only; do not execute
  Instagram UI/API/webhook/source actions, open private content, call connectors,
  send messages, or write CRM state.
- `completion_definition`: CRM Core has a no-run design for Instagram daily
  signal capture that covers story viewers/frequency, new followers, DMs, email
  handoffs, likes/comments, redacted receipts, private artifacts, future
  welcome-audio lane, and clear approval boundaries before any UI/API/outbound
  action.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_daily_signal_capture_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-09`
- `updated_at`: `2026-06-09`
- `completed_at`: `2026-06-09`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_signal_capture_pilot_2026-06-09.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_signal_capture_pilot_2026-06-09.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_signal_capture_pilot_closeout_2026-06-09.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_signal_capture_pilot_closeout_2026-06-09.md`
- `result`: `completed_partial`
- `findings`:
  - Instagram UI was accessible without login, checkpoint, or CAPTCHA.
  - Story tray was visible with 12 items.
  - Feed viewport showed 3 posts.
  - Messages entrypoint was visible.
  - No useful CRM signal capture happened yet: no new follower signals, no story
    viewer frequency signals, no DM/story reply indicators, and no email handoff
    candidates were captured.
  - No Instagram actions were performed.
  - No DMs were opened, no story viewers were collected, and no welcome audio was
    sent.
  - No private content, handles tied to private identities, names, emails, DMs,
    story viewer lists, screenshots, private URLs, message bodies, tokens,
    headers, env values, credential metadata, or private content were printed.
  - No CRM writes, Signal Event Ledger writes, Engagement Snapshot Ledger writes,
    card writes, Fact Store writes, source-result ledger writes, scoring writes,
    source mutations, Launch OS doc touches, or `/Users/alejandrogomez/CRM` use
    occurred.
- `objective`: Wait for Alejandro approval before any Instagram UI, Computer
  Use, API, webhook, manual source capture, story viewer collection, DM
  inspection, welcome audio, or source action execution.
- `why_now`: CRM Core now has a no-run Instagram Daily Signal Capture v0 design.
  Any real Instagram capture would cross a new source and private-context
  boundary, so execution must wait for explicit approval of the exact route.
- `allowed_scope`:
  - Present the design and exact route options.
  - Answer clarifying questions.
  - Wait for Alejandro's approval or route changes.
  - No execution.
- `forbidden_scope`:
  - No Instagram UI browsing.
  - No Computer Use.
  - No Instagram API or webhook calls.
  - No DM opening or reading.
  - No story viewer collection.
  - No welcome audio sending.
  - No follows, likes, reactions, comments, replies, archives, labels, or source
    mutations.
  - No private content printing.
  - No CRM writes.
  - No Signal Event Ledger writes.
  - No Engagement Snapshot Ledger writes.
  - No card writes.
  - No Fact Store writes.
  - No scoring writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `options_to_present`:
  1. Manual evidence packet route.
  2. UI / Computer Use read-only route, only with explicit approval and stop
     conditions.
  3. Export/snapshot route if Alejandro supplies an approved artifact.
  4. Separate future Instagram API/webhook source-health investigation.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `community-signal-readiness-board-v0.md`,
  `community-source-health-reality-audit-v0.md`, and
  `instagram-daily-signal-capture-design-v0.md`. Do not execute Instagram work.
  Present the approval boundary and stop.
- `completion_definition`: Alejandro approves a specific first Instagram signal
  capture route, declines execution, or asks to revise the design.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_signal_surface_access_pilot_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-09`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-09`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_signal_surface_access_pilot_retry_2026-06-09.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_signal_surface_access_pilot_retry_2026-06-09.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_signal_surface_access_pilot_closeout_2026-06-09.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_signal_surface_access_pilot_closeout_2026-06-09.md`
- `result`: `completed_partial`
- `findings`:
  - Notifications surface was reached.
  - New follower notifications were visible in aggregate.
  - Story-related notification groups were visible in aggregate.
  - Notification time buckets were visible in aggregate.
  - Messages inbox entry surface was reachable.
  - Story viewer frequency requires repeated captures or an approved private
    artifact.
  - DM/email handoff detection requires a private-thread boundary.
  - No Instagram actions were performed.
  - No story viewer lists were collected and no private threads were opened.
  - No private content, handles tied to private identities, names, emails, DMs,
    screenshots, story viewer lists, private URLs, message bodies, tokens,
    headers, env values, credential metadata, or private content were printed.
  - No CRM writes, Signal Event Ledger writes, Engagement Snapshot Ledger writes,
    card writes, Fact Store writes, source-result ledger writes, scoring writes,
    source mutations, Launch OS doc touches, or `/Users/alejandrogomez/CRM` use
    occurred.
- `objective`: Wait for Alejandro approval before a second, more targeted UI /
  Computer Use read-only pilot that tests whether new follower, story viewer
  frequency, and DM/email handoff surfaces can be reached safely.
- `why_now`: The first pilot proved basic Instagram UI access but did not reach
  the surfaces where the highest-value CRM signals live. The next pilot should
  test those surfaces explicitly, without capturing broad private content or
  taking visible actions.
- `allowed_scope`:
  - Present the route options.
  - Define exact UI surfaces to test.
  - Wait for approval.
  - No execution.
- `surfaces_to_test_later`:
  1. New followers / notifications surface.
  2. Story viewer frequency surface.
  3. DM/story reply/email handoff surface.
- `forbidden_scope`:
  - No execution until approval.
  - No story viewer collection yet.
  - No DM opening yet.
  - No welcome audio.
  - No source action.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`, and
  `instagram-daily-signal-capture-design-v0.md`. Do not execute Instagram work.
  Present the second targeted surface-access pilot options and stop.
- `completion_definition`: Alejandro either approves the second targeted
  surface-access pilot, declines it, or modifies the route.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_capture_design_v0`
- `status`: `completed`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifact`: `docs/crm-vnext/instagram-daily-notifications-capture-design-v0.md`
- `completion_definition`: CRM Core has a no-run design for the first minimal
  Instagram daily notifications capture route, with notifications-surface-only
  scope, aggregate capture fields, forbidden private content, dedupe/read-state
  safeguards, private artifact behavior, redacted receipt behavior, stop
  conditions, welcome-audio separation, and closed gates. No Instagram work,
  Computer Use, UI, API, DMs, story viewer collection, welcome audio, source
  action, private content print, CRM write, source mutation, Launch OS doc touch,
  or `/Users/alejandrogomez/CRM` use occurred.
- `objective`: Design, but do not execute, the first minimal daily Instagram
  notifications capture route for CRM Core using only notification-surface
  observations, aggregate counts, private artifacts, and redacted receipts.
- `why_now`: The surface-access pilot showed that the notifications surface is
  reachable and can expose new follower and story-related signal groups. It is
  the safest first executable Instagram capture route before deeper story viewer
  lists, DM thread review, email handoff extraction, or welcome audio.
- `allowed_scope`:
  - Design only.
  - Use the surface-access pilot receipt.
  - Define notification-surface capture boundaries.
  - Define private artifact behavior.
  - Define redacted receipt behavior.
  - Define dedupe/read-state safeguards.
  - Define stop conditions.
  - No execution.
- `design_must_cover`:
  1. New follower notifications.
  2. Story-related notification groups.
  3. Notification time buckets.
  4. Dedupe / already-seen handling.
  5. Read-state ambiguity.
  6. Private artifact path.
  7. Redacted receipt fields.
  8. What remains blocked: full story viewer frequency, DM/email handoff
     extraction, welcome audio sending, CRM writes, scoring, and outreach.
- `forbidden_scope`:
  - No Instagram UI execution.
  - No Computer Use.
  - No DMs opened.
  - No story viewer collection.
  - No welcome audio.
  - No source action.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-signal-capture-design-v0.md`, and the latest Instagram
  surface-access pilot receipts. Design only; do not execute Instagram UI,
  Computer Use, API, DM, story viewer, welcome audio, source, or CRM actions.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_capture_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_capture_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_capture_2026-06-10.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_capture_closeout_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_capture_closeout_2026-06-10.md`
- `result`: `completed_partial`
- `findings`:
  - First notifications capture executed.
  - Source health state: partial.
  - Notification surface reached.
  - Total visible notification groups: 11.
  - Visible new follower notification groups: 4.
  - Visible story-related notification groups: 0.
  - Visible notification time buckets: 2.
  - Read-state ambiguity was not visibly triggered but is not fully provable.
  - This route did not provide story viewer frequency.
  - This route did not provide DM/email handoff evidence.
  - No Instagram actions were performed.
  - No private content was printed.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before any execution of the daily
  notifications capture route.
- `why_now`: The no-run design exists, but any Instagram UI or Computer Use
  execution crosses a fresh approval boundary. CRM Core must wait before opening
  the notifications surface again.
- `allowed_scope`:
  - Present the notifications capture design.
  - Answer clarifying questions.
  - Wait for Alejandro approval, decline, or route modification.
  - No execution.
- `forbidden_scope`:
  - No Instagram UI execution.
  - No Computer Use.
  - No API or connector calls.
  - No DMs opened.
  - No story viewer collection.
  - No welcome audio.
  - No follow, like, react, comment, reply, archive, label, mark, or source
    mutation.
  - No private content, handles tied to private identities, names, emails, DMs,
    screenshots, story viewer lists, private URLs, message bodies, tokens,
    headers, env values, credential metadata, or private content printed.
  - No CRM writes.
  - No Signal Event Ledger writes.
  - No Engagement Snapshot Ledger writes.
  - No card writes.
  - No Fact Store writes.
  - No source-result ledger writes.
  - No scoring writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-signal-capture-design-v0.md`, and
  `instagram-daily-notifications-capture-design-v0.md`. Do not execute Instagram
  UI, Computer Use, API, DM, story viewer, welcome audio, source, or CRM actions
  unless Alejandro gives a fresh explicit approval for this exact route.
- `completion_definition`: CRM Core executed the first read-only Instagram
  notifications capture from the notifications surface only, created redacted
  aggregate receipts, recorded partial source health, and kept closed all gates
  for DMs, story viewer lists, welcome audio, Instagram actions, private content,
  CRM writes, ledgers, cards, Fact Store, scoring, source mutations, Launch OS
  docs, and `/Users/alejandrogomez/CRM`.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_notifications_repeated_capture_protocol_v0`
- `status`: `completed`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifact`: `docs/crm-vnext/instagram-notifications-repeated-capture-protocol-v0.md`
- `completion_definition`: CRM Core has a no-run repeated capture protocol for
  Instagram notifications that explains how multiple notifications captures can
  produce redacted trend signals, how dedupe/read-state ambiguity is handled,
  what remains blocked, and when to graduate to a daily ritual. No new
  Instagram work, UI, Computer Use, API, DMs, story viewer collection, welcome
  audio, private content print, CRM write, source mutation, Launch OS doc touch,
  or `/Users/alejandrogomez/CRM` use occurred.
- `objective`: Design, but do not execute, the repeated capture protocol that
  would allow daily notifications captures to become useful over time through
  dedupe, time buckets, redacted trend counts, and source-health monitoring.
- `why_now`: The first notifications capture produced useful aggregate
  follower-signal data but also showed viewport/read-state and frequency
  limitations. Repeated captures are needed before notification-surface data can
  support daily pulse trends.
- `allowed_scope`:
  - Design only.
  - Use only redacted receipts from the first notifications capture.
  - Define repeated capture cadence.
  - Define dedupe/read-state safeguards.
  - Define trend fields.
  - Define when this route is useful enough for a daily Mantis brief.
  - Define what still requires separate pilots: story viewers, DMs/email
    handoff, welcome audio.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-capture-design-v0.md`, and the redacted
  notifications capture receipts. Design only; do not execute Instagram UI,
  Computer Use, API, DM, story viewer, welcome audio, source, or CRM actions.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_notifications_repeated_capture_pilot_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_repeated_capture_pilot_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_repeated_capture_pilot_2026-06-10.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_repeated_capture_pilot_closeout_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_repeated_capture_pilot_closeout_2026-06-10.md`
- `result`: `completed_partial`
- `findings`:
  - Second repeated notifications capture completed partially.
  - Total visible notification groups: 10.
  - Visible new follower notification groups: 4.
  - Visible story-related notification groups: 1.
  - Visible notification time buckets: 3.
  - Deltas from prior capture: -1 / 0 / +1 / +1.
  - Blockers: `viewport_only_capture`,
    `read_state_ambiguity_not_visibly_triggered_but_not_fully_provable`,
    `story_viewer_frequency_not_available_from_notifications_surface`,
    `dm_email_handoff_not_in_scope`, and
    `dedupe_not_provable_without_private_anchors`.
  - No Instagram actions were performed.
  - No private content was printed.
  - No CRM writes or source mutations occurred.
  - Computer Use quality mode was not explicitly proven and requires future
    instrumentation.
- `objective`: Wait for Alejandro approval before running the next
  notifications capture under the repeated-capture protocol.
- `why_now`: The repeated capture protocol exists, but another Instagram UI /
  Computer Use capture crosses a fresh approval boundary. CRM Core must wait
  before running the next notification-surface capture.
- `allowed_scope`:
  - Present the repeated capture protocol.
  - Answer clarifying questions.
  - Wait for Alejandro approval, decline, or route modification.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No API or connector calls.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No follow, like, react, comment, reply, archive, label, mark, or source
    mutation.
  - No private content, handles tied to private identities, names, emails, DMs,
    screenshots, story viewer lists, private URLs, message bodies, tokens,
    headers, env values, credential metadata, or private content printed.
  - No CRM writes.
  - No Signal Event Ledger writes.
  - No Engagement Snapshot Ledger writes.
  - No card writes.
  - No Fact Store writes.
  - No source-result ledger writes.
  - No scoring writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-capture-design-v0.md`, and
  `instagram-notifications-repeated-capture-protocol-v0.md`. Do not execute
  Instagram UI, Computer Use, API, DM, story viewer, welcome audio, source, or
  CRM actions unless Alejandro gives a fresh explicit approval for the exact
  next capture.
- `completion_definition`: CRM Core completed the second read-only Instagram
  notifications repeated-capture pilot as partial source-health evidence,
  created redacted aggregate receipts, kept all private/source/CRM gates closed,
  and recorded that Computer Use quality mode must be explicitly instrumented in
  future captures.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_notifications_quality_gated_capture_pilot_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_capture_pilot_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_capture_pilot_2026-06-10.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_capture_closeout_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_capture_closeout_2026-06-10.md`
- `result`: `completed_partial`
- `findings`:
  - Quality-gated notifications capture completed partially.
  - `qualityGateStatus=green`.
  - `computerUseMode=native_computer_use`.
  - No fallback was used.
  - No coordinate-based actions occurred.
  - No screenshot-only navigation occurred.
  - Actions performed remained 0.
  - Source health remained partial due to viewport/read-state/story-viewer/DM
    and dedupe blockers.
  - No private content was printed.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before running the next Instagram
  notifications capture with the Computer Use Quality Gate explicitly enforced
  and reported.
- `why_now`: The notifications route is producing useful aggregate pulse
  signals, but before it becomes a daily ritual, CRM Core must prove the UI /
  Computer Use path is stable enough and not silently relying on fragile
  coordinate/screenshot fallback.
- `allowed_scope`:
  - Present the quality-gated capture route.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No coordinate fallback execution.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-capture-design-v0.md`,
  `instagram-notifications-repeated-capture-protocol-v0.md`, and
  `instagram-computer-use-quality-gate-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, welcome audio, source, CRM, coordinate, or
  screenshot fallback actions unless Alejandro gives a fresh explicit approval
  for the exact quality-gated capture route.
- `completion_definition`: CRM Core completed the quality-gated Instagram
  notifications capture as partial source-health evidence, recorded
  `qualityGateStatus=green`, confirmed native Computer Use with no fallback,
  coordinate-based actions, screenshot-only navigation, or source actions, and
  kept all private/source/CRM gates closed.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_notifications_quality_gated_capture_repeat_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_repeat_capture_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_repeat_capture_2026-06-10.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_repeat_capture_closeout_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_notifications_quality_gated_repeat_capture_closeout_2026-06-10.md`
- `result`: `completed_partial`
- `findings`:
  - Repeat quality-gated notifications capture completed partially.
  - `qualityGateStatus=yellow`.
  - `computerUseMode=safari_url_fallback_navigation`.
  - Fallback was safe URL navigation only to reach the known notifications
    surface.
  - No coordinate-based actions occurred.
  - No screenshot-only navigation occurred.
  - Actions performed remained 0.
  - Source health remained partial due to viewport/read-state/story-viewer/DM
    and dedupe blockers.
  - This counts as an acceptable yellow sample, but future rituals should
    distinguish planned safe start navigation from fallback.
- `objective`: Wait for Alejandro approval before running another quality-gated
  notifications capture to gather a second green/acceptable sample for daily
  ritual readiness.
- `why_now`: The latest capture proved native Computer Use can work cleanly for
  the notifications route, but one quality-gated green sample is not enough to
  promote this to a daily ritual. CRM Core should gather at least one more
  quality-gated capture before designing automation.
- `allowed_scope`:
  - Present the next quality-gated capture route.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No coordinate fallback execution.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-capture-design-v0.md`,
  `instagram-notifications-repeated-capture-protocol-v0.md`, and
  `instagram-computer-use-quality-gate-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, welcome audio, source, CRM, coordinate, or
  screenshot fallback actions unless Alejandro gives a fresh explicit approval
  for the exact next quality-gated capture.
- `completion_definition`: CRM Core completed the quality-gated repeat
  notifications capture as partial source-health evidence, recorded an
  acceptable yellow quality sample, kept all private/source/CRM gates closed, and
  clarified that future rituals should distinguish planned safe start navigation
  from unplanned fallback.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_ritual_design_v0`
- `status`: `completed`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifact`:
  `docs/crm-vnext/instagram-daily-notifications-ritual-v0.md`
- `objective`: Design, but do not execute, the first Instagram Daily
  Notifications Ritual v0 using the quality-gated notifications route, with
  planned safe start navigation, redacted receipts, and no CRM/source mutations.
- `completion_definition`: CRM Core has a no-run daily notifications ritual
  design that explains cadence, start-surface handling, quality gate
  requirements, capture scope, trend fields, dedupe/read-state handling,
  redacted receipts, Mantis pulse boundaries, stop conditions, and what remains
  separate before any automation.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_ritual_pilot_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
- `completed_at`: `2026-06-10`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_ritual_pilot_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_ritual_pilot_2026-06-10.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_ritual_pilot_closeout_2026-06-10.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_ritual_pilot_closeout_2026-06-10.md`
- `result`: `completed_partial`
- `findings`:
  - First daily notifications ritual pilot executed.
  - `qualityGateStatus=green`.
  - `computerUseMode=planned_safe_start_navigation`.
  - `plannedSafeStartNavigation=true`.
  - `plannedSafeStartSurface=instagram_notifications`.
  - `fallbackUsed=false`.
  - No coordinate-based actions occurred.
  - No screenshot-only navigation occurred.
  - Actions performed remained 0.
  - Source health remained partial due to viewport/read-state/story-viewer/DM
    and dedupe blockers.
  - Aggregate counts: 12 total visible notification groups, 4 visible new
    follower notification groups, 2 visible story-related notification groups,
    and 2 visible notification time buckets.
  - Aggregate deltas from prior capture: +1 total visible notification group, 0
    new follower group delta, +1 story-related group, and 0 time-bucket delta.
  - No private content was printed.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before running the first Instagram
  Daily Notifications Ritual v0 pilot using the designed cadence, planned safe
  start, and quality gate.
- `why_now`: The no-run daily ritual design exists, but any Instagram UI /
  Computer Use execution crosses a fresh approval boundary. CRM Core must wait
  before opening Instagram, using Computer Use, or producing a new capture.
- `allowed_scope`:
  - Present the ritual pilot route.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No API or connector calls.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No source actions.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-ritual-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`,
  `instagram-notifications-repeated-capture-protocol-v0.md`, and
  `instagram-daily-notifications-capture-design-v0.md`. Do not execute
  Instagram UI, Computer Use, API, DM, story viewer, welcome audio, source, CRM,
  coordinate, or screenshot fallback actions unless Alejandro gives fresh
  explicit approval for the exact ritual pilot.
- `completion_definition`: CRM Core completed the first daily notifications
  ritual pilot as a green no-action sample, recorded aggregate counts and
  blockers in redacted receipts, kept source health partial, printed no private
  content, and performed no CRM writes or source mutations.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_standing_ritual_design_v0`
- `status`: `completed`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifact`:
  `docs/crm-vnext/instagram-daily-notifications-standing-ritual-v0.md`
- `objective`: Design, but do not execute, the standing daily Instagram
  notifications ritual boundary for a 5 a.m. no-action pulse capture using
  planned safe start, the Computer Use Quality Gate, redacted receipts, and
  strict stop conditions.
- `completion_definition`: CRM Core has a no-run standing daily notifications
  ritual design that explains schedule, start-surface handling, Computer Use
  quality gates, receipts, daily pulse brief, skip/stop conditions, and explicit
  separation from story viewers, DMs/email handoff, welcome audio, CRM writes,
  and outreach.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_standing_ritual_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_standing_ritual_run_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_standing_ritual_run_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_standing_ritual_run_closeout_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_daily_notifications_standing_ritual_run_closeout_2026-06-11.md`
- `result`: `completed_partial`
- `findings`:
  - First one-run standing ritual execution completed partially.
  - `qualityGateStatus=green`.
  - `computerUseMode=planned_safe_start_navigation`.
  - Planned safe start surface was `instagram_notifications`.
  - `fallbackUsed=false`.
  - No coordinate-based actions occurred.
  - No screenshot-only navigation occurred.
  - Actions performed remained 0.
  - Source health remained partial due to viewport/read-state/story-viewer/DM
    and dedupe blockers.
  - Aggregate counts: 10 total visible notification groups, 2 visible new
    follower notification groups, 2 visible story-related notification groups,
    and 4 visible notification time buckets.
  - Aggregate deltas: -2 total visible notification groups, -2 visible new
    follower notification groups, 0 visible story-related notification groups,
    and +2 visible notification time buckets.
  - No private content was printed.
  - No CRM writes or source mutations occurred.
  - This run supports standing ritual readiness but does not authorize future
    recurring execution.
- `objective`: Wait for Alejandro approval before any standing daily Instagram
  notifications ritual execution.
- `why_now`: The standing daily notifications ritual design exists, but
  executing it on a recurring or standing basis crosses a fresh approval
  boundary. CRM Core must wait before any Instagram UI, Computer Use, source, or
  automation execution.
- `allowed_scope`:
  - Present the standing ritual boundary.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-standing-ritual-v0.md`,
  `instagram-daily-notifications-ritual-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`,
  `instagram-notifications-repeated-capture-protocol-v0.md`, and
  `instagram-daily-notifications-capture-design-v0.md`. Do not execute
  Instagram UI, Computer Use, API, DM, story viewer, welcome audio, source, CRM,
  coordinate, screenshot fallback, or automation actions unless Alejandro gives
  fresh explicit approval for the exact standing ritual execution.
- `completion_definition`: CRM Core completed the first one-run standing daily
  notifications ritual execution as a green no-action sample, recorded aggregate
  counts and blockers in redacted receipts, kept source health partial, printed
  no private content, performed no CRM writes or source mutations, and did not
  authorize future recurring execution.

## Parked / Blocked Next Action

- `next_action_id`: `crm_core_instagram_daily_notifications_standing_operation_approval_v0`
- `status`: `parked_blocked`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `objective`: Wait for Alejandro approval before enabling any recurring daily
  Instagram notifications standing ritual operation.
- `meaning`: The notifications standing ritual is ready for future approval,
  but Alejandro is intentionally shifting immediate CRM Core focus to the
  higher-leverage story viewer frequency lane. Recurring notifications operation
  remains blocked until explicitly approved.
- `why_now`: CRM Core has a successful green no-action standing ritual run, but
  recurring daily operation is a new automation boundary. Alejandro must decide
  whether to approve standing operation, request another manual run, or shift
  focus to the next Instagram lane such as story viewer surface/frequency.
- `allowed_scope`:
  - Present the standing operation choice.
  - Summarize readiness evidence.
  - Answer clarifying questions.
  - Wait for approval, decline, or route modification.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No APIs/connectors.
  - No DMs.
  - No story viewer collection.
  - No welcome audio.
  - No CRM writes.
  - No source mutations.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-daily-notifications-standing-ritual-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`, and the latest standing ritual
  run redacted receipt. Do not execute Instagram UI, Computer Use, API, DM,
  story viewer, welcome audio, source, CRM, coordinate, screenshot fallback, or
  automation actions unless Alejandro gives fresh explicit approval for the
  exact next route.
- `completion_definition`: Alejandro approves recurring standing operation,
  asks for another manual standing ritual run, declines automation, or redirects
  CRM Core to another Instagram lane.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_surface_frequency_pilot_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_surface_frequency_pilot_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_surface_frequency_pilot_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_surface_frequency_pilot_closeout_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_surface_frequency_pilot_closeout_2026-06-11.md`
- `result`: `completed_partial`
- `findings`:
  - Story viewer surface pilot completed partially.
  - Current active story surface was reachable.
  - Visible aggregate viewer count was 17.
  - Viewer list was not opened.
  - Recent/archive viewer surfaces were not tested.
  - Frequency feasibility is `repeated_capture_required`.
  - `qualityGateStatus=green`.
  - `computerUseMode=planned_safe_start_navigation`.
  - No viewer handles or viewer lists were printed.
  - No Instagram actions occurred.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before any story viewer
  surface/frequency UI/Computer Use/manual/artifact pilot execution.
- `why_now`: The no-run story viewer pilot design exists or is being created,
  but any actual story viewer surface access would expose private viewer data
  and requires explicit approval.
- `allowed_scope`:
  - Present the pilot route options.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No story viewer collection.
  - No viewer list printing.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-surface-frequency-pilot-design-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`, and
  `instagram-daily-signal-capture-design-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, welcome audio, source, CRM, coordinate,
  screenshot fallback, or automation actions unless Alejandro gives fresh
  explicit approval for the exact story viewer pilot route.
- `completion_definition`: Alejandro approves, declines, or modifies the first
  story viewer surface/frequency pilot route.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_private_artifact_pilot_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_private_artifact_pilot_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_private_artifact_pilot_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_private_artifact_pilot_closeout_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_private_artifact_pilot_closeout_2026-06-11.md`
- `private_artifact_label`:
  `crm_core_instagram_story_viewer_private_artifact_pilot_2026-06-11.json`
- `result`: `completed_partial`
- `findings`:
  - Private artifact pilot completed partially.
  - Story viewer surface was reached.
  - Viewer list was opened.
  - Aggregate viewer count was 17.
  - Private viewer anchors captured count was 8.
  - Full list was not exhausted.
  - Modal close was not confirmed after native close retry.
  - Frequency feasibility is `available_with_repeated_private_artifact_captures`.
  - `qualityGateStatus=green`.
  - `computerUseMode=planned_safe_start_navigation`.
  - No viewer handles or viewer lists were printed.
  - No Instagram actions occurred.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before any story viewer private
  artifact pilot that would capture viewer handles/anchors privately for
  frequency analysis.
- `why_now`: The story viewer surface is reachable and a viewer count is
  visible, but frequency analysis requires private repeated viewer anchors.
  Capturing viewer identities crosses a new private-data boundary and requires
  explicit approval.
- `allowed_scope`:
  - Present the private artifact route design.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No viewer list opening.
  - No viewer handle capture.
  - No viewer list printing.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-surface-frequency-pilot-design-v0.md`,
  `instagram-story-viewer-private-artifact-route-design-v0.md`, and
  `instagram-computer-use-quality-gate-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, viewer list, welcome audio, source, CRM,
  coordinate, screenshot fallback, or automation actions unless Alejandro gives
  fresh explicit approval for the exact private artifact pilot route.
- `completion_definition`: Alejandro approves, declines, or modifies the first
  story viewer private artifact pilot route.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_repeat_capture_protocol_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_repeated_private_anchor_capture_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_repeated_private_anchor_capture_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_repeated_private_anchor_capture_closeout_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_repeated_private_anchor_capture_closeout_2026-06-11.md`
- `private_artifact_label`:
  `crm_core_instagram_story_viewer_repeated_private_anchor_capture_2026-06-11.json`
- `result`: `completed_partial`
- `findings`:
  - Repeated private-anchor capture completed partially.
  - Story viewer surface was reached.
  - Viewer list was opened.
  - Traversal mode was `initial_visible_view_only`.
  - Aggregate viewer count was 17.
  - Private viewer anchors captured count was 8.
  - Prior private artifact was compared privately.
  - Repeated private anchors count was 8.
  - Full-list exhaustion was not attempted and not approved.
  - `viewerModalCloseStatus=closed_confirmed`.
  - Frequency feasibility is available with more repeated private artifact
    captures.
  - `qualityGateStatus=green`.
  - `computerUseMode=planned_safe_start_navigation`.
  - No viewer handles, viewer lists, or private anchors were printed.
  - No Instagram actions occurred.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before any repeated story viewer
  private artifact capture or bounded full-list traversal.
- `why_now`: The first private artifact pilot proved partial viewer-anchor
  capture, but full-list traversal, repeated frequency capture, and modal-close
  handling require a safer protocol and a fresh approval boundary.
- `allowed_scope`:
  - Present the repeat-capture protocol.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No viewer list opening.
  - No viewer handle capture.
  - No viewer list printing.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-private-artifact-route-design-v0.md`,
  `instagram-story-viewer-private-artifact-repeat-capture-protocol-v0.md`, and
  `instagram-computer-use-quality-gate-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, viewer list, traversal, welcome audio,
  source, CRM, coordinate, screenshot fallback, or automation actions unless
  Alejandro gives fresh explicit approval for the exact repeat-capture or
  bounded traversal route.
- `completion_definition`: Alejandro approves, declines, or modifies the first
  repeated story viewer private artifact capture or bounded traversal route.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_initial_window_frequency_protocol_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_capture_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_capture_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_capture_closeout_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_capture_closeout_2026-06-11.md`
- `private_artifact_label`:
  `crm_core_instagram_story_viewer_initial_window_long_story_capture_2026-06-11.json`
- `result`: `completed_initial_visible_window`
- `findings`:
  - Initial-window long-story capture completed successfully.
  - Operator-supplied long story was used.
  - Viewer list opened.
  - Aggregate viewer count was 9.
  - Private viewer anchors captured count was 9.
  - Capture was compared against 3 private capture windows.
  - Repeated private anchors count was 0.
  - Repeated-window classes were 9 single-window, 0 repeated.
  - Full-list exhaustion was not attempted and was not approved.
  - `viewerModalCloseStatus=closed_confirmed`.
  - `qualityGateStatus=green`.
  - `computerUseMode=native_computer_use`.
  - No fallback was used.
  - No coordinate-based actions occurred.
  - No screenshot-only navigation occurred.
  - Actions performed remained 0.
  - No viewer handles, viewer lists, or private anchors were printed.
  - No Instagram actions occurred.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before any further
  initial-visible-window story viewer private-anchor captures under the new
  frequency protocol.
- `why_now`: The latest run proved a clean long-story initial-window capture
  with native Computer Use and a confirmed modal close. More long-story capture
  windows can start building private frequency evidence, but each additional
  viewer capture still crosses a private-data boundary and requires approval
  until a standing story-viewer capture boundary is defined.
- `allowed_scope`:
  - Present the initial-window frequency protocol.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No viewer list opening.
  - No viewer handle capture.
  - No viewer list printing.
  - No story pausing/holding.
  - No full-list traversal.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-private-artifact-repeat-capture-protocol-v0.md`,
  `instagram-story-viewer-initial-window-frequency-protocol-v0.md`, and
  `instagram-computer-use-quality-gate-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, viewer list, traversal, story
  pausing/holding, welcome audio, source, CRM, coordinate, screenshot fallback,
  or automation actions unless Alejandro gives fresh explicit approval for the
  exact initial-window capture route.
- `completion_definition`: Initial-window long-story capture completed with
  redacted receipts and private artifact storage only. No viewer handles,
  viewer lists, private anchors, screenshots, DMs, welcome audio, Instagram
  source actions, CRM writes, source mutations, Launch OS docs, or
  `/Users/alejandrogomez/CRM` were exposed or touched.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_initial_window_long_story_repeat_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_repeat_capture_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_repeat_capture_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_repeat_capture_closeout_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_long_story_repeat_capture_closeout_2026-06-11.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_frequency_summary_2026-06-11.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_initial_window_frequency_summary_2026-06-11.md`
- `private_artifact_label`:
  `crm_core_instagram_story_viewer_initial_window_long_story_repeat_capture_2026-06-11.json`
- `result`: `completed_initial_visible_window`
- `findings`:
  - Latest long-story initial-window capture completed successfully.
  - Viewer list opened.
  - Aggregate viewer count was 13.
  - Private viewer anchors captured count was 12.
  - Capture was compared against 4 private capture windows.
  - Repeated private anchors count was 8.
  - Repeated-window class counts were `3plus=0`, `2_window=8`,
    `single_window=4`.
  - Full-list exhaustion was not attempted and was not approved.
  - `viewerModalCloseStatus=closed_confirmed`.
  - `qualityGateStatus=green`.
  - `computerUseMode=native_computer_use`.
  - No fallback was used.
  - No coordinate-based actions occurred.
  - No screenshot-only navigation occurred.
  - Actions performed remained 0.
  - No viewer handles, viewer lists, or private anchors were printed.
  - No Instagram actions occurred.
  - No CRM writes or source mutations occurred.
- `objective`: Wait for Alejandro approval before another
  initial-visible-window story viewer private-anchor capture, preferably using
  an operator-supplied capture-friendly long story.
- `why_now`: The long-story capture succeeded cleanly and created the first
  redacted initial-window frequency summary. More long-story capture windows can
  build private frequency evidence before considering full-list traversal.
- `allowed_scope`:
  - Present the long-story repeat capture route.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No viewer list opening.
  - No viewer handle capture.
  - No viewer list printing.
  - No story pausing/holding.
  - No full-list traversal.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-private-artifact-repeat-capture-protocol-v0.md`,
  `instagram-story-viewer-initial-window-frequency-protocol-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`, and the latest redacted
  frequency summary. Do not execute Instagram UI, Computer Use, API, DM, story
  viewer, viewer list, traversal, story pausing/holding, welcome audio, source,
  CRM, coordinate, screenshot fallback, or automation actions unless Alejandro
  gives fresh explicit approval for the exact long-story initial-window capture
  route.
- `completion_definition`: Latest long-story initial-window capture completed
  with redacted receipts, first redacted frequency summary, and private artifact
  storage only. No viewer handles, viewer lists, private anchors, screenshots,
  DMs, welcome audio, Instagram source actions, CRM writes, source mutations,
  Launch OS docs, or `/Users/alejandrogomez/CRM` were exposed or touched.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_frequency_summary_review_v0`
- `status`: `completed`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-11`
- `completed_at`: `2026-06-11`
- `completion_artifact`:
  `docs/crm-vnext/instagram-story-anchor-dedupe-protocol-v0.md`
- `result`: `completed_review`
- `findings`:
  - Redacted frequency summary was reviewed.
  - Four private capture windows were compared.
  - Latest aggregate viewer count was 13.
  - Latest private anchor count was 12.
  - One-window anchors count was 4.
  - Two-window repeated anchors count was 8.
  - Three-plus repeated anchors count was 0.
  - Streak candidates count was 0.
  - 7d and 30d candidate status had insufficient windows.
  - No person-level output was produced.
  - No outreach permission was granted.
  - No scoring occurred.
  - No CRM writes occurred.
  - Next protocol must distinguish same-story reobservation from true
    cross-story frequency.
- `objective`: Review the redacted initial-window story viewer frequency
  summary and decide whether to approve another long-story initial-window
  capture, continue accumulating 3-5 windows, or design a future standing
  story-viewer capture boundary.
- `why_now`: CRM Core now has 4 compared private story-viewer capture windows
  and a first redacted frequency summary. The next useful step is a no-run
  review/decision boundary, not another capture by default.
- `allowed_scope`:
  - Use redacted receipts only.
  - Summarize aggregate frequency classes.
  - Recommend next safe step.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No viewer list opening.
  - No viewer handle capture.
  - No viewer list printing.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-private-artifact-repeat-capture-protocol-v0.md`,
  `instagram-story-viewer-initial-window-frequency-protocol-v0.md`, and the
  latest redacted story viewer initial-window frequency summary. Do not execute
  Instagram UI, Computer Use, API, DM, story viewer, viewer list, traversal,
  story pausing/holding, welcome audio, source, CRM, coordinate, screenshot
  fallback, or automation actions unless Alejandro gives fresh explicit
  approval for an exact route.
- `completion_definition`: Alejandro approves another long-story
  initial-window capture, pauses story-viewer capture, asks for a standing
  story-viewer capture boundary design, or redirects CRM Core to another
  Instagram lane.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_story_anchor_dedupe_protocol_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-11`
- `updated_at`: `2026-06-19`
- `completed_at`: `2026-06-19`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_anchor_dedupe_capture_retry_2026-06-19.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_anchor_dedupe_capture_retry_2026-06-19.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_anchor_dedupe_capture_closeout_2026-06-19.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_anchor_dedupe_capture_closeout_2026-06-19.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_cross_story_frequency_summary_2026-06-19.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_cross_story_frequency_summary_2026-06-19.md`
- `result`: `completed_initial_visible_window_dedupe_capture`
- `findings`:
  - Neutral native Computer Use preflight passed.
  - Autonomous story-anchor dedupe capture completed.
  - Story anchor confidence was `medium`.
  - Story anchor method was autonomous private metadata without visual
    fingerprint.
  - Four distinct story anchors were compared.
  - Ten private story-view edges were created.
  - Same-story reobservations were zero.
  - One private anchor appeared across three-plus distinct stories.
  - Nine private anchors appeared in one story only.
  - Viewer modal close was confirmed.
  - `qualityGateStatus=green`.
  - `computerUseMode=native_computer_use`.
  - No fallback, coordinate-based actions, screenshots, visual fingerprints,
    DMs, welcome audio, Instagram actions, private identity output, CRM writes,
    source mutations, Launch OS docs, or `/Users/alejandrogomez/CRM` use
    occurred.
- `objective`: Wait for Alejandro approval before any story viewer capture or
  frequency summary that uses the new autonomous story-anchor dedupe protocol.
- `why_now`: CRM Core had a first redacted story viewer frequency summary, but
  true frequency required distinguishing multiple captures of the same story
  from appearances across distinct stories. Alejandro did not want manual story
  labeling as an operating dependency, so CRM Core needed autonomous private
  story identity and dedupe before further frequency claims.
- `allowed_scope`:
  - Present the story anchor dedupe protocol.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No Computer Use.
  - No UI.
  - No viewer list opening.
  - No viewer handle capture.
  - No story screenshot or fingerprint capture.
  - No DMs.
  - No welcome audio.
  - No CRM writes.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-private-artifact-repeat-capture-protocol-v0.md`,
  `instagram-story-viewer-initial-window-frequency-protocol-v0.md`,
  `instagram-story-anchor-dedupe-protocol-v0.md`, and
  `instagram-computer-use-quality-gate-v0.md`. Do not execute Instagram UI,
  Computer Use, API, DM, story viewer, viewer list, traversal, story
  screenshot/fingerprint capture, story pausing/holding, welcome audio, source,
  CRM, coordinate, screenshot fallback, or automation actions unless Alejandro
  gives fresh explicit approval for an exact route using autonomous story-anchor
  dedupe.
- `completion_definition`: Alejandro approves, declines, or modifies the next
  story viewer capture/frequency route using autonomous story-anchor dedupe.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_story_viewer_cross_story_frequency_review_v0`
- `status`: `completed`
- `created_at`: `2026-06-19`
- `updated_at`: `2026-06-19`
- `completed_at`: `2026-06-19`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_cross_story_frequency_review_2026-06-19.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_viewer_cross_story_frequency_review_2026-06-19.md`
  - `docs/crm-vnext/instagram-story-anchor-confidence-hardening-protocol-v0.md`
- `result`: `completed_redacted_review`
- `findings`:
  - First redacted cross-story frequency review completed.
  - Four distinct story anchors were compared.
  - One private anchor appeared across three-plus distinct stories.
  - Nine private anchors were seen in one story.
  - Same-story reobservations were zero.
  - Story-anchor confidence was medium.
  - Result remains review-only.
  - Confidence hardening was selected as the next route.
  - No execution or private-data exposure occurred.
- `objective`: Review the first redacted cross-story frequency result and
  decide whether to approve another distinct-story initial-window capture,
  accumulate additional story anchors before stronger frequency claims, design
  story-anchor confidence hardening, or prepare a future private
  identity-bridge review surface.
- `why_now`: CRM Core now has a first autonomous story-anchor dedupe result
  showing one private anchor across at least three distinct story anchors, but
  the story-anchor confidence is medium and the result remains review-only.
  The next step should be a redacted decision review, not another capture by
  default.
- `allowed_scope`:
  - Redacted summaries only.
  - No private artifact inspection.
  - No execution.
  - Recommend one next safe route.
- `forbidden_scope`:
  - No Instagram/UI/Computer Use.
  - No viewer-list access.
  - No screenshots or fingerprints.
  - No DMs or welcome audio.
  - No CRM writes.
  - No scoring.
  - No Signal Event Ledger writes.
  - No Engagement Snapshot Ledger writes.
  - No card writes.
  - No Fact Store writes.
  - No outreach.
  - No source mutation.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-viewer-private-artifact-repeat-capture-protocol-v0.md`,
  `instagram-story-viewer-initial-window-frequency-protocol-v0.md`,
  `instagram-story-anchor-dedupe-protocol-v0.md`, and the latest redacted
  cross-story frequency summary. Do not execute Instagram UI, Computer Use,
  API, DM, story viewer, viewer list, traversal, story screenshot/fingerprint
  capture, story pausing/holding, welcome audio, source, CRM, coordinate,
  screenshot fallback, or automation actions unless Alejandro gives fresh
  explicit approval for an exact route.
- `completion_definition`: Alejandro chooses the next distinct-story capture,
  confidence-hardening, identity-review, pause, or redirect route.

## Parked / Blocked Next Action

- `next_action_id`: `crm_core_instagram_story_anchor_confidence_hardening_awaiting_approval_v0`
- `status`: `parked_blocked`
- `created_at`: `2026-06-19`
- `updated_at`: `2026-06-21`
- `meaning`: Story-anchor confidence hardening remains the next Instagram data
  objective, but reliable autonomous browser access is now a prerequisite.
  Resume it only after the browser orchestrator pilot proves at least one safe
  autonomous backend route.
- `objective`: Wait for Alejandro approval before any stable-identifier
  discovery, transient private visual fingerprint, or additional viewer capture
  that uses the story-anchor confidence-hardening protocol.
- `why_now`: Cross-story frequency is now visible, but story-anchor confidence
  remains medium. Before accumulating many more frequency claims, CRM Core
  should strengthen autonomous story identity without requiring manual labels.
- `allowed_scope`:
  - Present confidence-hardening routes.
  - Explain stable-identifier and private-fingerprint options.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram/UI/Computer Use.
  - No screenshots or fingerprints.
  - No viewer collection.
  - No DMs or welcome audio.
  - No CRM/source writes.
  - No Launch OS.
  - No `/Users/alejandrogomez/CRM`.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-story-anchor-dedupe-protocol-v0.md`,
  `instagram-story-anchor-confidence-hardening-protocol-v0.md`, and the latest
  redacted cross-story frequency review. Do not execute Instagram UI, Computer
  Use, API, DM, story viewer, viewer list, traversal, story
  screenshot/fingerprint capture, stable-ID discovery, welcome audio, source,
  CRM, coordinate, screenshot fallback, or automation actions unless Alejandro
  gives fresh explicit approval for an exact confidence-hardening route.
- `completion_definition`: Alejandro approves, declines, or modifies a
  stable-identifier discovery, transient private-fingerprint, or metadata-only
  confidence-hardening route.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_browser_access_orchestrator_design_v0`
- `status`: `completed`
- `created_at`: `2026-06-21`
- `updated_at`: `2026-06-21`
- `completed_at`: `2026-06-21`
- `completion_artifact`:
  `docs/crm-vnext/instagram-browser-access-orchestrator-v0.md`
- `completion_definition`: CRM Core has a no-run browser-access orchestrator
  design that defines Chrome-extension and native Computer Use backends, neutral
  preflight requirements, autonomous soft recovery, backend switching,
  dedicated automation profile guidance, recovery budgets, receipt fields,
  quality states, failure-streak policy, and closed gates. No UI, Computer Use,
  `@Chrome`, Instagram, private website, CRM/source write, Launch OS doc touch,
  or `/Users/alejandrogomez/CRM` use occurred.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_browser_access_orchestrator_pilot_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-21`
- `updated_at`: `2026-06-22`
- `completed_at`: `2026-06-22`
- `result`: `completed_neutral_dual_backend_pilot_with_isolation_caveat`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_browser_access_orchestrator_pilot_2026-06-22.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_browser_access_orchestrator_pilot_2026-06-22.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_browser_access_orchestrator_pilot_closeout_2026-06-22.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_browser_access_orchestrator_pilot_closeout_2026-06-22.md`
- `objective`: Wait for Alejandro approval before running a neutral dual-backend
  browser orchestrator pilot that tests Chrome-extension and native Computer Use
  selection/recovery without opening Instagram.
- `why_now`: Both Chrome extension and native Computer Use have completed green
  preflights, but each has also failed transiently. CRM Core needs one unified
  autonomous selection/recovery gate before further Instagram work.
- `allowed_scope`:
  - Present the neutral orchestrator pilot.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram.
  - No private websites.
  - No DMs or viewer lists.
  - No screenshots/fingerprints.
  - No CRM/source writes.
  - No Launch OS.
  - No `/Users/alejandrogomez/CRM`.
- `findings`:
  - Chrome Extension primary preflight passed green.
  - Native alternate neutral preflight passed green.
  - No recovery or backend switch was needed.
  - Chrome Extension was selected.
  - No human intervention was required.
  - No capture was executed.
  - Pilot quality was yellow only because native cleanup exposed unrelated
    Safari tab metadata.
  - Private details were omitted from receipts and chat.
  - Native private-route eligibility remains blocked until browser isolation is
    proven.
  - Chrome is approved as the preferred backend for the next exact Instagram
    route, subject to fresh route approval and green preflight.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-browser-access-orchestrator-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`, and the relevant browser
  preflight receipts. Do not run the dual-backend orchestrator pilot, open
  Instagram, use UI, Computer Use, `@Chrome`, private websites, APIs,
  connectors, viewer lists, DMs, screenshots/fingerprints, source writes, CRM
  writes, Launch OS docs, or `/Users/alejandrogomez/CRM` unless Alejandro gives
  fresh explicit approval for the neutral browser orchestrator pilot.
- `completion_definition`: CRM Core completed a neutral dual-backend browser
  orchestrator pilot, selected Chrome Extension as the safe preferred backend,
  recorded native isolation as incomplete for private-route work, and produced
  redacted closeout receipts without Instagram capture, private website access,
  CRM/source write, Launch OS doc touch, or `/Users/alejandrogomez/CRM` use.

## Completed / Partial Next Action

- `next_action_id`: `crm_core_instagram_stable_story_identifier_discovery_via_orchestrator_awaiting_approval_v0`
- `status`: `completed_partial`
- `created_at`: `2026-06-22`
- `updated_at`: `2026-06-22`
- `completed_at`: `2026-06-22`
- `result`: `completed_partial_native_metadata_only_discovery`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_native_own_story_stable_id_closeout_2026-06-22.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_native_own_story_stable_id_closeout_2026-06-22.md`
- `findings`:
  - Native dedicated-Safari route reached the own-story surface.
  - Profile story entry was visible and actionable.
  - `native_accessibility_press` opened the own active-story surface.
  - One story was checked.
  - Same-story consistency was confirmed.
  - Stable identifier availability was partial.
  - Story anchor method was `timing_stack_duration_composite`.
  - Story-anchor confidence remained `low`.
  - Second-story accessibility control was unavailable.
  - Viewer list was not opened.
  - No Instagram actions were performed.
  - No private story content, viewer data, screenshots, visual fingerprints,
    private identifiers, CRM/source writes, Launch OS docs, or
    `/Users/alejandrogomez/CRM` were exposed or touched.
  - Cleanup returned the dedicated browser window to the neutral local page.
- `objective`: Wait for Alejandro approval before retrying stable
  story-identifier discovery through the browser orchestrator, using Chrome
  Extension as primary and skipping native alternate testing when Chrome passes
  green.
- `why_now`: The neutral orchestrator pilot proved a safe autonomous Chrome
  backend, but own-story visibility remained degraded in Chrome. A later native
  dedicated-Safari route reached the own-story surface, while metadata-only
  identity evidence remained low-confidence.
- `allowed_scope`:
  - Record redacted closeout only.
  - Preserve no-run gates for the next confidence-hardening route.
- `forbidden_scope`:
  - No additional Instagram/UI/`@Chrome`/Computer Use.
  - No viewer-list opening or viewer collection.
  - No screenshots/fingerprints.
  - No DMs or welcome audio.
  - No CRM/source writes.
  - No Launch OS.
  - No `/Users/alejandrogomez/CRM`.
- `completion_definition`: CRM Core recorded that metadata-only stable
  story-ID discovery reached the own-story surface through native dedicated
  Safari but produced only low-confidence composite identity evidence. Story
  anchor confidence hardening remains parked until Alejandro approves the next
  exact route.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_story_private_visual_fingerprint_pilot_awaiting_approval_v0`
- `status`: `completed`
- `created_at`: `2026-06-22`
- `updated_at`: `2026-06-23`
- `completed_at`: `2026-06-23`
- `result`: `completed_green`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_private_visual_fingerprint_pilot_2026-06-23.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_private_visual_fingerprint_pilot_2026-06-23.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_private_visual_fingerprint_pilot_closeout_2026-06-23.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_private_visual_fingerprint_pilot_closeout_2026-06-23.md`
- `findings`:
  - Pilot completed green.
  - One story was fingerprinted.
  - A bounded transient image was created.
  - `dHash` was derived locally.
  - A private digest was stored.
  - Raw identifier was not stored.
  - Raw and derived images were deleted and verified.
  - No raw image was retained.
  - OCR was not used.
  - Viewer list was not opened.
  - Viewer anchors captured: `0`.
  - Next-story traversal was not used.
  - Instagram actions performed: `0`.
  - Story anchor confidence increased from `low` to `medium`.
  - Dedicated standard Safari cleanup returned to the neutral local page.
  - No private output, CRM/source write, Launch OS doc touch, or
    `/Users/alejandrogomez/CRM` use occurred.
- `objective`: Wait for Alejandro approval before one transient private
  visual-fingerprint pilot for autonomous story identity using a reachable own
  story in a dedicated isolated Safari window.
- `why_now`: Own-story access is now proven, but normal UI metadata produced
  only a low-confidence composite anchor. A transient private visual digest is
  the next promising autonomous identity route and avoids requiring Alejandro to
  label stories manually.
- `allowed_scope`:
  - Present the exact transient fingerprint pilot boundary.
  - Explain transient-image creation, local digest derivation, deletion, and
    deletion verification.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No Instagram execution.
  - No UI, Computer Use, or `@Chrome`.
  - No screenshot or fingerprint capture yet.
  - No viewer-list opening or viewer collection.
  - No next-story traversal.
  - No story pausing/holding.
  - No OCR or full story-text extraction.
  - No DMs or welcome audio.
  - No Instagram actions.
  - No CRM/source writes.
  - No ledgers, cards, Fact Store, scoring, outreach, or source mutation.
  - No Launch OS docs.
  - No `/Users/alejandrogomez/CRM`.
- `approval_phrase_required`:
  `I approve one CRM Core Instagram transient private visual fingerprint pilot for one reachable own story using native Computer Use in a dedicated isolated Safari window. Create a transient local image outside the repo only to derive a private digest, delete the raw image immediately and confirm deletion. Do not print or retain story content, open viewer lists or DMs, traverse to another story, perform Instagram actions, or write CRM/source state.`
- `future_execution_constraints`:
  - One reachable own story only.
  - Native Computer Use in a dedicated isolated Safari window.
  - Transient raw image outside the repo.
  - Private perceptual/content digest only.
  - Raw image deleted immediately after digest creation.
  - Deletion must be verified.
  - Block if deletion cannot be confirmed.
  - No raw image, story content, or private digest in chat or Mantis-Reports.
  - No OCR unless separately approved.
  - No viewer list, next-story traversal, DMs, source actions, or CRM writes.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-browser-access-orchestrator-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`,
  `instagram-story-anchor-dedupe-protocol-v0.md`, and
  `instagram-story-anchor-confidence-hardening-protocol-v0.md`. Do not execute
  UI, Computer Use, Instagram, screenshot/fingerprint capture, viewer access,
  next-story traversal, DMs, source actions, or CRM writes until Alejandro gives
  the exact approval phrase.
- `completion_definition`: Alejandro approves, declines, or modifies one
  transient private visual fingerprint pilot for one reachable own story.

## Completed Next Action

- `next_action_id`: `crm_core_instagram_story_same_fingerprint_consistency_pilot_awaiting_approval_v0`
- `status`: `completed`
- `created_at`: `2026-06-23`
- `updated_at`: `2026-06-24`
- `completed_at`: `2026-06-24`
- `result`: `completed_green`
- `completion_artifacts`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_same_fingerprint_consistency_pilot_2026-06-24.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_same_fingerprint_consistency_pilot_2026-06-24.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_same_fingerprint_consistency_closeout_2026-06-24.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_instagram_story_same_fingerprint_consistency_closeout_2026-06-24.md`
- `findings`:
  - Pilot completed green.
  - Video temporal digest strategy was used.
  - Two fingerprints were generated.
  - Each fingerprint used three bounded frames.
  - Matched strategy was confirmed.
  - Same-story fingerprint consistency was confirmed.
  - Same-story similarity classification was `strong_match`.
  - No fingerprint collision or conflict was detected.
  - All 12 transient and derived files were deleted and verified.
  - No raw image was retained.
  - OCR was not used.
  - Viewer list was not opened.
  - Viewer anchors captured: `0`.
  - Next-story traversal was not used.
  - Instagram actions performed: `0`.
  - CRM/source writes performed: `0`.
  - Story anchor confidence became `medium_consistency_confirmed`.
  - Cleanup returned the dedicated standard Safari window to neutral.
- `completion_definition`: CRM Core confirmed same-story private visual
  fingerprint repeatability for a video story using a matched multi-frame
  temporal digest strategy, with deletion verification and no private output,
  Instagram action, CRM/source write, Launch OS doc touch, or
  `/Users/alejandrogomez/CRM` use. This proves repeatability, not distinct-story
  uniqueness.

## Active Next Action

- `next_action_id`: `crm_core_instagram_story_cross_lifecycle_fingerprint_separation_pilot_awaiting_approval_v0`
- `status`: `blocked`
- `created_at`: `2026-06-24`
- `updated_at`: `2026-06-24`
- `objective`: Wait for Alejandro approval before one cross-lifecycle
  distinct-story private fingerprint separation pilot using a future/new own
  story and comparison against the prior private same-story consistency
  artifact.
- `why_now`: Same-story repeatability is confirmed, but high-confidence
  autonomous story identity also requires proof that a distinct story lifecycle
  produces a different fingerprint. Cross-lifecycle comparison avoids fragile
  next-story navigation and does not require Alejandro to label stories
  manually.
- `allowed_scope`:
  - Present the exact cross-lifecycle separation boundary.
  - Explain lifecycle proof, media-class strategy, private comparison, and
    deletion controls.
  - Answer clarifying questions.
  - Wait for approval.
  - No execution.
- `forbidden_scope`:
  - No UI, Computer Use, or Instagram execution.
  - No screenshots/fingerprints yet.
  - No next-story traversal.
  - No viewer-list opening or viewer collection.
  - No DMs, welcome audio, or Instagram actions.
  - No OCR or story interpretation.
  - No CRM/source writes, scoring, ledgers, cards, Fact Store, or outreach.
  - No Launch OS.
  - No `/Users/alejandrogomez/CRM`.
- `approval_phrase_required`:
  `I approve one CRM Core Instagram cross-lifecycle private visual fingerprint separation pilot using one future/new reachable own story and the prior private same-story consistency artifact. Use native Computer Use in a dedicated standard authenticated Safari window, derive the new story fingerprint privately, compare it locally against the prior story fingerprint, delete every raw and derived image immediately and confirm deletion. Do not require manual story labels, print or retain story content or private digests, traverse to another story, open viewer lists or DMs, perform Instagram actions, or write CRM/source state.`
- `future_execution_constraints`:
  - One future/new reachable own story only.
  - No manual story label required.
  - Distinct lifecycle must be established privately from timestamps, prior
    artifact lifecycle, expiry/disappearance, and current active-story context.
  - If distinct lifecycle cannot be confirmed, block before claiming separation.
  - Compare against the prior private same-story consistency artifact locally.
  - Record `priorStoryMediaClass`.
  - Record `currentStoryMediaClass`.
  - Record `comparisonMediaClassRelation`.
  - Record `comparisonStrategyRelation`.
  - Record `distinctStoryLifecycleConfirmed`.
  - Record `differentStoryFingerprintSeparation`.
  - Record `overallStoryAnchorConfidenceAfter`.
  - Allowed `comparisonMediaClassRelation` values are `same_media_class`,
    `cross_media_class`, and `unknown`.
  - Allowed `comparisonStrategyRelation` values are
    `matched_compatible_strategy`, `cross_strategy`, `not_comparable`, and
    `unknown`.
  - Prefer the same media class and temporal strategy when naturally available,
    but do not require Alejandro to curate story format.
  - If media classes differ, report cross-media comparison separately and do not
    overstate separation strength.
  - Use native Computer Use in a dedicated standard authenticated Safari window.
  - Safari Private Browsing forbidden.
  - Neutral native click/keyboard preflight required.
  - No next-story traversal.
  - All raw and derived images under `/tmp/` only.
  - Delete all temporary images immediately after digest derivation.
  - Verify deletion for every temporary file.
  - Block if deletion cannot be confirmed.
  - Digests, similarity values, and story content remain private.
  - No OCR, captioning, story-text extraction, face/person/object recognition,
    or semantic interpretation.
  - No viewer access, DMs, Instagram actions, CRM/source writes, ledgers,
    scoring, cards, Fact Store, or outreach.
  - High confidence may be granted only if:
    - distinct lifecycle is confirmed;
    - same-story consistency remains confirmed;
    - different-story fingerprint separation is confirmed;
    - media class is the same and the fingerprint strategy is compatible or
      matched;
    - no collision or lifecycle conflict exists;
    - deletion controls pass;
  - High confidence may also be granted if an independent strong stable
    source/UI identifier agrees with fingerprint and lifecycle evidence.
  - If `comparisonMediaClassRelation=cross_media_class`, the result may be
    recorded as useful distinct-story separation evidence, but it must not alone
    promote overall confidence to `high`.
  - The maximum result for cross-media separation alone is
    `medium_consistency_confirmed_cross_media_separation`.
  - If strategies are technically incomparable, report
    `differentStoryFingerprintSeparation=not_comparable` rather than
    `confirmed`.
  - Alejandro must not be required to curate or manually label story media
    types.
- `resume_instruction`: Start from `/Users/alejandrogomez/CRM-core` on
  `codex/crm-core-reentry`. Read `crm-core-codex-profile.md`, this file,
  `crm-core-standing-readonly-source-policy-v0.md`,
  `instagram-browser-access-orchestrator-v0.md`,
  `instagram-computer-use-quality-gate-v0.md`,
  `instagram-story-anchor-dedupe-protocol-v0.md`,
  `instagram-story-anchor-confidence-hardening-protocol-v0.md`, and
  `instagram-story-visual-fingerprint-consistency-protocol-v0.md`. Do not
  execute UI, Computer Use, Instagram, fingerprint capture, viewer access, DMs,
  source actions, or CRM writes until Alejandro gives the exact approval phrase
  and a new/distinct story lifecycle is safely available.
- `completion_definition`: Alejandro approves, declines, or modifies one
  cross-lifecycle distinct-story fingerprint separation pilot.

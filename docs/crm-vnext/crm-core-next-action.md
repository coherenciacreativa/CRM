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

## Active Next Action

- `next_action_id`: `crm_core_instagram_notifications_repeated_capture_protocol_v0`
- `status`: `active`
- `created_at`: `2026-06-10`
- `updated_at`: `2026-06-10`
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
- `completion_definition`: CRM Core has a no-run repeated capture protocol for
  Instagram notifications that explains how multiple notifications captures can
  produce redacted trend signals, how dedupe/read-state ambiguity is handled,
  what remains blocked, and when to graduate to a daily ritual.

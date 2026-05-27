# MailerLite Launch OS v0 - Control Room

Date: 2026-05-27
Status: active goal, local operating map

## Objective

Build MailerLite Launch OS v0: a safe, documented, tested architecture for onboarding, content receipts, and mini-launches, with Brújula closed as a test-only pilot, no real audience/workflow activation without explicit approval, and clear handoff to Brand and CRM.

## Operating model

- Brand Hub owns semantic canon: group names, meanings, public/private language, email style, and creative QA.
- CRM owns derived operating cache, planners, read-only audits, signal/event ledgers, and person/community intelligence.
- MailerLite owns delivery, workflow routes, minimal receipts, dedupe, and coarse audience/journey state.
- Alejandro approves live mutations, audience sends, active workflow changes, and public launch moments.

## Current evidence

Canonical Brand sources:

- `/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md`
- `/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md`
- `/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/LEAD_MAGNET_OPERATING_PATTERN_V0_1.md`
- `/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/END_TO_END_CREATIVE_QA_PROTOCOL.md`
- `/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md`

CRM operating docs:

- `docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md`
- `docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md`
- `docs/crm-vnext/source-of-truth-map.md`

Key reports:

- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_vnext_empty_group_create_EXECUTED_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_vnext_post_create_planner_verify_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_packet_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_path_packet_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_path_packet_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json`

## Brújula pilot status

Functional status: green for test-only Email 1.

Evidence:

- Five canonical `CC · ...` groups exist in MailerLite.
- Approved test subscriber exists: `saludoalsol+pruebasmayo2026@gmail.com`.
- Test subscriber is assigned only to:
  - `CC · Source · Resource · Brújula`
  - `CC · Delivered · Guide · Brújula`
- Email 1 was sent as a MailerLite UI test to the approved alias.
- Gmail read-only verification found message `19e6758e399c1095`, subject `[Test] Tu guía: La Brújula de Claridad`, in the approved alias inbox.

Not done:

- Email 2 / `Sobre el amor` has not been test-sent.
- `CC · Sent · Article · Sobre el amor` has not been assigned to the test subscriber.
- Brújula workflow remains inactive/incomplete and must stay that way until a later explicit approval.
- No audience send, public launch, active workflow change, onboarding edit, or production routing has been approved.

Creative status: yellow.

Reason:

- The inbox test proves delivery, not final brand quality.
- Body readback still shows prototype traits: plain/default presentation, no verified visual signature in the readback, and default MailerLite footer/legal language.
- Brand's email-style canon still needs to be applied before this can be considered agency-quality for public/audience use.

## Onboarding v1 audit status

Status: complete, read-only.

Evidence:

- Audit report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.md`
- Workflow: `Onboarding flow` (`154049547088167956`)
- Enabled: true
- Complete: true
- Broken: false
- Steps: 27
- Email sequence items: 11
- Qualified subscribers count exposed by API: 0
- Subscriber rows read: 0
- Live collections read: 75 groups, 13 automations, 24 fields, 8 segments, 12 forms.

Historical group map:

- `leads_instagram.csv`: trigger source; map later toward `CC · Source · IG onboarding`.
- `will get first email`: entry eligibility bucket; map later toward `CC · Journey · Editorial onboarding · Eligible`.
- `Se le envió el primer boletín`: legacy first-send marker; CRM backfill/review only for now.
- `Received second email`: overloaded in-progress bucket; do not treat as proof that `Sobre el amor` was sent.
- `Onboarding complete`: completion marker plus practical general audience; keep live until migration.

Recommendation:

- Default path: `option_b_light_clone_onboarding_v2_then_switch_entry`.
- Reason: the current onboarding is active and useful, but mixes journey state, content receipts, and audience eligibility. A clean v2/draft path is safer than patching the live flow directly.

## Onboarding v2 design status

Status: design packet generated, local-only.

Evidence:

- Design packet: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.md`
- Generator script: `scripts/crm-vnext-mailerlite-onboarding-v2-design-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-onboarding-v2-design-packet.spec.ts`

Decision posture:

- Recommended route remains `option_b_light_clone_onboarding_v2_then_switch_entry`.
- V1 stays live and untouched.
- V2 should trigger from `CC · Journey · Editorial onboarding · Eligible`, not from `leads_instagram.csv`.
- Source stays separate through `CC · Source · IG onboarding`.
- `Received second email` remains CRM review-only and must not create `content_sent=article_sobre_el_amor`.

Known work before a v2 pilot:

- Brand must map the first onboarding email to a `content_id` or declare it welcome-only without a `Sent` receipt.
- Before any v2 pilot, run a fresh planner for the 12 proposed/missing groups listed in the design packet.
- Verify in a disabled draft whether MailerLite supports persistent add/copy group actions. Destructive move-only behavior is not enough for durable receipts.
- Any workflow clone/draft, seed contact test, or production entry switch needs separate explicit approval.

## Onboarding v2 draft-build packet status

Status: local-only implementation proposal generated.

Evidence:

- Draft-build packet: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_packet_2026-05-27.md`

What it defines:

- Mandatory preflight before any mutation.
- Twelve proposed/missing empty groups required before a full v2 pilot.
- Exact disabled draft workflow shape.
- Seed test lane requirements.
- Brand and CRM handoff.
- Separate approval gates for group creation, disabled draft creation/cloning, seed test, and production entry switch.

Still not approved:

- Creating groups.
- Creating/cloning a workflow draft.
- Assigning seed contacts.
- Sending tests.
- Activating anything.
- Touching v1 or real audience.

## Onboarding v2 empty-groups dry-run status

Status: ready for exact human approval, no live changes performed.

Evidence:

- Dry-run packet: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-onboarding-v2-empty-groups-packet.spec.ts`

Read-only result:

- Live groups read: 75.
- Live automations read: 13.
- Target groups: 12.
- Existing target groups in fresh scan: 0.
- Blockers: 0.
- Onboarding v1 still enabled=true, complete=true, broken=false.
- Onboarding v2 draft does not exist yet.

Approval scope if Alejandro chooses to proceed:

- Create only the 12 named empty groups.
- No subscribers.
- No workflows.
- No automations.
- No sends.
- No Onboarding v1 touch.
- No workflow use after creation without a separate gate.

## Onboarding v2 empty-groups guarded runner status

Status: dry-run ready for exact approval; no creation executed.

Evidence:

- Runner dry-run: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-create.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-onboarding-v2-empty-groups-create.spec.ts`

Dry-run result:

- Status: `dry_run_ready_for_exact_approval`.
- Target count: 12.
- Live groups read: 75.
- Live automations read: 13.
- Created count: 0.
- Blockers: 0.
- Errors: 0.

The runner defaults to dry-run. Execute mode requires the exact phrase in the report and is still limited to creating those named empty groups only.

## Onboarding v2 execution packet status

Status: current decision queue generated, local-only, no live changes.

Evidence:

- Execution packet: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-onboarding-v2-execution-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-onboarding-v2-execution-packet.spec.ts`

Result:

- Status: `ready_for_human_decision_or_non_live_continuation`.
- Ready for exact human approval: `create_empty_onboarding_v2_groups`.
- Safe to continue without live approval from this packet: none currently open.
- Mini-launch rehearsal: closed as `rehearsal_ready_no_live_changes` for `mini_2026_06_rehearsal_inteligencia_para_descansar`.
- First email mapping: closed as `mapped_as_welcome_only_no_sent_receipt`.
- Draft workflow, seed test and production entry switch remain blocked behind separate future approvals.
- The packet explicitly preserves v1, keeps `Onboarding complete` as the current practical audience until migration, and keeps mini-launch `Experiment` identity CRM-first unless MailerLite needs routing/dedupe/exclusion.

This packet is the current board map for the Onboarding v2 lane. It prevents the operator from confusing "ready to create empty groups if approved" with "ready to use those groups in workflows."

## Onboarding v2 first email mapping status

Status: Email 1 mapped as welcome/orientation only, with no canonical `Sent` receipt.

Evidence:

- Mapping report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_mapping_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-onboarding-v2-first-email-map.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-onboarding-v2-first-email-map.spec.ts`

Decision:

- Email 1 subject: `{$name}, Tu primera nota de mi parte ✍🏻`.
- Recommended posture: `welcome_orientation_no_sent_receipt`.
- Do not create a `CC · Sent · Article · ...` group for this email in v2.
- If CRM needs observability, use a journey event such as `journey_welcome_sent`, not a content receipt.
- Brand may promote this note into a reusable article later, but that requires a separate content_id and receipt packet.

## Mini-launch OS v0 status

Status: full operating packet defined, local-only, no live changes.

Evidence:

- Mini-launch path packet: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_path_packet_2026-05-27.md`
- Mini-launch OS v0 packet: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-mini-launch-path-packet.mjs`
- Full packet script: `scripts/crm-vnext-mailerlite-mini-launch-v0-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-mini-launch-path-packet.spec.ts`
- Full packet test coverage: `__tests__/crm-vnext-mailerlite-mini-launch-v0-packet.spec.ts`

Route:

- Intake and offer brief live in Brand.
- Shopify/Web must produce draft/preview or exact handoff; no loose HTML unless Shopify is blocked and declared.
- MailerLite handles Source and Delivered receipts, draft automation shape, and test lane only after dry-run and exact approval.
- Journey and Experiment stay CRM-first by `launch_id` unless MailerLite needs routing, dedupe, or exclusion.
- CRM owns signal/event map and market-learning report.
- End-to-end QA must report functional status and creative status separately.
- Default email sequence is four steps: delivery/orientation, practice/value, story/editorial depth, and invitation/feedback. It authorizes drafts/tests only, never live sends.
- Public surfaces must not expose internal language like `lead magnet`, `CRM`, `MailerLite`, `tag`, `captura`, `automatizacion`, `simulado`, or `review`.

Default MailerLite naming pattern:

- `CC · Source · <Resource/Quiz/Interactive/etc.> · <Nombre>`
- `CC · Delivered · <Resource/Guide/Quiz result/etc.> · <Nombre>`
- `CC · Experiment · <launch_id>` only if operationally needed.

Approval gates remain closed:

- Group creation.
- Draft workflow creation/editing.
- Seed subscriber assignment.
- Test email send.
- Shopify publish or audience send.

## Mini-launch rehearsal status

Status: concrete no-live rehearsal ready.

Evidence:

- Rehearsal report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-mini-launch-rehearsal-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-mini-launch-rehearsal-packet.spec.ts`

Result:

- `launch_id`: `mini_2026_06_rehearsal_inteligencia_para_descansar`.
- Resource: `Inteligencia para descansar`, quiz/test format.
- Source candidate: `CC · Source · Quiz · Inteligencia para descansar`.
- Delivered candidate: `CC · Delivered · Quiz result · Inteligencia para descansar`.
- Experiment identity remains CRM-first by `launch_id`.
- Onboarding handoff is explicitly protected: do not insert anyone automatically into the active onboarding flow.
- All live gates remain closed: no groups, workflows, forms, subscribers, sends, Shopify publish, CRM card writes, or scoring changes.

This is the first proof that Mini-Launch OS v0 can turn one idea into a coordinated Brand/Web/MailerLite/CRM handoff without touching production.

## Mini-launch event contract status

Status: CRM event contract ready, no ledger write.

Evidence:

- Event contract report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-mini-launch-event-contract.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-mini-launch-event-contract.spec.ts`
- Signal Event Ledger support updated for mini-launch event kinds and channels.

Result:

- The `Inteligencia para descansar` rehearsal now has a concrete CRM event contract.
- The contract covers intake, Brand approval, Shopify preview, email capture, MailerLite Source/Delivered/Sent-style receipts, quiz start/completion, email opens/clicks/replies, Instagram snapshot/comment/like, market review, and continue/archive decision.
- Sample events normalize through the Signal Event Ledger without becoming `unknown`.
- Projectable now: existing email and Instagram engagement events.
- Store-only by default: operational launch events, receipts, quiz/result events, market learning and decisions.
- No append to the Signal Event Ledger was performed.
- No CRM card/scoring/Fact Store mutation, MailerLite API call, Shopify API call, subscriber read, workflow/form change, send, or outbound action was performed.

This closes the most important data-design gap in the mini-launch rehearsal: future launches can now produce learnable CRM signals without pretending every operational event is interest, warmth, or permission to contact.

## Mini-launch seed-test QA packet status

Status: seed-test QA packet ready, no live changes.

Evidence:

- Seed-test QA report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.spec.ts`

Result:

- Separates three rehearsal modes: asset-only seed preview, receipt seed test, and CRM signal dry-run.
- Confirms local asset drafting is ready, but seed email send, receipt seed test and audience launch are all closed.
- Requires Brand-approved copy and Email Style QA before any seed send.
- Requires a launch-specific fresh MailerLite group dry-run before creating or using `CC · Source · Quiz · Inteligencia para descansar` and `CC · Delivered · Quiz result · Inteligencia para descansar`.
- Requires exact future approval for seed email, seed subscriber, receipt group assignment, Signal Event Ledger append, or audience launch.
- No MailerLite/Shopify/CRM live API calls, subscribers, groups, workflows, forms, sends, ledger append, card writes, scoring, Fact Store writes, or outbound actions were performed.

This packet is the practical rehearsal guard: it lets Mantis prepare a test without accidentally turning a test into public launch, onboarding routing, or audience delivery.

## Mini-launch Brand/email asset packet status

Status: Brand/email asset packet ready for Brand review, no live changes.

Evidence:

- Brand/email asset report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.md`
- Script: `scripts/crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs`
- Test coverage: `__tests__/crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.spec.ts`

Result:

- Drafts Email 1 public copy for `Inteligencia para descansar`: subject options, preheaders, body, CTA and plain-text fallback.
- Uses Brand voice and email style sources before MailerLite rendering.
- Keeps the copy in `draft_for_brand_review_not_public_not_sent`; it is not Brand-approved and not ready for audience use.
- Scans the public draft for internal implementation terms and the overused `a veces` formula; current draft has 0 hits.
- Defines email visual specs from the email canon: Poppins body, Georgia accent, `#F4F7FA` background, white container, brand-aligned CTA, visual signature pending, footer QA pending.
- Keeps all live gates closed: MailerLite asset build, seed send, receipt seed test, audience launch, onboarding handoff, Signal Event Ledger append, CRM card/scoring and Fact Store.

This is the first agency-quality creative packet in the mini-launch lane. It lets Brand review voice and email feel before any platform test, which avoids testing plumbing around a weak piece.

## Goal completion gates

The goal is not complete until all gates below are proven with current evidence:

1. Brújula test-only pilot closed.
   - Email 1 delivery verified.
   - Receipts assigned only to the approved test subscriber.
   - Creative status explicitly marked yellow/green with next correction.

2. Onboarding v1 safely audited.
   - Active workflow structure mapped: done.
   - Historical groups mapped to vNext meanings: done.
   - Completion/audience logic mapped: done.
   - Queue/subscriber exposure assessed if MailerLite exposes it safely: done, partial API metric plus group counts only.
   - No active changes performed: done.

3. Receipt architecture documented and tested.
   - Brand dictionary is canon.
   - CRM planner blocks Brand drift.
   - Planner separates empty group creation from workflow use.
   - Unknown live groups stay inventoried as historical/review.

4. Mini-launch path defined.
   - A future mini-product can move through intake, Brand brief, Shopify/Web, resource, email sequence, MailerLite draft/test, receipts, CRM signals, and QA.
   - Experiment identity lives first in CRM unless MailerLite needs routing/dedupe/exclusion.
   - Mini-launch path packet generated and tested: done.
   - Mini-Launch OS v0 full packet generated and tested: done.
   - Concrete no-live rehearsal packet generated and tested: done.
   - Concrete mini-launch CRM event contract generated and tested: done.
   - Seed-test QA packet generated and tested: done.

5. Brand and CRM handoff clear.
   - Brand knows what to review creatively.
   - CRM knows what to read as signal/receipt.
   - Mantis can operate from these docs without inventing group meanings.

## Next best step

Pause for explicit approval before creating the 12 Onboarding v2 empty groups, or continue with the next non-live production prep from the rehearsal: polished Brand/email asset packet, Shopify/Web preview handoff, or MailerLite group dry-run packet for the `Inteligencia para descansar` candidate groups.

Scope:

- Treat current `Onboarding flow` as production v1 and leave it live.
- If Alejandro approves the exact phrase, run the guarded runner in execute mode and then update Brand dictionary live IDs.
- If not, continue non-live preparation from the rehearsal: Brand/Web/email asset drafting, CRM signal schema, or MailerLite group/workflow dry-run packet.
- Produce Markdown + JSON reports in `~/Documents/Mantis-Reports`.

Non-goals:

- No workflow edits.
- No subscriber mutations.
- No audience sends.
- No activation/deactivation.
- No onboarding pause.
- No group creation.
- No CRM card/scoring mutation.

## Current recommendation

Keep Brújula as the controlled proving ground. The Onboarding v2 architecture, disabled draft-build proposal, 12-group dry-run, guarded runner, Mini-Launch OS v0 packet, first-email mapping, concrete mini-launch rehearsal, CRM event contract, and seed-test QA packet are now documented. The next useful moves are either exact approval for the 12 empty onboarding groups, or a no-live Brand/email asset packet for `Inteligencia para descansar` that can later feed Shopify/Web and a launch-specific MailerLite dry-run.

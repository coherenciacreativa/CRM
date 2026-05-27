# MailerLite Onboarding vNext Migration Blueprint

Date: 2026-05-26
Status: proposed, local-only, no live changes

## Purpose

Design the migration path from the current MailerLite onboarding and historical groups into a cleaner operating architecture for CRM, mini-launches, lead magnets, quizzes, games, guides, and frequent campaign experiments.

This document is operational. The semantic taxonomy lives in:

```text
/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md
```

The concrete group dictionary lives in:

```text
/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md
```

## Single Canon Rule

Brand Hub is the semantic canon for MailerLite group names and meanings. CRM may compile, validate, snapshot, plan, and operate from that canon, but it must not maintain a second independent taxonomy.

Any CRM-side manifest, JSON cache, or planner input is generated/derived state. If it disagrees with Brand Hub, Brand Hub wins and the planner must stop with a drift report instead of proposing actions.

The current CRM manifest:

```text
/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md
```

is a local operating cache/proposal, not the semantic authority.

## Alignment

Alejandro is not attached to the current MailerLite architecture. The production value to preserve is:

- a reliable welcome/onboarding route for new contacts;
- an editorial article sequence sent over time;
- a clear completion marker;
- a usable general campaign audience;
- a base for future mini-launches and parallel flows.

Therefore, the current `Onboarding flow` may be restructured later if needed, but not casually. The goal is migration with continuity, not preservation of messy historical labels for their own sake.

## Current production contract

Observed current state:

- Main workflow: `Onboarding flow`
- MailerLite ID: `154049547088167956`
- Enabled: true
- Complete: true
- Broken: false
- Trigger group: `leads_instagram.csv`
- Approximate function: new user enters, receives a spaced editorial sequence, eventually lands in `Onboarding complete`.

Operational use today:

- `Onboarding complete` is used as the practical general audience for fresh campaigns.
- The flow's value is production onboarding + campaign audience eligibility.
- Other historical flows/groups are largely restructurable unless proven otherwise.

## Target model

MailerLite should maintain:

- dispatch routes;
- workflow triggers;
- minimal dedupe groups;
- delivery/content receipts;
- coarse journey/audience status.

CRM should maintain:

- identity and cross-channel stitching;
- source evidence;
- opens/clicks/replies;
- IG/ManyChat/Shopify/WhatsApp/Telegram signals;
- mini-launch performance;
- market-learning reports;
- person-card context and scoring.

## Group layers

Use the Brand Hub taxonomy:

- `CC · Source · ...`
- `CC · Delivered · ...`
- `CC · Sent · ...`
- `CC · Journey · ...`
- `CC · Audience · ...`
- `CC · Experiment · ...`

Do not overload a single group with multiple meanings.

Group naming notes:

- Use `Sent` for reusable articles/correo editorial. It means the system marked a content item as sent; it does not mean read/opened/clicked/interested.
- Use `Resource` or `Guide` in Source group names instead of `Lead magnet`; CRM can keep `source_type=lead_magnet` internally.
- Use `Experiment` in MailerLite only when needed for routing, dedupe, or exclusion. The experiment identity and market-learning detail should live in CRM.

## Migration options

### Option A - Additive overlay

Add new `CC · ...` groups/actions around the existing onboarding without replacing the active flow structure.

Pros:

- Smallest behavioral change.
- Preserves current trigger and queue.
- Useful if MailerLite lets us add post-email group actions safely.

Cons:

- Active-flow editing can still affect people in queue.
- Historical names remain visible for a while.
- Requires careful validation of how MailerLite handles existing subscribers after edits.

Use when:

- We only need a few content receipts.
- Snapshot shows low queue risk.
- Seed tests pass.

### Option B - Clone onboarding v2 and switch entry

Clone or rebuild the onboarding as a new v2 workflow with clean groups and receipts, then route new subscribers to v2 while allowing old subscribers to finish v1 or be migrated selectively.

Pros:

- Clean architecture.
- Easier to test end to end.
- Lower risk to subscribers currently in v1.

Cons:

- Requires maintaining v1 and v2 during transition.
- Needs exact entry switch and QA.
- More work upfront.

Use when:

- We want meaningful restructuring.
- Mini-launch cadence is about to increase.
- The current flow's labels/actions are too tangled to safely patch.

### Option C - Pause, snapshot, edit, resume/reinsert

Pause the active onboarding, snapshot subscribers/queue positions, edit the flow, test, then resume or reinsert affected subscribers into the right step/state.

Pros:

- Allows deeper cleanup.
- Can consolidate architecture faster.

Cons:

- Highest operational risk.
- Needs strong queue-position evidence.
- Requires a reinsert plan for every affected subscriber.

Use only when:

- Option A or B cannot accomplish the goal.
- MailerLite behavior around paused queues is verified.
- Alejandro explicitly approves the maintenance window.

## Safety policy for active onboarding

Before touching active onboarding:

1. Run MailerLite healthcheck.
2. Export/read current automation structure.
3. Capture active subscriber queue/count if endpoint/UI exposes it.
4. Capture groups, fields, segments, and automations.
5. Identify subscribers in the flow and their likely stage where possible.
6. Prepare seed/test contacts.
7. Prepare rollback/reinsert plan.
8. Ask for explicit approval.

Do not:

- delete historical groups;
- rename historical groups during the first migration;
- remove subscribers from groups in bulk;
- activate new flows to a real audience;
- send test or live emails without explicit approval;
- infer content receipt from a positional group unless evidence is strong.

## Queue and pause/reinsert policy

If the active flow must be paused:

- record exact time of pause;
- record automation ID, workflow status and queue stats;
- create an affected-subscribers packet if MailerLite exposes it;
- avoid editing email content and routing in the same step unless necessary;
- preserve old group memberships during transition;
- after changes, resume or reinsert based on last known state;
- do not resend already-sent/delivered content unless Alejandro approves a deliberate resend.

Every affected subscriber should fall into one of:

- `resume_same_step`
- `move_to_next_safe_step`
- `mark_sent_and_skip`
- `manual_review`
- `do_not_touch`

## First implementation path

Recommended path now: Option B-light, with additive groundwork.

1. Keep current onboarding v1 live.
2. Create local taxonomy manifest in Brand Hub.
3. Create CRM dry-run planner that compiles Brand Hub canon, then compares real MailerLite groups against the compiled canon.
4. With approval, create empty `CC · ...` groups only.
5. Pilot receipts in a disabled workflow first, ideally Brújula.
6. Backfill historical receipts into CRM only.
7. Decide whether to patch v1 additively or build onboarding v2.

## Progress checkpoint - 2026-05-27

The additive groundwork is partially complete:

- Brand Hub is confirmed as the semantic canon.
- CRM planner now treats its manifest as a derived operating cache.
- Five canonical empty groups were created after explicit approval.
- Brújula test lane was rehearsed with a single approved test subscriber only.
- The approved test subscriber is assigned to `CC · Source · Resource · Brújula` and `CC · Delivered · Guide · Brújula`.
- Email 1 test delivery was sent through the MailerLite UI and verified in Gmail.
- `CC · Sent · Article · Sobre el amor` remains unassigned for the test subscriber because Email 2 has not been test-sent yet.

Current status after Brújula pilot:

- Brújula functional test lane: green for Email 1 delivery and source/delivered receipts.
- Brújula creative QA: yellow; email still needs Brand email-style correction before public/audience use.
- Active onboarding v1: untouched. A dedicated read-only audit is now complete.

## Onboarding v1 audit checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.md
```

Read-only audit result:

- Workflow: `Onboarding flow` (`154049547088167956`)
- Enabled: true
- Complete: true
- Broken: false
- Steps: 27
- Email sequence items: 11
- Qualified subscribers count exposed by API: 0
- Subscriber rows read: 0
- Collections read: 75 groups, 13 automations, 24 fields, 8 segments, 12 forms.

Historical groups:

- `leads_instagram.csv` remains the live trigger source and should not be renamed or repurposed in v1.
- `will get first email` is an entry eligibility bucket and may contain people in queue.
- `Se le envió el primer boletín` is a legacy first-send marker, not a clean reusable content receipt.
- `Received second email` is an overloaded in-progress bucket. Do not treat it as proof that `Sobre el amor` was sent.
- `Onboarding complete` is both journey completion and practical general newsletter audience.

Recommendation:

- Preferred path: Option B-light, clone/build onboarding v2 and switch entry later.
- Keep v1 live while v2 is drafted, tested with seed contacts, and explicitly approved.
- Do not patch active v1 casually, because the current flow is valuable, active, and semantically tangled.

Next safe step: produce an Onboarding v2 decision/design packet. It should specify clean trigger/source groups, eligibility rules, article receipts, completion/audience markers, seed contacts, test lane, and approval gates. It must not edit workflows, subscribers, groups, forms, campaigns, or automations.

## Onboarding v2 decision/design checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.md
```

Generator:

```text
CRM/scripts/crm-vnext-mailerlite-onboarding-v2-design-packet.mjs
```

Result:

- Status: `ready_for_human_architecture_review`.
- Recommended option: `option_b_light_clone_onboarding_v2_then_switch_entry`.
- V1 posture: keep `Onboarding flow` live and untouched.
- V2 draft trigger: `CC · Journey · Editorial onboarding · Eligible`, not `leads_instagram.csv`.
- Source assignment expected separately: `CC · Source · IG onboarding`.
- Existing canonical groups can support: `CC · Journey · Editorial onboarding · Eligible`, `CC · Audience · General newsletter · Eligible`, and `CC · Sent · Article · Sobre el amor`.
- 12 proposed/missing groups need fresh planner verification before any empty creation or workflow use.
- First onboarding email still needs Brand mapping: content receipt group should not be invented until Brand decides if it has a `content_id` or is welcome-only.

Safety:

- No MailerLite API calls.
- No workflow edits, activation, pause, or deactivation.
- No group creation, deletion, rename, or assignment.
- No subscriber rows read or printed.
- No sends and no outbound.
- No CRM card/scoring mutation.

Next safe step: produce a disabled v2 draft-build packet. It should be an implementation proposal, not a live change: exact group prerequisites, exact draft workflow shape, action primitive to verify, seed-contact test lane, rollback/no-op boundaries, and approval phrase for any later disabled-draft creation/cloning.

## Disabled v2 draft-build packet checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_packet_2026-05-27.md
```

Result:

- A local-only implementation proposal now exists for Onboarding v2.
- It defines preflight, required empty groups, disabled draft workflow shape, seed test lane, rollout posture, and Brand/CRM handoff.
- It does not authorize any live mutation.
- It explicitly separates four future approvals:
  - create missing empty groups;
  - create/clone disabled draft workflow;
  - test one seed contact;
  - switch production entry.

Next safe step: prepare an executable dry-run packet for one narrow approved mutation. Prefer the missing empty groups first, because a disabled draft cannot use receipt/journey groups that do not exist yet. Do not combine group creation with workflow creation in one approval.

## Onboarding v2 empty-groups dry-run checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-packet.mjs
```

Result:

- Status: `ready_for_exact_human_approval_to_create_empty_groups`.
- Live groups read: 75.
- Live automations read: 13.
- Target groups: 12.
- Existing target groups in fresh scan: 0.
- Blockers: 0.
- Onboarding v1 remains enabled=true, complete=true, broken=false.
- Onboarding v2 draft does not exist yet.

The packet produced the exact approval phrase for creating only these 12 named empty groups. This does not authorize workflow use, subscribers, automations, sends, audience routing, or touching v1.

Next safe step: prepare or adapt a guarded create-empty runner for exactly these 12 groups. It must re-scan immediately before execute, block if any target exists, require the exact approval phrase, and create only empty groups. Do not combine this with workflow creation/cloning.

## Onboarding v2 empty-groups guarded runner checkpoint - 2026-05-27

Dry-run report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.md
```

Runner:

```text
CRM/scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-create.mjs
```

Result:

- Status: `dry_run_ready_for_exact_approval`.
- Mode: dry-run.
- Target count: 12.
- Live groups read: 75.
- Live automations read: 13.
- Created count: 0.
- Blockers: 0.
- Errors: 0.

Guardrails:

- Execute mode requires the exact phrase from the dry-run report.
- Execute mode can only create the named empty groups from the fresh packet.
- It blocks if the packet is not ready or any target is unsafe/existing.
- It does not read subscribers.
- It does not assign subscribers.
- It does not edit workflows or automations.
- It does not send emails.
- It does not touch Onboarding v1.

Next safe step: either pause for Alejandro's explicit approval phrase to create only those 12 empty groups, or continue with non-live work: CRM event contract for v2, or a no-live mini-launch rehearsal using the full Mini-Launch OS v0 packet.

## Onboarding v2 execution packet checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-onboarding-v2-execution-packet.mjs
```

Result:

- Status: `ready_for_human_decision_or_non_live_continuation`.
- Current best path: keep v1 live, create only missing v2 groups if Alejandro approves, then build a disabled v2 draft and seed-test before any production switch.
- Ready for exact human approval: create the 12 named empty Onboarding v2 groups only.
- Safe non-live continuation from this packet: none currently open.
- Mini-launch rehearsal: closed as `rehearsal_ready_no_live_changes` for `mini_2026_06_rehearsal_inteligencia_para_descansar`.
- First email mapping: closed as welcome/orientation only, with no canonical `Sent` receipt.
- Still blocked: disabled v2 draft creation/cloning, seed subscriber test, production entry switch, any v1 edit, any audience send.

This packet is now the operational decision queue. It should be consulted before the next Onboarding v2 move so that group creation, workflow use, seed testing, and production routing remain separate gates.

## First onboarding email mapping checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_mapping_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-onboarding-v2-first-email-map.mjs
```

Result:

- Email 1 is treated as welcome/orientation inside the editorial journey.
- Do not create a new `Sent` group or `content_id` for it in Onboarding v2.
- Do not infer canonical content from the historical `Se le envió el primer boletín` group.
- If observability is needed, CRM can use a journey signal such as `journey_welcome_sent`; that is not a content receipt.
- Brand can later promote this note into a reusable article, but only through a separate Brand/CRM content_id packet.

## Mini-launch path checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_path_packet_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-path-packet.mjs
```

Result:

- Status: `mini_launch_path_defined_no_live_changes`.
- Defines the default route for guides, quizzes, games, audios, practices, checklists, and capture experiments.
- Confirms MailerLite Source/Delivered receipt naming pattern.
- Keeps `Experiment` CRM-first unless MailerLite needs routing/dedupe/exclusion.
- Keeps Journey CRM-first by `launch_id` unless MailerLite needs operational routing.
- Requires Brand brief, Shopify/Web preview or handoff, MailerLite dry-run, CRM signal map, and end-to-end QA.
- All approval gates remain closed by default.

This completes the non-live mini-launch path definition. Any specific mini-launch still needs its own launch_id, Brand brief, group candidates, dry-run packet, and approvals.

## Mini-Launch OS v0 checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-v0-packet.mjs
```

Result:

- Status: `mini_launch_architecture_ready_for_reuse`.
- Converts the mini-launch path into a reusable operating packet for frequent small launches and market-signal experiments.
- Defines 12 phases: idea intake, Brand direction, public offer copy, Shopify/Web preview or handoff, resource production, email sequence design, MailerLite draft/test lane, receipt taxonomy plan, CRM signal plan, functional/creative QA, human approval/launch, and learning loop.
- Defines a four-email default sequence: delivery/orientation, practice/value, story/editorial depth, and invitation/feedback.
- Keeps internal language out of public surfaces and keeps `Experiment`/mini-launch Journey CRM-first unless MailerLite needs routing, dedupe, or exclusion.
- All live gates remain closed: no groups, workflows, seed sends, audience sends, Shopify publish, or CRM card/score mutation without explicit approval.

This completes the reusable non-live mini-launch operating architecture. A concrete mini-launch still needs its own idea, `launch_id`, Brand brief, dry-runs, and approvals before any live operation.

## Mini-launch rehearsal checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-rehearsal-packet.mjs
```

Result:

- Status: `mini_launch_rehearsal_ready_no_live_changes`.
- Concrete idea: `Inteligencia para descansar`, quiz/test format.
- `launch_id`: `mini_2026_06_rehearsal_inteligencia_para_descansar`.
- Produces a local-only Brand/Web/MailerLite/CRM handoff: public promise, quiz model, email sequence draft, Source/Delivered candidates, CRM signal map, data plan, onboarding handoff and approval queue.
- Candidate groups stay candidates: `CC · Source · Quiz · Inteligencia para descansar` and `CC · Delivered · Quiz result · Inteligencia para descansar`.
- Experiment remains CRM-first by `launch_id`.
- Onboarding v1 stays untouched; no automatic insertion into onboarding.
- All live gates remain closed: no MailerLite API calls, no Shopify API calls, no subscribers, no workflows/forms, no sends, no CRM card/score mutation.

This proves the Mini-Launch OS can take one idea through a concrete rehearsal without touching production. The next non-live step is to turn the rehearsal into polished Brand copy, Shopify/Web handoff, MailerLite dry-run plan, or seed-test QA checklist.

## Mini-launch event contract checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-event-contract.mjs
```

Result:

- Status: `mini_launch_event_contract_ready_no_ledger_write`.
- The `Inteligencia para descansar` rehearsal now has a CRM event contract for intake, Brand approval, Shopify preview, email capture, MailerLite receipts, quiz start/completion, email opens/clicks/replies, Instagram snapshot/comment/like, market review, and continue/archive decision.
- Sample events normalize through the Signal Event Ledger without becoming `unknown`.
- Existing projection can already understand email open/click/reply and Instagram snapshot/comment/like.
- Operational launch events stay store-only by default: receipt assignment, delivery, Sent-style content markers, quiz/result events, market learning and decisions do not become warmth/product-fit/card changes without a reviewed policy.
- No append to the Signal Event Ledger was performed.
- No live MailerLite, Shopify, CRM, subscriber, workflow, form, scoring, Fact Store, send, or outbound mutation was performed.

This gives future mini-launches a disciplined data spine: each launch can generate learnable CRM events while the active onboarding remains protected and the CRM avoids treating every operational marker as human interest.

## Mini-launch seed-test QA checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.mjs
```

Result:

- Status: `seed_test_qa_packet_ready_no_live_changes`.
- The `Inteligencia para descansar` mini-launch now has a local QA/seed-test packet.
- It separates asset-only seed preview, receipt seed test, and CRM signal dry-run.
- Local asset drafting is ready, but asset seed send, receipt seed test, audience launch, ledger append, and any live route are closed.
- A seed test needs Brand-approved copy, Email Style QA, exact seed email/scope approval, and MailerLite asset/draft readiness.
- A receipt seed test additionally needs a fresh launch-specific group dry-run and later approval before creating or using `CC · Source · Quiz · Inteligencia para descansar` / `CC · Delivered · Quiz result · Inteligencia para descansar`.
- No MailerLite API calls, Shopify API calls, subscribers, groups, workflows, forms, sends, Signal Event Ledger append, CRM card/scoring mutation, Fact Store write, or outbound action was performed.

This checkpoint protects the mini-launch rehearsal from operational drift: a creative/rendering test, a receipt test, and a public launch are now visibly different gates.

## Mini-launch Brand/email asset checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs
```

Result:

- Status: `brand_email_asset_packet_ready_for_brand_review_no_live_changes`.
- The `Inteligencia para descansar` mini-launch now has a local Email 1 Brand asset packet.
- It drafts subject options, preheaders, body, CTA and plain-text fallback for Brand review.
- It translates `VOICE_FINGERPRINT_V0.md` and `email_style_canon.md` into email-specific QA: editorial voice, modest promise, Poppins body, Georgia accent, brand-aligned CTA, visual signature pending and footer pending.
- Public draft scan is clean for internal terms and the overused `a veces` formula.
- MailerLite asset build, seed send, receipt seed test, audience launch, onboarding handoff, ledger append, card/scoring and Fact Store remain closed.

This moves the first mini-launch from architecture into creative production prep while still preserving the active onboarding and all live approval gates.

## Mini-launch group dry-run checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-group-dry-run.mjs
```

Result:

- Status: `blocked_until_brand_dictionary_candidates`.
- The dry-run reads MailerLite groups only and checks the two receipt candidates for `Inteligencia para descansar`.
- It confirms there is no approval phrase yet because the exact Source/Delivered group names are not in the Brand dictionary.
- It emits proposed candidate rows for Brand to add/review before any empty group creation can be considered.
- Subscriber assignment, workflow attachment, seed send, audience launch, onboarding handoff, Signal Event Ledger append, CRM card/scoring and Fact Store remain closed.

This checkpoint prevents the mini-launch machinery from inventing MailerLite group meanings. Brand must own the naming row before CRM/MailerLite can ask Alejandro for any future empty-group approval.

## Mini-launch Brand candidate review checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-brand-candidate-review-packet.mjs
```

Result:

- The `Inteligencia para descansar` dry-run blocker is now packaged as a Brand decision request.
- Brand is asked to decide whether the two groups should be added as `candidate`, renamed, rejected for now, or promoted later only after another semantic review.
- Candidate-only approval remains non-operational: no MailerLite group creation, no workflow use, no subscriber assignment, no seed send, no audience send, no onboarding change and no CRM/Signal/Fact Store writes.
- The packet includes copy/creative context from the Brand/email asset packet so Brand sees the operational need without confusing it with public approval.

This checkpoint gives the system a clean way to coordinate Brand and CRM without editing the dirty Brand repo from the MailerLite lane. It is a decision artifact, not a live-operation artifact.

## Mini-launch email sequence asset checkpoint - 2026-05-27

Report:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.md
```

Script:

```text
CRM/scripts/crm-vnext-mailerlite-mini-launch-email-sequence-asset-packet.mjs
```

Result:

- The `Inteligencia para descansar` mini-launch now has a full four-email draft sequence for Brand review.
- The sequence roles are delivery/orientation, practice/value, editorial depth, and invitation/feedback.
- Email 1 reuses the existing Brand/email asset packet; Emails 2-4 are draft-only and not approved.
- Public text scan is clean for internal implementation terms and the overused `a veces` formula.
- MailerLite asset names are draft names only: no MailerLite asset build, no seed send, no receipt seed test, no workflow attachment and no audience launch are authorized.
- `Sent` receipts are off by default for small follow-up emails unless Brand later canonizes reusable article/carta content or a dedupe need appears.
- Onboarding handoff remains closed; future routing toward `CC · Journey · Editorial onboarding · Eligible` requires a separate onboarding gate.

This checkpoint adds the relationship arc to the mini-launch machine without disturbing the production onboarding. It keeps the follow-up sequence useful for learning and care, but prevents it from silently becoming onboarding migration or audience automation.

## Planner dry-run requirements

Proposed script:

```text
CRM/scripts/crm-vnext-mailerlite-receipt-taxonomy-plan.mjs
```

It should:

- read Brand Hub taxonomy + group dictionary as semantic canon;
- generate a CRM-side cache/report from Brand Hub instead of treating CRM docs as canon;
- fail closed if the CRM cache/manifest disagrees with Brand Hub names, layers, content IDs, or statuses;
- read MailerLite groups via read-only API;
- read automations via read-only API;
- classify groups as existing, missing, historical, ambiguous, protected, or do-not-touch;
- separate empty group creation safety from workflow-use safety;
- propose create-empty-group actions only as after-approval candidates;
- propose workflow touchpoints only as review notes, not executable work;
- produce a Markdown + JSON report in `~/Documents/Mantis-Reports`;
- never create groups;
- never edit automations;
- never touch subscribers;
- never print tokens or subscriber rows.

Dictionary update contract:

- If a canonical group exists in MailerLite, mark it `live_canonical` with group id in the proposal.
- If a canonical group is missing, keep it `proposed_local` and mark `missing_in_mailerlite`.
- If an unknown historical group appears, add it as `candidate_historical_review`.
- If a new mini-launch group is proposed, add it first as `candidate`, not live.
- Never silently change the meaning of an existing group.

Suggested output categories:

- `safe_to_create_empty_after_approval`
- `safe_to_use_in_disabled_pilot_after_qa`
- `safe_to_use_in_live_workflow_after_migration_gate`
- `needs_human_naming_review`
- `protected_active_workflow_related`
- `backfill_crm_only`
- `candidate_historical_review`
- `do_not_touch`

Important distinction:

```text
safe_to_create_empty_after_approval != safe_to_use_in_live_workflow_after_migration_gate
```

A missing `CC · ...` group can be safe to create empty while still being unsafe to attach to active onboarding, active subscribers, or a live workflow.

## First empty groups to consider later

No live creation yet. Candidate first set:

- `CC · Source · IG onboarding`
- `CC · Journey · Editorial onboarding · Eligible`
- `CC · Journey · Editorial onboarding · In progress`
- `CC · Journey · Editorial onboarding · Complete`
- `CC · Audience · General newsletter · Eligible`
- `CC · Source · Resource · Brújula`
- `CC · Delivered · Guide · Brújula`
- `CC · Sent · Article · Sobre el amor`

## Backfill posture

Backfill should start in CRM, not MailerLite.

Evidence levels:

- strong: API confirms email/workflow/content delivery or a testable event exists;
- medium: group/step state implies likely receipt but not exact content;
- weak: source group or historical label only.

Only strong evidence should later become a MailerLite `CC · Sent ...` group assignment.

Medium/weak evidence can feed CRM as tentative context but should not drive dedupe or outbound action alone.

## Success criteria

This migration is succeeding when:

- new mini-launches can define source/delivery/sent/journey/audience groups before launch;
- CRM can know which experiment/content a person touched;
- `Onboarding complete` no longer carries too many meanings;
- a canonical article like `Sobre el amor` is never accidentally duplicated across flows;
- Mantis can prepare a new launch without asking Alejandro to remember MailerLite wiring;
- live MailerLite changes happen only after local dry-run and explicit approval.

## Next local step

No further live-adjacent step should run without explicit approval. If continuing without approval, route the `Inteligencia para descansar` Brand candidate review packet for semantic review, prepare Shopify/Web preview handoff, or keep working on disabled-draft/onboarding documentation that stays local-only.

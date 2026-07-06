# Instagram Welcome Audio First Controlled Send Result v0

Date: 2026-07-05
Status: completed confirmed controlled source/action result

## Purpose

Record the first confirmed controlled welcome audio send for the Controlled
Welcome Flow Proof, using only redacted source-action closeout data.

## Summary

- `run_id`:
  `crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05`
- `final_state`: `completed_confirmed_single_controlled_send`
- `target_instagram_profile_url`:
  `https://www.instagram.com/alejandro_gomez_bernal/`
- `approved_audio_asset_label`: `saludo_welcome_audio_v1`
- `browser_used`: Safari
- `safari_isolated_window_confirmed`: true
- `safari_neutral_preflight_passed`: true
- `safari_filechooser_preflight_status`: `passed_original_audio_accept`
- `safari_selected_upload_path_class`: `original`
- `chrome_upload_blocker_recorded`: true
- `instagram_auth_context_ok`: true
- `prior_controlled_candidate_validated`: true
- `messaging_route_opened_for_single_candidate_only`: true
- `audio_upload_attempted`: true
- `audio_attached_or_ready`: true
- `welcome_audio_send_attempted`: true
- `welcome_audio_send_confirmation_status`: `confirmed`
- `welcome_audio_sent`: true

## What This Proves

- CRM Core can detect a controlled follower candidate under an approved
  boundary.
- CRM Core can use candidate-level private evidence from a prior controlled
  run.
- Chrome is currently not reliable for this file upload route.
- Safari standard isolated window can complete the approved audio upload route.
- Safari can select the original approved `.m4a` asset.
- CRM Core can send exactly one approved audio to exactly one controlled
  candidate.
- CRM Core can write private artifacts and redacted receipts without printing
  private identities.
- The send route can work without MailerLite, CRM writes, reply monitoring, or
  production automation.
- Chrome upload remains blocked/unproven for this path; Safari is the proven
  route for this controlled result.

## What This Does Not Prove

- It does not prove production-scale automation.
- It does not prove blind detection without handle disambiguation.
- It does not prove Chrome upload.
- It does not prove reply monitoring.
- It does not prove email handoff.
- It does not prove MailerLite onboarding.
- It does not prove CRM enrichment/write.
- It does not authorize standing sends.
- It does not authorize sending to non-controlled followers.
- It does not authorize source/live parallelism.

## Closed Gates Preserved

- `unrelated_dms_opened`: false
- `candidate_queue_generated`: false
- `mailerlite_used`: false
- `gmail_used`: false
- `meta_business_suite_used`: false
- `crm_source_writes`: false
- `card_writes`: false
- `fact_store_writes`: false
- `ledger_writes`: false
- `scoring_writes`: false
- `launch_os_touched`: false
- `/Users/alejandrogomez/CRM_used`: false
- `repo_files_edited_during_live_run`: false
- `commit_created_during_live_run`: false
- `used_mantis_memory`: false
- `private_artifacts_integrated`: false

## Storage And Receipts

Private artifact root label:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/controlled-welcome-flow/first-controlled-handle-send-v5-safari-upload-2026-07-05/
```

Redacted receipt path labels:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/instagram/controlled-welcome-flow/crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05.json
/Users/alejandrogomez/Documents/Mantis-Reports/instagram/controlled-welcome-flow/crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05.md
```

No private artifact contents are included in this central result record.

## Operational Lesson

- Use Safari for the current Instagram audio upload route.
- Require Safari isolated standard window.
- Require neutral Safari filechooser preflight before Instagram.
- Prefer original approved audio path when Safari preflight passes.
- Do not use Chrome for this upload route until Chrome filechooser selection is
  repaired.
- Do not use human-assisted attachment as the primary automation strategy.
- Do not retry upload with coordinate/hidden-input/DOM/drag-drop fallbacks.

## Recommended Next Decision

Recommended next decision:

```text
crm_core_controlled_welcome_flow_after_first_confirmed_send_next_step_selection_v0
```

Options:

1. First Controlled Flow Repeatability Run.
   - One fresh controlled follow.
   - Controlled-handle disambiguation.
   - Candidate-level private anchors.
   - Safari upload/send route.
   - Goal: prove one-run repeatability from post-READY follow to confirmed
     send.
2. Controlled Reply Monitoring Readiness / Test.
   - No MailerLite.
   - No CRM writes.
   - Only after separate approval.
3. Assistant Reply Policy Design.
   - Docs-only, no-run.
   - Defines how Mantis/Mati may respond later without pretending to be
     Alejandro.
4. Safari Upload Route Hardening Protocol.
   - Docs-only/runbook.
   - Codify Safari preflight and route recovery before any next send.
5. Pause.

Recommended default:

```text
First Controlled Flow Repeatability Run
```

unless Alejandro wants to move directly to reply monitoring.

## Completion Boundary

Complete when this central result doc records the confirmed controlled send
without exposing private identities, private artifacts, raw handles, DM
content, or source-private contents.

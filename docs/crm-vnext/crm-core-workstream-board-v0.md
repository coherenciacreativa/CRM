# CRM Core Workstream Board v0

Date: 2026-06-29
Status: central integration board

Only the Integration Worker edits this board unless a task explicitly allows a
lane update.

| workstream_id | status | consultant_chat | codex_branch | lane_status_file | current_objective | allowed_files | blocked_files | latest_commit | latest_receipt | blocked_by | next_decision_needed | integration_status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `integration` | `active` | Chief Architect / Integration Chat | `codex/crm-core-reentry` | `docs/crm-vnext/workstreams/integration.md` | Maintain architecture, board, queue, central next actions. | central files by explicit integration task | private artifacts; source state; Launch OS docs | pending | none | none | approve first lane bootstrap | central |
| `mailerlite-onboarding` | `ready_to_start` | MailerLite onboarding consultant | `codex/crm-core-mailerlite-onboarding` | `docs/crm-vnext/workstreams/mailerlite-onboarding.md` | No-secret setup inventory, no-write payload, future mutation packet. Current seed: `crm_core_mailerlite_onboarding_setup_inventory_awaiting_approval_v0`. | `docs/crm-vnext/mailerlite-*.md`; lane status file | central files unless approved; private artifacts; source state | pending | none | parallel lane bootstrap approval | choose first lane setup | queued |
| `instagram-api-readiness` | `ready_to_start` | Meta/Instagram API consultant | `codex/crm-core-instagram-api` | `docs/crm-vnext/workstreams/instagram-api-readiness.md` | Meta setup facts, app readiness, API/webhook path, no secrets. Setup inventory completed; API path partial/unknown. | `docs/crm-vnext/instagram-meta-*.md`; lane status file | central files unless approved; private artifacts; source state | pending | none | parallel lane bootstrap approval | choose first lane setup | queued |
| `welcome-audio-send-boundary` | `ready_to_design` | Welcome audio consultant | `codex/crm-core-welcome-audio` | `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md` | Audio asset registry, already-welcomed history, send approval packet, duplicate prevention. No send authorized. | `docs/crm-vnext/welcome-audio-*.md`; `docs/crm-vnext/instagram-welcome-audio-*.md`; lane status file | central files unless approved; private artifacts; source state | pending | none | parallel lane bootstrap approval | design only | queued |
| `identity-bridge-crm-write` | `parked` | Identity bridge consultant | `codex/crm-core-identity-bridge` | `docs/crm-vnext/workstreams/identity-bridge-crm-write.md` | Email handoff to CRM write packet. | `docs/crm-vnext/identity-bridge-*.md`; `docs/crm-vnext/crm-write-packet-*.md`; lane status file | central files unless approved; CRM writes; private artifacts | pending | none | MailerLite setup and private evidence model | wait | parked |
| `scoring-heat-next-best-action` | `parked` | Scoring / heat consultant | `codex/crm-core-scoring-heat` | `docs/crm-vnext/workstreams/scoring-heat-next-best-action.md` | Heat/scoring policy after evidence lanes stabilize. | `docs/crm-vnext/scoring-*.md`; `docs/crm-vnext/heat-*.md`; `docs/crm-vnext/next-best-action-*.md`; lane status file | central files unless approved; scoring writes; CRM writes | pending | none | evidence and write policy | wait | parked |
| `follower-source-ui-repair` | `parked_v0` | Follower-source UI consultant | `codex/crm-core-follower-source-ui` | `docs/crm-vnext/workstreams/follower-source-ui-repair.md` | Repair Chrome follower-source UI route only if CEO approves later. | lane-specific follower-source design docs after approval | central files unless approved; UI execution; private artifacts | pending | none | unstable route; parked for v0 | CEO approval required for repair path | parked |

## Board Rules

- Board updates are central integration work.
- Lanes may propose board updates in their closeout, but do not edit the board
  directly unless their prompt explicitly allows it.
- No board entry grants source execution, CRM writes, candidate generation,
  welcome audio, scoring, or source mutation.

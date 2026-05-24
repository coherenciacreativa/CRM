# CRM vNext Operator Capabilities

Date: 2026-05-11
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/operator-capabilities`

## Purpose

Give Mantis/OpenClaw one stable map of the safe CRM vNext surfaces that already exist:

- internal APIs,
- browser routes,
- local commands,
- guardrails,
- escalation triggers,
- recommended operating flow.

This is a navigation contract. It does not read person-card artifacts, does not mutate CRM records, and does not send messages.

## Recommended Flow

1. Read `GET /api/crm-vnext/operator-capabilities`.
2. Read `GET /api/crm-vnext/readiness`.
3. Read `GET /api/crm-vnext/control-room`, `/crm-vnext/control-room`, or `npm run crm:vnext:control-room` before deciding what to do next.
4. Read `GET /api/crm-vnext/source-ledger`.
5. When Control Room/source coverage shows email+Instagram identity as the bottleneck, run `npm run crm:vnext:omnichannel-coverage-push`.
6. Before and after meaningful approved card-store writes, create a verified encrypted snapshot with `npm run crm:vnext:snapshot -- --verify`.
7. For stitching/source-recovery batches, run the Mantis Natural Batch Protocol source-health preflight before accepting a final evidence hunt.
8. Preview new human/source reports with `POST /api/crm-vnext/fact-intake`.
9. Store approved facts with `POST /api/crm-vnext/fact-store`.
10. Run a safe full preview with `POST /api/crm-vnext/activation-run`.
11. Research unmatched or name-only clues with `POST /api/crm-vnext/identity-stitching-research`.
12. Plan Gmail evidence and convert supplied read-only results with `POST /api/crm-vnext/gmail-evidence-helper`.
13. Plan Contacts evidence and convert read-only results with `POST /api/crm-vnext/contacts-evidence-helper`.
14. Plan MailerLite evidence and convert read-only subscriber results with `POST /api/crm-vnext/mailerlite-evidence-helper`.
15. Plan Google Drive/Docs/Sheets evidence and convert supplied read-only rows with `POST /api/crm-vnext/google-drive-evidence-helper`.
16. Plan lead-capture evidence from ManyChat/CRM webhook/Vercel/WhatsApp traces with `POST /api/crm-vnext/lead-capture-evidence-helper`.
17. Convert rich supplied evidence into context/fact promotion proposals with `npm run crm:vnext:context-fact-proposals -- --evidence-file <json>`.
18. Apply explicitly approved context/fact proposals with `npm run crm:vnext:context-fact-apply -- --proposal-file <json> --proposal-id <id> --approved-by <name> --write`.
19. Search safe local and connected evidence with `POST /api/crm-vnext/deep-local-stitching`.
20. Build a multi-service card proposal with `POST /api/crm-vnext/multi-service-card-proposal`.
21. Evaluate create/enrich/merge/defer policy with `POST /api/crm-vnext/card-write-merge-policy`.
22. Preview exact hypothetical card operations with `POST /api/crm-vnext/card-apply-preview`, including already-approved evidence decisions when a ledger is supplied.
23. Prepare focused evidence questions with `POST /api/crm-vnext/evidence-review-packet`, skipping questions already resolved in the decision ledger.
24. Queue unresolved evidence questions with `POST /api/crm-vnext/evidence-approval-workbench`.
25. Store Alejandro-approved evidence answers with `POST /api/crm-vnext/evidence-review-decisions`.
26. Apply approved evidence decisions and rerun before/after approval packets with `POST /api/crm-vnext/evidence-approval-application`.
27. Run one standard batch loop with `POST /api/crm-vnext/batch-operating-loop`.
28. Review multiple stitching candidates with `POST /api/crm-vnext/stitch-batch-review`.
29. Prepare explicit write approval items with `POST /api/crm-vnext/card-write-approval-packet`.
30. Apply explicitly approved items with `POST /api/crm-vnext/card-write-apply`, backup, and provenance.
31. Normalize activity-shaped observations into the canonical local Signal Event Ledger with `npm run crm:vnext:signal-event-ledger -- --events-file <json>`.
32. Project canonical signal events into previewable scoring inputs with `npm run crm:vnext:signal-event-projection -- --from-ledger`.
33. Convert supplied Instagram observations into canonical signal events with `npm run crm:vnext:instagram-signal-events -- --observations-file <json>`.
34. Before daily engagement work, scan saved reports for unprocessed signal packets with `npm run crm:vnext:signal-packet-inbox`.
35. For the standard source-to-score loop, run `npm run crm:vnext:signal-event-pipeline -- --mailerlite-snapshot-file <json> --gmail-reply-discovery-file <json>` or pass Instagram events through `--events-file <json>`.
36. Preview supplied engagement signals with `POST /api/crm-vnext/engagement-signal-preview`.
37. Store useful read-only engagement previews with `npm run crm:vnext:engagement-snapshot-ledger -- --preview-file <json> --write --approved-by <name>`.
38. Read engagement movement history with `GET /api/crm-vnext/engagement-snapshots`.
39. Turn stored movement into a Mantis-ready queue with `GET /api/crm-vnext/engagement-movement-queue`.
40. Prepare a no-send engagement decision brief with `GET /api/crm-vnext/engagement-decision-brief`.
41. Turn that engagement brief into answer-ready questions with `GET /api/crm-vnext/engagement-resolution-loop`; already-enriched contacts are suppressed into internal signal review.
42. Resolve explicitly approved staged merges with `POST /api/crm-vnext/card-merge-review-resolver`.
43. Review stored facts with `GET /api/crm-vnext/identity-review`.
44. Preview exact card changes with `GET /api/crm-vnext/card-rebuild-diff`.
45. Read `GET /api/crm-vnext/community-daily-brief` for community queues plus stored engagement action summaries.
46. Convert that daily picture into an ordered Mantis task list with `GET /api/crm-vnext/daily-operator-handoff`.
47. If needed, read `GET /api/crm-vnext/community-queues`.
48. Inspect a bounded queue with `GET /api/crm-vnext/community-queue-brief?queueId=<queueId>&limit=<n>`.
49. Prepare a no-send decision brief with `GET /api/crm-vnext/community-decision-brief?queueId=<queueId>&limit=<n>`.
50. Inspect one exact person with `GET /api/crm-vnext/person-card?personId=<personId>`.
51. Ask for approval if the next move would touch an external channel.

## Read Source Rule

For card proposal, stitching, policy, preview, and approval surfaces, prefer the local vNext person-card store when it exists:

```text
.crm-vnext/person-card-store/person-cards-vnext.json
```

Legacy Person Cards V1 remains available as fallback or an explicit override, but Mantis should not use a legacy-only view for write/merge decisions unless debugging. Otherwise contacts that already exist in vNext can look like new cards and create duplicate-work pressure.

## Response Shape

```json
{
  "ok": true,
  "capabilities": {
    "schemaVersion": "crm-vnext-operator-capabilities-2026-05-11",
    "mode": "read_only_operator_capabilities",
    "operatingModel": {
      "dayToDayOperator": "Mantis via OpenClaw",
      "builderRole": "repository contracts, code, docs, and local verification",
      "humanDecisionOwner": "Alejandro"
    },
    "apiEndpoints": [],
    "browserRoutes": [],
    "localCommands": [],
    "guardrails": [],
    "escalationTriggers": [],
    "safety": {
      "outboundProhibited": true,
      "recordMutationRequiresExplicitApproval": true
    }
  }
}
```

The response excludes local filesystem paths and secret values.

Local commands currently include activation run, identity stitching research, Gmail evidence helper, gog healthcheck, MailerLite healthcheck, encrypted snapshot backup, Contacts evidence helper, MailerLite evidence helper, Google Drive evidence helper, lead-capture evidence helper, Instagram DM UI evidence helper, Instagram signal events helper, signal packet inbox, Omnichannel Coverage Push, Control Room, IG-origin batch prompt, Mantis evidence import, context/fact proposals, context/fact apply, deep local stitching with optional expanded local evidence and connected evidence packets, multi-service card proposal, card write/merge policy, card apply preview, evidence review packet, evidence review decisions ledger, evidence approval workbench, evidence approval application, stitch batch review, card write approval packet, batch operating loop, MailerLite engagement signals, Gmail reply engagement signals, signal event ledger, signal event projection, engagement signal preview, engagement snapshot ledger, engagement movement queue, engagement decision brief, engagement resolution loop with anti-redundancy guard, human enrichment questions, human enrichment response evidence, card write apply, card merge review resolver, queue monitor, daily brief export, daily operator handoff, and decision brief export. `GET /api/crm-vnext/readiness` is the quick preflight before those commands.

## Safety

- `GET` only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require the configured internal read token.
- No person-card artifact read.
- No local source path exposure.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite mutation. The MailerLite evidence helper API does not call live MailerLite; the optional CLI route can use an existing read-only connector, cursor-paginate subscribers, filter locally, and report auth blockers without exposing credentials.
- gog Healthcheck is read-only and verifies token exchange plus People/Gmail/Contacts/Drive/Docs/Sheets access without printing personal content. Use `npm run crm:vnext:gog-healthcheck -- --fail-on-blocked` before source-recovery runs that depend on Google Workspace.
- MailerLite Healthcheck is read-only and verifies credential presence, groups read, subscribers read, and cursor pagination without printing subscriber rows or credentials. Use `npm run crm:vnext:mailerlite-healthcheck -- --fail-on-blocked` before source-recovery runs that depend on MailerLite.
- CRM vNext Snapshot creates an encrypted local snapshot of `.crm-vnext` and can copy only ciphertext to iCloud Drive. Use `npm run crm:vnext:snapshot -- --verify` before/after meaningful approved card-store writes and for scheduled durability checks. First trusted-machine setup may use `--init-keychain-secret`. It must never print the encryption secret or copy a plain archive to cloud storage.
- No Google Drive mutation. The Google Drive evidence helper API only converts supplied read-only rows and keeps family/companion email ambiguity under review.
- No person-card mutation from evidence approvals. The evidence approval application may write only the local evidence decision ledger with explicit commit and approver, then rerun preview packets.
- Batch Operating Loop is read-only and is now the preferred natural-language operator surface for "probemos un batch nuevo": it returns evidence questions, blocked identity prompts, ready approval items, and dry-run write plans without mutating anything.
- Batch Operating Loop now marks Instagram/onboarding contacts with missing email or phone as `source_recovery_required`: Mantis should exhaust official-flow sources before asking Alejandro. The recovery lanes are Instagram Messages UI, ManyChat read-only exports, Vercel/proxy/webhook traces, MailerLite cursor scan, lead-capture ledgers, local reports, and Gmail/Drive/Contacts when relevant.
- Mantis Natural Batch Protocol (`docs/crm-vnext/mantis-natural-batch-protocol.md`) is the canonical way for Mantis to turn natural CRM requests into contact-keyed evidence hunts before import and batch review. It now includes the Batch Portfolio Rule: natural "otro batch" requests should mix mostly net-new discovery with a smaller portion of known open-loop cleanup, unless Alejandro explicitly asks to finish a known group.
- For serious stitching/source-recovery batches, the Mantis Natural Batch Protocol requires a source-health preflight for needed high-value lanes. If MailerLite, gog/Google Workspace, Instagram UI, or another required source is blocked, Mantis should pause into `awaiting_human_unblock` and ask Alejandro for the exact unblock before closing a final degraded report.
- If a contact remains `ask_alejandro` because a missing field could plausibly be closed by Instagram Messages UI, Mantis should run a bounded read-only Instagram UI complement before asking Alejandro, or record the exact reason that lane was skipped.
- If official-flow source recovery is active and a source is blocked by login, Relay, permissions, stale OAuth, checkpoint, or another human action, Mantis should return `awaiting_human_unblock` with pending search anchors and exact unblock instructions, then retry after confirmation instead of closing the task as complete.
- If Instagram UI is blocked by login, saved-profile selection, Relay/browser permission, checkpoint, CAPTCHA, or similar human-action screens, Mantis should send an immediate unblock request and retry after Alejandro confirms. A blocker report alone is not a completed complement batch.
- MailerLite Engagement Signals and Gmail Reply Engagement Signals are read-only local adapters that convert supplied metadata snapshots into previewable scoring signals. They do not call live APIs, read credentials, export full email bodies, mutate Gmail/MailerLite, or authorize outbound follow-up.
- Signal Event Ledger is the canonical append-only local shelf for activity-shaped source observations. It can store supplied MailerLite/Gmail/Instagram/ClassBot/manual events or aggregate engagement snapshots before scoring projection. It does not mutate person cards, write Fact Store, change scores, call live APIs, touch credentials, or authorize outbound follow-up.
- Signal Event Projection is read-only and converts canonical events into `engagement-signal-preview` inputs. It is the preferred extensibility point for future sources such as Shopify, Bhakti WhatsApp, payment providers, and ClassBot. Restricted events are skipped by default unless a reviewed operator run explicitly includes them.
- Instagram Signal Events is the current bridge for the most active channel before full API ingestion exists. Mantis can supply read-only observations from Instagram UI, future API exports, ManyChat exports, or lead-capture traces; the helper only normalizes them into events for the shared ledger.
- Signal Packet Inbox is the first daily delta check for engagement work. It scans saved local reports, finds unprocessed signal packets, suppresses packets already consumed by the pipeline, and reports active source blockers. If no candidate packet exists, Mantis should stay in observe mode instead of running decision/resolution loops.
- Omnichannel Coverage Push is the first focused identity-coverage planner after Control Room when email+Instagram coverage is the bottleneck. It reads the vNext card store, prioritizes IG-known/email-missing and email-known/IG-missing cards, and generates a bounded Mantis prompt for read-only source recovery. It does not open live sources, call APIs, mutate cards, write Fact Store, touch credentials, or send outbound.
- Control Room is the first daily operating surface. It composes readiness, source ledger, signal packet inbox, and daily operator handoff into one state: blocked, process signal delta, source unblock required, human decision required, operator review, or observe.
- Scoring Policy v0 (`docs/crm-vnext/scoring-policy-v0.md`) is the interpretation layer for score movement. Mantis should separate commercial warmth, community depth, relationship engagement, and data confidence before recommending a next action.
- Next Best Action Policy v0 (`docs/crm-vnext/next-best-action-policy-v0.md`) translates score movement into operator-safe actions such as stitching, reply review, care/retention, social context review, warm-contact review, or observation. It keeps ClassBot/yoga care separate from sales heat.
- Engagement Signal Preview is read-only and consumes supplied MailerLite/Gmail/Instagram/manual engagement snapshots to show scoring deltas and internal queues. It does not call live APIs, mutate cards, change MailerLite/Gmail, or authorize outbound follow-up.
- Engagement Snapshot Ledger can store approved read-only engagement previews as local JSONL movement history for the dashboard. It does not mutate cards, write Fact Store, call live APIs, touch credentials, or authorize outbound follow-up.
- Engagement Movement Queue reads stored movement history as an operator queue for Mantis. It can recommend internal actions such as reviewing reply context, reviewing a warm contact, continuing observation, or routing unmatched signals to stitching. The Daily Brief now summarizes these stored actions, and Daily Operator Handoff turns the daily picture into an ordered no-send task list. Neither surface mutates cards, writes Fact Store, calls live APIs, touches credentials, or authorizes outbound follow-up.
- Human Enrichment Questions is read-only and creates person-by-person prompts after a batch so Alejandro can add remembered context. Use `--format compact` by default when Alejandro is reviewing many people: it keeps the evidence JSON intact but renders a short name/handle/data/screenshot/freestyle sheet. Answers still need Fact Intake or a later approved local write before they become CRM state.
- Human Enrichment Response Evidence is read-only and converts Alejandro's answered compact-review sheet into structured evidence sources plus operator tasks. It should run before `context-fact-proposals`; it does not write cards, Fact Store, or external systems.
- IG-Origin Batch Prompt is read-only and prepares copy-ready Mantis prompts for Instagram/onboarding contacts, including DM UI bridge and compact thread-context instructions. It does not inspect Instagram or call live APIs by itself.
- Context Fact Proposals is read-only and turns rich `evidenceSources` into reviewed card-memory candidates. It separates `promote_to_card_evidence` from identity gaps, weak collisions, duplicates, and sensitive review-only context. It does not mutate cards or Fact Store.
- Context Fact Apply is dry-run by default and may append explicitly approved `context-fact-proposals` items to existing local card evidence after `approvedBy`, explicit proposal selection or `--apply-all-ready`, backup, and ledger. It does not create cards, mutate identity/scoring/product/channel fields, write Fact Store, call live APIs, touch credentials, or send outbound.
- Conversational Fact-to-Scoring is an explicit backlog lane: approved Fact Store entries may later feed score previews through source-weighted, recency-aware rules, but Fact Store append itself must not silently change heat scores.
- Card Write Apply may commit approved create/enrich items and may stage merge-review items. It is dry-run by default and may commit only local vNext card-store/ledger files after `approvedBy`, explicit item selection/all-ready, and backup. It does not merge automatically or touch outbound/live sources.
- Card Merge Review Resolver may resolve staged merge-review items only after explicit review selection, `approvedBy`, backup, and restricted-service acknowledgement when applicable. It can consume supplied read-only `evidenceSources` before resolving so MailerLite/Gmail/Drive findings fill missing contact fields without live API calls. It writes only the local vNext card store and merge-review ledger.
- No outbound messages.
- No record mutation.

## Hard Stops

Mantis must stop and ask for human approval before:

- touching ManyChat LIVE,
- changing Instagram credentials, tokens, permissions, or API setup,
- changing MailerLite credentials,
- sending Telegram, Instagram, WhatsApp, email, or public messages,
- mutating CRM records without explicit approved local write scope,
- using a `nextAction` as permission to contact someone.

## Mantis Operating Rule

Use this endpoint as the first map before operating CRM vNext. It is the equivalent of checking the instrument panel before flying: it does not move the plane, but it tells the operator which levers exist and which ones are still locked.

# Community Source Health Reality Audit v0

Date: 2026-06-02
Status: read-only CRM Core source-health audit

## Purpose

This audit turns the Community Signal Readiness Board v0 into a stricter
source-health reality map. It answers what CRM Core can safely use now from
local code, tests, supplied snapshots, exports, UI read-only observations, or
manual evidence, and what still needs source-health proof before any future
ledger, preview, card, or scoring step.

This document is not a scoring feature and not a write feature. It does not
authorize live API calls, connector calls, card writes, Fact Store writes, Signal
Event Ledger writes, Engagement Snapshot Ledger writes, source-result ledger
writes, score mutation, MailerLite mutation, Instagram action, Gmail action,
Shopify action, workflow changes, subscriber/group/audience changes, outbound
sends, DMs, replies, or follow-up.

## Discovery Boundary

Discovery used CRM Core docs/scripts/tests/filenames and avoided live systems.
No source-health command that would call MailerLite, Gmail, Instagram, Shopify,
Google, or any connector was run.

Primary CRM Core contracts inspected:

- `docs/crm-vnext/community-signal-readiness-board-v0.md`
- `docs/crm-vnext/instagram-signal-events.md`
- `docs/crm-vnext/instagram-dm-ui-evidence.md`
- `docs/crm-vnext/instagram-signal-os-v0.md`
- `docs/crm-vnext/mailerlite-engagement-signals.md`
- `docs/crm-vnext/gmail-reply-engagement-signals.md`
- `docs/crm-vnext/engagement-signal-preview.md`
- `docs/crm-vnext/signal-event-pipeline.md`
- `docs/crm-vnext/source-ledger.md`
- `docs/crm-vnext/source-result-ledger.md`
- `docs/crm-vnext/hito-66-mailerlite-auth-healthcheck-v0.md`
- `docs/crm-vnext/gmail-openclaw-auth-stability-backlog.md`

Relevant local validation surfaces:

- `__tests__/crm-vnext-instagram-signal-events.spec.ts`
- `__tests__/crm-vnext-mailerlite-engagement-signals.spec.ts`
- `__tests__/crm-vnext-gmail-reply-engagement-signals.spec.ts`
- `__tests__/crm-vnext-signal-event-pipeline.spec.ts`
- `__tests__/crm-vnext-engagement-signal-preview.spec.ts`

## Classification Values

| Classification | Meaning |
| --- | --- |
| `available_now` | Local CRM Core command, adapter, contract, or test exists and can process supplied data without live API calls or state mutation. |
| `available_with_manual_evidence` | Usable only when Alejandro/Mantis supplies compact read-only evidence, usually from UI observation or human review. |
| `available_with_export_or_snapshot` | Usable only when a redacted/local/exported snapshot is supplied; CRM Core should not fetch it live in this action. |
| `available_only_after_source_health_check` | The repo has a path, but current availability was not verified in this audit and would need a separate no-secret source-health check. |
| `blocked` | Current use would require forbidden live access, mutation, raw private content, credentials, or unresolved human unblock. |
| `unknown` | The repo does not currently prove this source is available enough to use. |

## Top-Line Reality

| Channel | Reality now | Safe current use | Main blocker |
| --- | --- | --- | --- |
| Instagram | Local normalization and UI/manual evidence contracts exist. Live API/webhook availability was not verified in this audit. | Process supplied compact observations into local dry-run events/previews. | Source-health proof and identity anchors. |
| Email / MailerLite | Local engagement-snapshot adapter exists. Prior healthcheck docs exist, but live access was not checked here. | Process supplied snapshots/exports into preview-only engagement signals. | Snapshot freshness, subscriber identity, and avoiding over-reading single opens. |
| Gmail / newsletter replies | Local metadata-only reply adapter exists. Prior auth-stability docs exist, but live Gmail was not checked here. | Process supplied metadata-only discovery rows into preview-only reply signals. | Human-reply confidence, false positives, no body export, and review-only interpretation. |
| Identity bridge | CRM Core has evidence, source-result, and identity stitching contracts. | Route ambiguous email/handle matches to review before any write or score effect. | `handle-only`, `email-only`, shared-email, and name-only ambiguity. |

## 1. Instagram Sources Actually Available Now

| Source or signal | Classification | Access mode now | What exists in CRM Core | Source-health reality | Identity blocker |
| --- | --- | --- | --- | --- | --- |
| Supplied Instagram observations normalized by `crm:vnext:instagram-signal-events` | `available_now` | local snapshot, manual evidence, export | Implemented local adapter and tests for DM, story reply, reaction, comment, mention, like, story view, follow, and aggregate snapshot event kinds. | Adapter is available; real source availability depends on supplied observations. | Requires `instagramHandle`, email, phone, or `personId`; skipped otherwise. |
| Instagram DM UI evidence packet | `available_with_manual_evidence` | UI read-only, manual evidence | Local command contract converts compact read-only thread observations into `instagram_dm_ui_export` evidence sources. | UI route must be performed by a human/operator in read-only mode; this audit did not open Instagram. | Strong only with exact anchor and bridge evidence; name-only results remain weak. |
| Story replies and message reactions | `available_with_manual_evidence` | UI read-only, export, manual evidence, future webhook | Event kinds normalize locally as `instagram_dm` with surface tags. | Webhook/API availability was not verified; UI/manual packet is the safe v0 route. | Handle-only or ambiguous actor needs review. |
| Comments, mentions, and live comments | `available_with_manual_evidence` | manual evidence, export, future API/webhook | Event kinds normalize locally as `instagram_comment` with surface tags. | API/webhook path remains source-health dependent; no live check in this audit. | Public name/handle is not email/person proof. |
| Likes, story views, follows | `available_with_manual_evidence` | manual evidence, export, UI read-only | Event kinds normalize locally and can participate in preview if supplied. | Person-level availability is fragile and not proved here; single passive signals are weak. | Handle-only identity and repeated-pattern requirement. |
| Media/account insights, profile visits, saves, shares | `available_with_export_or_snapshot` | export, local snapshot, future API | Aggregate metrics can be preserved as Instagram engagement snapshots. | Current audit did not verify aggregate API or UI analytics access. | Aggregate metrics are usually not person-level and should not create outreach tasks. |
| Live Instagram API or webhook ingestion | `available_only_after_source_health_check` | API, webhook | Architecture docs describe possible future API/webhook capture. | No current API credential, webhook subscription, permission, or health result was verified here. | Even if healthy, events still need identity anchors and review gates. |

Instagram conclusion: CRM Core can process supplied Instagram evidence now, but
it cannot honestly claim live Instagram source availability from this audit.

## 2. Email / MailerLite Sources Actually Available Now

| Source or signal | Classification | Access mode now | What exists in CRM Core | Source-health reality | Identity blocker |
| --- | --- | --- | --- | --- | --- |
| Supplied MailerLite engagement snapshot | `available_now` | local snapshot, export | Implemented local adapter accepts flexible subscriber/campaign rows and emits `mailerlite_subscriber_activity` or `mailerlite_campaign_activity`. | Adapter is available; current snapshot freshness was not verified here. | Rows without email or card match become skipped/unmatched. |
| Single open | `available_with_export_or_snapshot` | local snapshot, export | Adapter accepts open counts and last-open fields. | Weak signal; bot/noise and stale snapshot risks remain. | Email-only identity may not be a confirmed person. |
| Repeated opens over 30 or 90 days | `available_with_export_or_snapshot` | local snapshot, export | Adapter preserves 30-day and 90-day engagement layers. | Useful as pattern evidence only when fresh supplied rows prove repetition. | Must map to one person/card before person-level preview. |
| Clicks and repeated clicks | `available_with_export_or_snapshot` | local snapshot, export | Adapter accepts clicks, campaign activity, and recent campaign arrays. | Stronger than opens, but still not send permission. | Link/campaign context must be safe and not leak private URLs. |
| Subscriber status, bounce, suppression, complaint | `available_with_export_or_snapshot` | local snapshot, export | Adapter preserves status and suppression signals. | Should outrank warmth in any future review. | Email identity must be confirmed before person-level conclusions. |
| Live MailerLite API read source | `available_only_after_source_health_check` | API | A MailerLite healthcheck command is documented as implemented. | This audit did not run it because it would call a live API. Prior docs are useful history, not current proof. | API rows still need identity matching and review gates. |

Email/MailerLite conclusion: local processing of supplied snapshots is available
now. Live MailerLite availability is not current in this audit and must remain a
separate source-health check.

## 3. Gmail / Newsletter Reply Sources Actually Available Now

| Source or signal | Classification | Access mode now | What exists in CRM Core | Source-health reality | Identity blocker |
| --- | --- | --- | --- | --- | --- |
| Supplied metadata-only Gmail reply discovery | `available_now` | local snapshot, export, manual evidence | Implemented local adapter accepts metadata-only discovery rows and emits `gmail_reply_activity` signals. | Adapter is available; live Gmail was not queried here. | Sender email may be confirmed, likely, email-only, or ambiguous. |
| Strong/medium human reply candidates | `available_with_export_or_snapshot` | export, local snapshot, manual evidence | Adapter filters for human reply confidence and preserves traceability rows. | Interpretation remains review-only; no full body export. | Shared emails and ambiguous senders need human review. |
| Weak replies, bounces, autoresponders, no-reply, list/bulk headers | `blocked` | local snapshot, export | Adapter skips weak/false-positive rows. | Should not enter heat preview except as skipped evidence. | Not suitable for person warmth. |
| Live Gmail/OpenClaw read path | `available_only_after_source_health_check` | API/connector outside this audit | Auth-stability docs and healthcheck policy exist. | This audit did not run `gog` or any connector. Prior green checks are not current proof. | Even healthy Gmail access must avoid body export and interpretation without review. |

Gmail conclusion: CRM Core can process supplied metadata-only reply discoveries
now. It cannot claim live Gmail source health from this audit.

## 4. Local Snapshots, Exports, UI Read-Only, Manual Evidence, And Tests

| Evidence route | Classification | Safe use now | Not allowed now |
| --- | --- | --- | --- |
| Existing adapter tests | `available_now` | Prove local contracts for Instagram events, MailerLite signals, Gmail reply signals, pipeline, and engagement preview. | Do not infer live source availability from passing tests. |
| Supplied JSON snapshots or exports | `available_with_export_or_snapshot` | Feed local adapters and dry-run preview if identity anchors are present. | Do not fetch, refresh, or mutate source systems in this action. |
| Instagram UI read-only observations | `available_with_manual_evidence` | Compact evidence packets with exact anchors and no outbound action. | Do not login, click risky prompts, reply, react, follow, or export full threads. |
| Gmail/newsletter reply evidence | `available_with_export_or_snapshot` | Metadata-only rows with redacted snippets and false-positive filters. | Do not export full bodies or interpret intent without review. |
| MailerLite engagement snapshots | `available_with_export_or_snapshot` | Subscriber/campaign rows supplied through a trusted read-only route. | Do not run live API checks or mutate subscribers/groups/campaigns. |
| Source ledger/source-result ledger | `available_now` for docs/contracts only | Use the concepts to classify source and per-contact evidence quality. | Do not append ledger rows in this action. |

## 5. Unknown Or Blocked By Source Health

| Area | Current state | Classification | Required unblock |
| --- | --- | --- | --- |
| Current Instagram API read permissions | Not verified in this audit. | `unknown` | Separate source-health check with no secret output and no mutation. |
| Current Instagram webhook delivery | Not verified in this audit. | `unknown` | Confirm webhook subscription, payload shape, and permissions before relying on it. |
| Current Instagram UI auth state | Not verified in this audit. | `available_only_after_source_health_check` | Human/operator opens authenticated UI; stop on login/checkpoint/CAPTCHA. |
| Current MailerLite API access | Not verified in this audit. | `available_only_after_source_health_check` | Run approved no-secret healthcheck later, not in this action. |
| Current MailerLite snapshot freshness | Not verified in this audit. | `unknown` | Provide dated snapshot/export receipt and row counts. |
| Current Gmail/OpenClaw token health | Not verified in this audit. | `available_only_after_source_health_check` | Run approved no-content healthcheck later, not in this action. |
| Gmail reply discovery freshness | Not verified in this audit. | `unknown` | Provide dated metadata-only discovery receipt. |
| ManyChat/source-recovery bridge availability | Not verified in this audit. | `unknown` | Separate source-recovery audit or supplied exact-anchor report. |

## 6. Blocked By Identity Confidence

| Identity state | Source-health effect | Classification | Safe next handling |
| --- | --- | --- | --- |
| Confirmed email and Instagram handle on one card | Can feed dry-run preview later if source evidence is fresh. | `available_now` for review/preview | Preview only; no card/scoring write in this action. |
| Email-only MailerLite/Gmail signal | Source exists but person/card identity may be incomplete. | `available_with_export_or_snapshot` | Route to identity review before person-level conclusions. |
| Handle-only Instagram signal | Engagement can be observed but not safely tied to email/card. | `available_with_manual_evidence` | Keep as handle-only evidence or identity bridge candidate. |
| Ambiguous shared/family email | Source may be real but person assignment is unsafe. | `blocked` | Human evidence decision before any future card or scoring effect. |
| Name-only Instagram result | Source result is too weak for identity stitching. | `blocked` | Require exact anchor or independent confirmation. |
| Unmatched signal | Cannot safely affect person-level preview. | `blocked` | Return to identity stitching/source-result review. |

## 7. Classification Summary

| Classification | Items in this audit |
| --- | --- |
| `available_now` | Local adapters/tests for Instagram signal events, MailerLite engagement signals, Gmail reply engagement signals, signal-event pipeline dry-run, and engagement preview. |
| `available_with_manual_evidence` | Instagram DM UI evidence, story replies/reactions/comments/mentions/likes/views/follows when supplied as compact read-only observations. |
| `available_with_export_or_snapshot` | MailerLite engagement snapshots, Gmail metadata-only reply discoveries, aggregate Instagram insight snapshots when supplied. |
| `available_only_after_source_health_check` | Current MailerLite API health, Gmail/OpenClaw token health, Instagram API/webhook/UI auth health. |
| `blocked` | Raw private content export, Gmail/DM intent interpretation without review, name-only identity, shared-email assignment, ledger/card/scoring writes, outbound action. |
| `unknown` | Current live source availability, current snapshot freshness, current webhook subscriptions, current ManyChat/source-recovery bridge coverage. |

## 8. Safe Dry-Run Preview Inputs Later

These can safely feed a future dry-run preview after explicit approval and only
from supplied/local inputs:

- `crm:vnext:instagram-signal-events` output produced from compact Instagram
  observations with identity anchors.
- `crm:vnext:mailerlite-engagement-signals` output produced from a dated
  MailerLite snapshot/export.
- `crm:vnext:gmail-reply-engagement-signals` output produced from metadata-only
  Gmail/newsletter reply discovery.
- `crm:vnext:signal-event-pipeline` without `--write-events` or
  `--write-snapshot`.
- `crm:vnext:engagement-signal-preview` output used as internal review context
  only.

Dry-run preview must not mutate cards, ledgers, Fact Store, scoring, source
systems, MailerLite, Instagram, Gmail, Shopify, workflows, subscribers, groups,
audiences, sends, or outbound channels.

## 9. Review-Only Signals

The following must remain review-only:

- Instagram DMs and Gmail/newsletter replies that require interpretation.
- Any signal with `identity_confidence=ambiguous`, `handle-only`, `email-only`,
  or `unknown` when a person-level decision would follow.
- Single opens, likes, story views, or follows without repeated pattern evidence.
- Suppression, bounce, complaint, or unsubscribed states before any warmth logic.
- Shared/family email candidates.
- Restricted or sensitive service context.
- Any signal that might imply a recommendation to contact, DM, reply, send,
  subscribe, group, tag, schedule, publish, or automate.

## 10. CEO / Operator Brief Surface For Mantis

Mantis should eventually surface a no-send CEO/operator brief with:

| Brief field | Source-health reality |
| --- | --- |
| Channel readiness | Instagram, MailerLite, and Gmail current health: healthy, stale, blocked, unknown, or manual-only. |
| Source blockers | Exact blocker: missing snapshot, stale snapshot, auth not checked, webhook unknown, identity ambiguous, manual evidence needed. |
| Signal inventory | Counts by available_now, manual evidence, export/snapshot, source-health check needed, blocked, and unknown. |
| Identity coverage | Confirmed, likely, email-only, handle-only, ambiguous, unknown. |
| Preview readiness | Whether supplied signals can run through local dry-run preview without writes. |
| Review queue | DMs/replies, ambiguous identities, shared emails, suppression states, and weak passive signals. |
| Closed gates | No outbound, no card writes, no scoring writes, no Fact Store writes, no Signal Event Ledger writes, no Engagement Snapshot Ledger writes. |
| Next operator move | Provide dated snapshot, run approved source-health check, collect compact manual evidence, or review identity bridge. |

The brief should help Alejandro decide where attention belongs. It must never
treat warmth, engagement, or a source-health pass as permission to contact.

## 11. What Should Not Be Automated Yet

Do not automate:

- live Instagram API/webhook ingestion;
- Instagram UI browsing or thread opening;
- Gmail search, reply interpretation, label/archive/send, or body export;
- MailerLite subscriber/campaign reads, group/tag/segment/workflow changes, or
  sends;
- source-result ledger writes;
- Signal Event Ledger writes;
- Engagement Snapshot Ledger writes;
- card writes or Fact Store writes;
- scoring policy changes;
- automatic identity merges from email/handle/name evidence;
- automatic CEO/operator brief generation from live systems;
- any recommendation that asks Alejandro to send, DM, reply, publish, schedule,
  or mutate a source system based on heat alone.

## Validation

Use only local validation:

```bash
git diff --check
npx vitest run __tests__/crm-vnext-instagram-signal-events.spec.ts __tests__/crm-vnext-mailerlite-engagement-signals.spec.ts __tests__/crm-vnext-gmail-reply-engagement-signals.spec.ts __tests__/crm-vnext-signal-event-pipeline.spec.ts __tests__/crm-vnext-engagement-signal-preview.spec.ts
```

# Community Signal Readiness Board v0

Date: 2026-06-02
Status: read-only CRM Core capability/readiness board

## Purpose

This board maps the current CRM Core signal-readiness posture for the two
highest-leverage community channels:

- Instagram as the main public/community attention channel.
- Email/MailerLite as the main deep-relationship channel.

This is not a scoring feature and not a write feature. It does not authorize
card writes, Fact Store writes, Signal Event Ledger writes, Engagement Snapshot
Ledger writes, score mutation, MailerLite mutation, Instagram action, Shopify
action, workflow changes, subscriber/group/audience changes, or outbound sends.

## Field Contract

Use these fields when reviewing a signal row:

| Field | Allowed values | Meaning |
| --- | --- | --- |
| `source_access_mode` | `API`, `webhook`, `UI read-only`, `export`, `manual evidence`, `local snapshot`, `not currently available`, `unknown` | How the signal can be observed now or plausibly supplied to CRM Core. |
| `identity_confidence` | `confirmed`, `likely`, `ambiguous`, `handle-only`, `email-only`, `unknown` | How safely the signal can be matched to a vNext person card. |
| `allowed_effect_now` | `store-only`, `ledger-ready`, `projectable`, `preview-only`, `review-only`, `blocked` | What CRM Core may do with supplied evidence in this v0. |
| `write_policy` | fixed safety statement | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0 unless explicitly marked as future/blocked. |
| `source_health_blocker` | free text | What must be verified before treating the signal as available. |

`ledger-ready` means the supplied signal has a shape compatible with the Signal
Event Ledger contract. It does not mean the ledger may be written in this v0.
Any future ledger append still requires an explicit approval boundary.

## 1. Instagram Signals

Do not assume every desired Instagram signal is API-available. Treat Instagram
availability as source-specific and source-health-dependent.

| Signal type | Current useful meaning | source_access_mode | identity_confidence | allowed_effect_now | write_policy | source_health_blocker |
| --- | --- | --- | --- | --- | --- | --- |
| DM or message thread observation | Strong relationship/context signal when a real thread is opened and read without action. | `UI read-only`, `manual evidence`, `export` | `confirmed`, `likely`, `ambiguous` | `review-only`, `ledger-ready`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify authenticated read-only UI route, thread opened safely, no message/reaction/follow/settings action, compact snippet only. |
| Story reply | Stronger than passive story view; often relationship engagement. | `UI read-only`, `webhook`, `export`, `manual evidence`, `unknown` | `confirmed`, `handle-only`, `ambiguous` | `ledger-ready`, `preview-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify whether webhook/API/export source is actually available; otherwise require supplied read-only observation. |
| Message reaction | Lightweight interaction; useful only as pattern evidence. | `UI read-only`, `webhook`, `export`, `manual evidence`, `unknown` | `handle-only`, `likely`, `ambiguous` | `store-only`, `preview-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Confirm the surface exposes reaction safely and the actor maps to a handle/card. |
| Comment, mention, or live comment | Public interaction; stronger when repeated or content-rich. | `API`, `webhook`, `UI read-only`, `export`, `manual evidence`, `unknown` | `handle-only`, `likely`, `confirmed` | `ledger-ready`, `preview-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify API/webhook scope or read-only capture path; avoid treating name-only public results as identity proof. |
| Like | Passive attention; weak alone. | `API`, `export`, `manual evidence`, `unknown` | `handle-only`, `unknown` | `store-only`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify actual source availability and avoid single-like overinterpretation. |
| Story view | Passive attention; useful only as repeated pattern or when paired with stronger signals. | `API`, `export`, `manual evidence`, `unknown` | `handle-only`, `unknown` | `store-only`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify whether story view data is available through current tools; require repeated pattern before heat interpretation. |
| Follow or new follow | Entry/context signal, not relationship depth by itself. | `API`, `webhook`, `export`, `manual evidence`, `unknown` | `handle-only`, `likely` | `store-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify source and exact handle; do not infer email/person identity. |
| Profile visit, save, share, reach, impressions, aggregate insight | Aggregate/public attention context; not always person-level. | `API`, `export`, `local snapshot`, `unknown` | `unknown`, `handle-only` | `store-only`, `blocked` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify whether metrics are account/media-level or person-level before any projection. |
| Instagram DM UI identity bridge | Handle/email/phone/location/context evidence from read-only thread inspection. | `UI read-only`, `manual evidence` | `confirmed`, `likely`, `ambiguous` | `review-only`, `ledger-ready` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify thread-open read-only rule, exact anchor searched, compact context captured, no full conversation export. |

## 2. Email / MailerLite Signals

Email signals need pattern discipline. A single open is weak; repeated opens,
clicks, human replies, and consistent behavior carry different meanings.

| Signal type | Current useful meaning | source_access_mode | identity_confidence | allowed_effect_now | write_policy | source_health_blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Single MailerLite open | Very light reading signal; not enough for action. | `local snapshot`, `export`, `API`, `unknown` | `email-only`, `confirmed`, `likely` | `preview-only`, `store-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify snapshot freshness, subscriber identity, and that the row is not a bot/noise artifact. |
| Repeated opens over 30 or 90 days | Attention pattern and relationship memory. | `local snapshot`, `export`, `API`, `unknown` | `email-only`, `confirmed`, `likely` | `projectable`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify repeated behavior comes from fresh supplied rows and maps to one person/card. |
| Click | Stronger topic or product interest than an open. | `local snapshot`, `export`, `API`, `unknown` | `email-only`, `confirmed`, `likely` | `projectable`, `preview-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify campaign/link context is available without raw private URL leakage. |
| Repeated clicks or consistent campaign engagement | Stronger interest pattern, still no-send by default. | `local snapshot`, `export`, `API`, `unknown` | `confirmed`, `likely`, `email-only` | `projectable`, `preview-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify consistency across campaigns and avoid treating engagement as send permission. |
| Subscriber status, suppression, bounce, complaint | Safety and deliverability context. | `local snapshot`, `export`, `API`, `unknown` | `email-only`, `confirmed`, `likely` | `review-only`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify status freshness and keep suppression ahead of warmth. |
| Lifetime opens/clicks/subscribed age | Relationship depth/history, not immediate heat. | `local snapshot`, `export`, `API`, `unknown` | `email-only`, `confirmed`, `likely` | `preview-only`, `store-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify historical counters are current enough and not over-weighted. |
| Gmail/newsletter human reply | High-value deep relationship signal that needs interpretation. | `export`, `manual evidence`, `local snapshot`, `unknown` | `confirmed`, `likely`, `email-only`, `ambiguous` | `review-only`, `projectable`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify metadata-only discovery, no full body export, human reply confidence, and false-positive filters. |
| MailerLite identity evidence | Email/name/phone/city/groups as stitching evidence. | `export`, `local snapshot`, `API`, `unknown` | `email-only`, `likely`, `confirmed`, `ambiguous` | `review-only`, `ledger-ready` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify cursor/snapshot completeness and avoid using MailerLite alone as direct card authority. |

## 3. Identity Matching

Signal readiness depends on matching Instagram and email without collapsing
uncertain people.

| Matching state | Typical evidence | source_access_mode | identity_confidence | allowed_effect_now | write_policy | source_health_blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Email and Instagram both present on the same vNext card | Current person card plus evidence/provenance. | `local snapshot` | `confirmed` | `projectable`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Verify card store read source and no conflicting identity evidence. |
| Email-only card with Instagram signal candidate | MailerLite/Gmail email plus IG UI/API/manual handle candidate. | `UI read-only`, `export`, `manual evidence`, `local snapshot` | `email-only`, `ambiguous`, `likely` | `review-only`, `blocked` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Need exact handle bridge from thread, lead-capture trace, ManyChat/source recovery, or human confirmation. |
| Instagram-only person with no email | IG handle/activity with no email bridge. | `UI read-only`, `manual evidence`, `export` | `handle-only` | `review-only`, `store-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Need source recovery before email interpretation or card-write approval. |
| Shared/family email candidate | Drive/Gmail/retreat/family context. | `export`, `manual evidence` | `ambiguous` | `review-only`, `blocked` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Need explicit evidence review decision before assigning email to subject. |
| Unmatched signal | Signal has email/handle but no safe card match. | `local snapshot`, `export`, `manual evidence`, `unknown` | `unknown`, `handle-only`, `email-only` | `blocked`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Route to identity stitching before heat preview affects priorities. |

## 4. Signal Event Ledger Readiness

This v0 may classify ledger readiness only. It must not append to the Signal
Event Ledger.

| Signal family | Ledger event shape | source_access_mode | identity_confidence | allowed_effect_now | write_policy | source_health_blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Instagram DMs, replies, comments, likes, story views, follows | `instagram_dm`, `instagram_comment`, `instagram_like`, `instagram_story_view`, `instagram_follow`, `instagram_engagement_snapshot` | `UI read-only`, `API`, `webhook`, `export`, `manual evidence`, `unknown` | `confirmed`, `likely`, `handle-only`, `ambiguous` | `ledger-ready`, `preview-only`, `review-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0; future ledger append requires explicit approval. | Verify source availability and identity anchor before classifying as available. |
| MailerLite engagement rows | `email_engagement_snapshot`, `email_open`, `email_click`, `email_suppression` | `local snapshot`, `export`, `API`, `unknown` | `email-only`, `confirmed`, `likely` | `ledger-ready`, `projectable`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0; future ledger append requires explicit approval. | Verify snapshot freshness, row completeness, and subscriber identity. |
| Gmail/newsletter replies | `email_reply` | `export`, `manual evidence`, `local snapshot`, `unknown` | `confirmed`, `likely`, `email-only`, `ambiguous` | `ledger-ready`, `review-only`, `preview-only` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0; future ledger append requires explicit approval. | Verify metadata-only human reply confidence and no body export. |
| Identity evidence packets | Evidence source packets, not direct engagement events. | `UI read-only`, `export`, `manual evidence`, `local snapshot` | `confirmed`, `likely`, `ambiguous`, `handle-only`, `email-only` | `review-only`, `blocked` | No card write, no scoring write, no Fact Store write, no Signal Event Ledger write in this v0. | Route through evidence review/card approval path, not direct scoring. |

## 5. Review Gates

The following remain review-only in this v0:

- Gmail/newsletter replies and Instagram DMs that require interpretation.
- Any signal with `identity_confidence=ambiguous`, `handle-only`, `email-only`,
  or `unknown` when the preview would imply a person-level decision.
- Family/shared email candidates.
- Restricted or sensitive service context.
- Any signal whose source access is `unknown`, `not currently available`, or
  blocked by auth, permissions, stale export, or missing source-health proof.
- Single passive opens, likes, follows, or story views when not part of a clear
  repeated pattern.
- Any output that would imply direct outreach, MailerLite mutation, card write,
  Fact Store write, ledger append, score mutation, Shopify action, or workflow
  action.

Required review output:

| Review question | Required result before future action |
| --- | --- |
| Does this email belong to this person? | Evidence decision, then separate card-write approval if needed. |
| Does this handle belong to this email/card? | Confirmed bridge evidence or human confirmation. |
| Does this reply/DM show intent, care need, or context? | Human/operator interpretation; no outbound permission. |
| Is this signal source actually available today? | Source-health check or supplied read-only evidence packet. |
| Should this affect scoring or remain store-only? | Future scoring-policy review; not in this v0. |

## 6. Heat Preview Path

The only allowed v0 heat/engagement path is dry-run preview from supplied or
local read-only inputs:

```text
Instagram observations
  -> crm:vnext:instagram-signal-events
  -> crm:vnext:signal-event-pipeline without --write-events or --write-snapshot
  -> engagement preview output only

MailerLite supplied snapshot
  -> crm:vnext:mailerlite-engagement-signals
  -> crm:vnext:signal-event-pipeline without --write-events or --write-snapshot
  -> engagement preview output only

Gmail/newsletter reply discovery
  -> crm:vnext:gmail-reply-engagement-signals
  -> crm:vnext:signal-event-pipeline without --write-events or --write-snapshot
  -> engagement preview output only
```

Preview rules:

- Use supplied snapshots/exports/manual evidence only.
- Do not call live APIs.
- Do not write ledgers.
- Do not mutate cards, Fact Store, scoring, MailerLite, Instagram, Shopify, or
  outbound channels.
- Treat preview warmth as internal review context, never permission to contact.
- Route unmatched signals back to identity stitching.
- Keep Gmail replies and DMs review-only before any future write or outreach
  interpretation.

## 7. CEO / Operator Brief

Mantis should eventually surface a no-send CEO/operator brief with:

| Brief field | Meaning |
| --- | --- |
| Channel readiness | Instagram and email source-access status, including blockers. |
| Signal volume by class | Counts for repeated engagement, clicks, replies, DMs/comments, passive signals, and unmatched signals. |
| Identity coverage | Matched, email-only, handle-only, ambiguous, and unknown signal counts. |
| Strongest safe deltas | People or cohorts worth internal review, with no-send language. |
| Review queue | DMs/replies needing interpretation and identity bridges needing confirmation. |
| Source-health blockers | Exact missing verification before treating a source as available. |
| Suggested next operator move | Observe, run identity stitching, ask a compact question, prepare evidence review, or run dry-run preview. |
| Closed gates | No outbound, no card writes, no scoring writes, no Fact Store writes, no Signal Event Ledger writes, no Engagement Snapshot Ledger writes. |

The brief should help Alejandro decide where attention belongs. It must not ask
for send approval, propose MailerLite mutations, advance Launch OS, or treat CRM
signal readiness as CRM state mutation.

## v0 Validation

Validate only the read-only signal contracts:

```bash
git diff --check
npx vitest run __tests__/crm-vnext-instagram-signal-events.spec.ts __tests__/crm-vnext-mailerlite-engagement-signals.spec.ts __tests__/crm-vnext-gmail-reply-engagement-signals.spec.ts __tests__/crm-vnext-signal-event-pipeline.spec.ts __tests__/crm-vnext-engagement-signal-preview.spec.ts
```

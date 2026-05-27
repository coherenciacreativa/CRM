# CRM vNext Signal Event Projection

Date: 2026-05-21
Status: Implemented read-only CLI projection

## Purpose

`crm:vnext:signal-event-projection` converts canonical Signal Event Ledger records into `engagement-signal-preview` input.

This is the bridge from "what happened" to "how might this affect warmth, relationship engagement, product fit, or review queues?"

The projection is source-extensible. It is not limited to MailerLite and Gmail. The v0 already understands the event families needed for future sources such as:

- Shopify / commerce purchases,
- Bhakti WhatsApp deliveries or interactions,
- ClassBot attendance and recording delivery,
- Instagram activity,
- MailerLite/Gmail email engagement,
- manual activity observations.

## Local Command

Project supplied events:

```bash
npm run crm:vnext:signal-event-projection -- \
  --events-file <signal-events.json>
```

Project from the local Signal Event Ledger:

```bash
npm run crm:vnext:signal-event-projection -- \
  --from-ledger \
  --out ~/Documents/Mantis-Reports/crm_vnext_signal_event_projection_2026-05-21.json
```

Then feed the output to engagement preview:

```bash
npm run crm:vnext:engagement-signal-preview -- \
  --signals-file ~/Documents/Mantis-Reports/crm_vnext_signal_event_projection_2026-05-21.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_engagement_preview_2026-05-21.json
```

Options:

```bash
--ledger-path .crm-vnext/signal-events/ledger.jsonl
--limit 5000
--include-restricted
--fail-on-empty
```

`--include-restricted` is intentionally opt-in. Restricted service/context events are skipped by default so sensitive facts do not silently alter scoring.

## Projection Rules

| Event kind/source | Projected signal |
| --- | --- |
| `email_engagement_snapshot` | email opens/clicks/replies/lifetime/subscriber status |
| `email_open` | opens in 30/90 days, lifetime open, last open |
| `email_click` | clicks in 30/90 days, lifetime click, last click |
| `email_reply` | replies in 30 days, last reply |
| `email_suppression` | subscriber status / suppression review |
| `instagram_dm` | inbound DMs in 30 days |
| `instagram_comment` | comments in 30 days |
| `instagram_like` | likes in 30 days |
| `instagram_story_view` | story views in 30 days |
| `instagram_follow` | follow signal |
| `class_attendance` | yoga classes in 90 days |
| `community_event_attendance` | Encuentro Feliz / community attendance in 90 days |
| `retreat_attendance` | retreat attendance depth |
| `recording_delivery` | WhatsApp automation/delivery signal |
| `purchase` | spend, purchase count, active client, product-family counts |

## Mini-Launch Boundary

Mini-launch operating events can be valid Signal Event Ledger records even when they do not yet project into scoring.

Projectable now through existing rules:

- `email_open`
- `email_click`
- `email_reply`
- `instagram_engagement_snapshot`
- `instagram_comment`
- `instagram_like`

Store-only by default:

- `mini_launch_intake_created`
- `brand_brief_approved`
- `landing_preview_ready`
- `email_submitted`
- `source_assigned`
- `resource_delivered`
- `content_sent`
- `quiz_started`
- `quiz_or_game_completed`
- `market_signal_reviewed`
- `continue_or_archive_decision`
- `onboarding_handoff_recommended`
- `onboarding_eligibility_assigned`
- `onboarding_started`
- `onboarding_completed`
- `audience_eligibility_assigned`

Rule: the CRM may preserve launch operations and market-learning events now, but it must not turn them into warmth, product-fit, card mutations, or outbound permission until a reviewed policy explicitly says how to interpret them.

Onboarding v2 journey events are also store-only by default. They describe routing, eligibility and lifecycle state around the editorial onboarding; they do not mean the person read, clicked, replied, became warmer, or should receive additional outbound unless a separate projection/scoring policy says so.

## Future Sources

New sources should not require a new scoring lane. They should emit canonical Signal Event Ledger records with:

- `source.kind`, for example `shopify`, `bhakti_whatsapp`, `classbot`, `stripe`, `mercadopago`;
- `event.kind`, for example `purchase`, `recording_delivery`, `class_attendance`;
- `event.metrics`, for example `amount`, `productKind`, `quantity`;
- `subject`, using any stable identity anchor available.

Then this projection can map the event into existing scoring dimensions.

If a future source has a new kind of signal that does not fit current dimensions, add a small projection rule here rather than creating a parallel CRM.

## Relationship To Scoring

The projection does not compute final scores by itself.

Scoring policy lives in `docs/crm-vnext/scoring-policy-v0.md` and
`lib/crm/community-scoring-policy.ts`. New source adapters should map events into
the existing dimensions there instead of inventing a parallel heat score.

Flow:

```text
Signal Event Ledger
  -> Signal Event Projection
  -> Engagement Signal Preview
  -> Engagement Snapshot Ledger / dashboard
```

The scoring preview now accepts:

- email activity,
- Instagram activity,
- WhatsApp/Bhakti activity,
- participation activity,
- purchase/commerce activity.

This keeps the model open to future sources while preserving one policy surface.

## Safety

This command is read-only:

- no card mutation,
- no Fact Store write,
- no score mutation,
- no source-system mutation,
- no outbound messages,
- no live API calls,
- no credential reads.

Projected warmth is internal review context, never permission to contact someone.

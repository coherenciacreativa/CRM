# CRM vNext Signal Event Ledger

Date: 2026-05-21
Status: Implemented local ledger + CLI

## Purpose

`crm:vnext:signal-event-ledger` is the canonical local event shelf for CRM vNext.

It sits below cards, Fact Store, scoring previews, and dashboards. Its job is to preserve source observations as time-stamped events before any policy decides whether they should change a card, move a score, or ask Alejandro for review.

This separates three ideas that should not be blended:

- **Facts:** durable reviewed truths, such as "Mayerli is a current yoga student."
- **Signals/events:** observed activity, such as "MailerLite saw two opens" or "Gmail saw a human reply."
- **Card state:** the current consolidated profile used by Alejandro, Mantis, and dashboards.

## Local Command

List recent events:

```bash
npm run crm:vnext:signal-event-ledger
```

Normalize supplied signals without writing:

```bash
npm run crm:vnext:signal-event-ledger -- \
  --events-file <signals-or-events.json>
```

Commit after explicit approval:

```bash
npm run crm:vnext:signal-event-ledger -- \
  --events-file <signals-or-events.json> \
  --write \
  --approved-by Alejandro \
  --source-label "MailerLite engagement snapshot 2026-05-21"
```

Optional:

```bash
--ledger-path .crm-vnext/signal-events/ledger.jsonl
--limit 50
--collector Mantis
--out ~/Documents/Mantis-Reports/crm_vnext_signal_event_ledger_2026-05-21.json
--fail-on-empty
```

## Input

The input can be:

- a JSON array,
- `{ "events": [...] }`,
- `{ "signalEvents": [...] }`,
- `{ "signals": [...] }`.

It accepts existing CRM vNext engagement signals, such as MailerLite and Gmail reply adapter output:

```json
{
  "signals": [
    {
      "sourceKind": "mailerlite_subscriber_activity",
      "sourceId": "subscriber:152595767566009988",
      "email": "juanjotru@gmail.com",
      "observedAt": "2026-05-21T10:00:00.000Z",
      "opens30d": 2,
      "clicks30d": 0,
      "lifetimeOpens": 44,
      "subscriberStatus": "active"
    }
  ]
}
```

It also accepts more event-shaped records:

```json
{
  "events": [
    {
      "eventKind": "class_attendance",
      "channel": "classbot",
      "personId": "ig:cielo_gom_g",
      "observedAt": "2026-05-21T23:00:00.000Z",
      "metrics": {
        "occurrences": 1
      }
    }
  ]
}
```

## Stored Shape

Each line in `.crm-vnext/signal-events/ledger.jsonl` is one event:

```json
{
  "schemaVersion": "crm-vnext-stored-signal-event-2026-05-21",
  "eventId": "signal_event_...",
  "batchId": "signal_event_batch_202605211200",
  "capturedAt": "2026-05-21T12:00:00.000Z",
  "observedAt": "2026-05-21T10:00:00.000Z",
  "source": {
    "kind": "mailerlite_subscriber_activity",
    "sourceId": "subscriber:152595767566009988",
    "label": "MailerLite engagement snapshot 2026-05-21",
    "collector": "Mantis"
  },
  "subject": {
    "personId": null,
    "email": "juanjotru@gmail.com",
    "instagramHandle": null,
    "phone": null
  },
  "event": {
    "kind": "email_engagement_snapshot",
    "channel": "email",
    "direction": "inbound",
    "strength": "unknown",
    "quantity": 1,
    "metrics": {
      "opens30d": 2,
      "lifetimeOpens": 44,
      "subscriberStatus": "active"
    },
    "tags": []
  },
  "evidence": {
    "summary": null,
    "sourceIds": [],
    "rawBodyExported": false
  },
  "sensitivity": {
    "restricted": false,
    "reasonCodes": []
  },
  "safety": {
    "cardMutationExecuted": false,
    "factStoreWriteExecuted": false,
    "outboundExecuted": false,
    "liveApiCallsExecuted": false,
    "credentialReadExecuted": false,
    "scoreMutationExecuted": false
  }
}
```

## Event Kinds

Supported kinds:

- `email_engagement_snapshot`
- `email_sent`
- `email_open`
- `email_click`
- `email_reply`
- `email_suppression`
- `email_submitted`
- `instagram_engagement_snapshot`
- `instagram_dm`
- `instagram_comment`
- `instagram_like`
- `instagram_story_view`
- `instagram_follow`
- `mini_launch_intake_created`
- `brand_brief_approved`
- `landing_preview_ready`
- `source_assigned`
- `resource_delivered`
- `content_sent`
- `quiz_started`
- `quiz_or_game_completed`
- `market_signal_reviewed`
- `continue_or_archive_decision`
- `class_attendance`
- `recording_delivery`
- `community_event_attendance`
- `retreat_attendance`
- `purchase`
- `human_report`
- `identity_observation`
- `manual_observation`
- `unknown`

The v0 can store both raw events and aggregate snapshots. Aggregate snapshots are important because many available sources currently report "opens in 30 days" or "recent story activity" instead of a clean raw event stream.

Mini-launch events are intentionally supported at the ledger layer before they all affect scoring. This lets a launch such as `Inteligencia para descansar` preserve the whole operating story: idea intake, Brand approval, Shopify preview, email capture, MailerLite receipts, quiz completion, email engagement, Instagram engagement, market review, and Alejandro's continue/archive decision. Store first; project into warmth/product-fit only when a reviewed scoring policy says that event should count.

## Channels

Supported channels:

- `email`
- `instagram`
- `whatsapp`
- `telegram`
- `classbot`
- `google_workspace`
- `web`
- `shopify`
- `quiz`
- `crm`
- `commerce`
- `mailerlite`
- `manual`
- `unknown`

## Relationship To Existing Layers

Recommended flow:

1. Mantis gathers source evidence read-only.
2. Source-specific adapters normalize when useful, for example MailerLite, Gmail reply engagement signals, or Instagram observations through `crm:vnext:instagram-signal-events`.
3. `signal-event-ledger` stores the canonical observations.
4. `signal-event-projection` projects selected canonical events into engagement preview signals.
5. `engagement-signal-preview` computes scoring deltas.
6. `engagement-snapshot-ledger` stores reviewed movement history.
7. Future policy may promote selected state into cards, with explicit approval.

This means the ledger is not another card store. It is the event history below the card store.

## Safety

This ledger is local-only and append-only:

- no card mutation,
- no Fact Store write,
- no score mutation,
- no outbound messages,
- no live MailerLite/Gmail/Instagram/ManyChat/Drive/Contacts calls,
- no credential reads or changes.

Committed writes require:

```bash
--write --approved-by <name>
```

A stored event means "this was observed." It is never permission to contact someone.

## Operator Rule

Use this when a source observation may matter later but should not immediately change the person card.

Examples:

- MailerLite engagement snapshots,
- Gmail newsletter reply candidates,
- Instagram story/DM/comment observations,
- ClassBot attendance or recording-delivery observations,
- human or assistant reports that are activity-shaped rather than stable facts.

If the observation is a durable business truth, route it through Fact Intake and Fact Store instead. If it is an identity/card change, route it through the evidence and card-write approval path.

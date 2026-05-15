# CRM vNext Engagement Signal Preview

Date: 2026-05-11
Status: Implemented read-only local/API contract

## Purpose

`POST /api/crm-vnext/engagement-signal-preview` previews how supplied engagement evidence would move CRM warmth and review queues.

It is the first bridge from static stitched cards toward the living CRM layer:

- MailerLite opens/clicks/subscriber status,
- Gmail reply activity,
- Instagram DMs/comments/likes/story views/follow signal,
- manual or operator snapshots.

The endpoint does not fetch those sources itself. Mantis or another safe helper supplies read-only snapshots, and CRM vNext computes the before/after scoring impact.

## Local Command

```bash
npm run crm:vnext:engagement-signal-preview -- \
  --signals-file <engagement-signals.json>
```

Optional:

```bash
--card-store-path ./.crm-vnext/person-card-store/person-cards-vnext.json
--source-path <legacy-person-cards-v1.json>
--prefer-store 0
--out tmp/crm-vnext/engagement-signal-preview.json
--fail-on-unmatched
```

MailerLite snapshots should first be normalized through the local adapter:

```bash
npm run crm:vnext:mailerlite-engagement-signals -- \
  --snapshot-file <mailerlite-engagement-snapshot.json> \
  --out tmp/crm-vnext/mailerlite-engagement-signals.json
```

The adapter accepts supplied read-only MailerLite rows only; it does not call MailerLite or read credentials.

## Signal Shape

The input can be a JSON array or `{ "signals": [...] }`.

```json
{
  "signals": [
    {
      "sourceKind": "mailerlite_campaign_activity",
      "sourceId": "campaign-2026-05-11:reader@example.com",
      "email": "reader@example.com",
      "observedAt": "2026-05-11T10:00:00.000Z",
      "opens30d": 12,
      "clicks30d": 3,
      "lastOpenAt": "2026-05-11T09:00:00.000Z",
      "subscriberStatus": "active"
    }
  ]
}
```

Supported `sourceKind` values:

- `mailerlite_campaign_activity`
- `mailerlite_subscriber_activity`
- `gmail_reply_activity`
- `instagram_activity`
- `manual_engagement_snapshot`
- `unknown`

Manual snapshots are allowed as a bridge from Alejandro/Mantis reports to future scoring, but they should be treated as bounded, source-labeled evidence. For example, "Cielo frequently watches stories" can raise relationship engagement modestly until Instagram event data confirms the pattern. Manual reports about purchases, service relationships, or identity can carry more confidence after review because Alejandro is the source of truth for his own programs.

## Output

The preview returns:

- total signals read,
- matched and unmatched signals,
- cards previewed,
- warmed/cooled cards,
- suppression reviews,
- before/after score summaries,
- score deltas,
- new reason/risk codes,
- a recommended internal queue.

Queues are internal only:

- `human_follow_up_review`
- `email_nurture_candidate`
- `suppression_review`
- `keep_observing`

## Safety

This surface is read-only:

- no card mutation,
- no Fact Store write,
- no outbound messages,
- no live MailerLite/Gmail/Instagram/ManyChat/Drive/Contacts calls,
- no credential reads or changes,
- no MailerLite group, segment, subscriber, campaign, automation, or tag changes.

A warmer score means "review internally first." It is never permission to send an email, DM, WhatsApp, Telegram, or automation.

## Operator Rule

Use this after identity stitching is stable enough that engagement signals can be matched to cards. If a signal is unmatched, route it back through identity stitching or the batch operating loop before using it for prioritization.

Approved Fact Store entries should eventually be converted into this same preview lane through a future Fact-to-Scoring adapter, so conversational facts and automated signals share one inspectable scoring policy.

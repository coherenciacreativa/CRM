# CRM vNext MailerLite Engagement Signals

Date: 2026-05-15
Status: Implemented read-only local adapter

## Purpose

`crm:vnext:mailerlite-engagement-signals` converts a supplied MailerLite subscriber/campaign snapshot into the signal shape consumed by `crm:vnext:engagement-signal-preview`.

This is the safe boundary:

```text
Mantis/MailerLite read-only snapshot -> engagement signals -> scoring preview
```

The adapter does not call MailerLite. Mantis or a trusted read-only route gathers the snapshot, then CRM vNext translates it locally.

## Local Command

```bash
npm run crm:vnext:mailerlite-engagement-signals -- \
  --snapshot-file <mailerlite-engagement-snapshot.json> \
  --out tmp/crm-vnext/mailerlite-engagement-signals.json
```

Optional:

```bash
--window-days 30
--observed-at 2026-05-15T12:00:00.000Z
--fail-on-empty
```

Then preview scoring:

```bash
npm run crm:vnext:engagement-signal-preview -- \
  --signals-file tmp/crm-vnext/mailerlite-engagement-signals.json \
  --out tmp/crm-vnext/mailerlite-engagement-preview.json
```

## Accepted Snapshot Shapes

The snapshot can contain rows under common keys:

- `subscribers`
- `records`
- `rows`
- `data`
- `items`
- `results`
- `contacts`

Per row, the adapter accepts flexible field names such as:

- `email`, `subscriber.email`, `subscriber_email`
- `status`, `subscriberStatus`, `email_subscriber_status`
- `opens30d`, `opens_30d`, `open_count`, `total_opens`
- `clicks30d`, `clicks_30d`, `click_count`, `total_clicks`
- `last_open_at`, `opened_at`, `last_click_at`, `clicked_at`
- `groups`, `tags`, `segments`
- nested campaign arrays like `campaignActivity`, `campaigns`, `recentCampaigns`, or `events`

`Subscribed`/`active` normalize to `active`. `unsubscribed`, `bounced`, and complaints stay visible as suppression signals.

## Output

The output is `{ signals: [...] }` plus a compact summary. Signals use:

- `mailerlite_subscriber_activity` for subscriber-level rows,
- `mailerlite_campaign_activity` for campaign/event activity.

Rows without a match identity are skipped into `skippedRecords`; they should go back to identity stitching rather than scoring.

## Safety

This adapter is read-only:

- no MailerLite API call,
- no credential read/print/rotation,
- no subscriber/group/tag/segment mutation,
- no CRM card mutation,
- no Fact Store write,
- no outbound message.

MailerLite engagement can move warmth and queue priority, but it never authorizes outreach by itself.

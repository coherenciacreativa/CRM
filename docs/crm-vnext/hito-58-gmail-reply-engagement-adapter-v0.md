# Hito 58 - Gmail Reply Engagement Adapter v0

Date: 2026-05-15
Status: Completed

## Why

Mantis found a clean route for newsletter reply intelligence:

- newsletters use sender `notasdealejandro@coherenciacreativa.com`,
- human replies route through `respuestas@coherenciacreativa.com`,
- real replies can be identified from Gmail metadata without exporting full email bodies.

This matters because a human reply to an article is stronger relationship evidence than a passive open.

## What Changed

Added `crm:vnext:gmail-reply-engagement-signals`, a read-only adapter that converts Mantis Gmail reply discovery JSON into `gmail_reply_activity` engagement signals.

The adapter:

- accepts Mantis discovery rows such as `representativeExamples` or `replyActivities`,
- converts strong/medium human reply candidates into scoring-preview signals,
- keeps weak and false-positive rows in `skippedRecords`,
- preserves metadata-only trace rows in `replyActivities`,
- redacts local paths from output,
- never calls Gmail or mutates anything.

## Safety Boundary

Allowed:

- consume supplied metadata-only Gmail discovery JSON,
- generate local engagement signals,
- feed those signals into `crm:vnext:engagement-signal-preview`.

Prohibited:

- Gmail API calls,
- credential reads or prints,
- full body export,
- Gmail label/archive/delete/send,
- CRM card writes,
- Fact Store writes,
- outbound messages.

## Command

```bash
npm run crm:vnext:gmail-reply-engagement-signals -- \
  --discovery-file ~/Documents/Mantis-Reports/email_reply_intelligence_discovery_v0_2026-05-15_1536.json \
  --out ~/Documents/Mantis-Reports/email_reply_engagement_signals_2026-05-15.json
```

Preview:

```bash
npm run crm:vnext:engagement-signal-preview -- \
  --signals-file ~/Documents/Mantis-Reports/email_reply_engagement_signals_2026-05-15.json \
  --out ~/Documents/Mantis-Reports/email_reply_engagement_preview_2026-05-15.json
```

## Notes For Mantis

For future discoveries, prefer a contact-keyed or message-keyed JSON with:

- `messageId`,
- `threadId`,
- `from.email`,
- `date`,
- `subject`,
- `matchedNewsletterOrCampaign`,
- `replyConfidence`,
- `candidateType`,
- `reasonCodes`,
- `selectedHeaders`,
- `redactedSnippet`.

Do not export full bodies. If auth fails, ask Alejandro for OAuth/auth help instead of returning an empty discovery as success.

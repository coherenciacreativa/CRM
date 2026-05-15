# CRM vNext Gmail Reply Engagement Signals

Date: 2026-05-15
Status: Implemented read-only local adapter

## Purpose

`crm:vnext:gmail-reply-engagement-signals` converts a supplied Mantis Gmail reply intelligence discovery into the signal shape consumed by `crm:vnext:engagement-signal-preview`.

This is the safe boundary:

```text
Mantis/Gmail metadata-only discovery -> engagement signals -> scoring preview
```

The adapter does not call Gmail. Mantis gathers metadata read-only, then CRM vNext translates the supplied JSON locally.

## Discovery Pattern

The first discovery showed that newsletters may be sent from `notasdealejandro@coherenciacreativa.com`, while human replies arrive through `respuestas@coherenciacreativa.com`.

Useful metadata pattern:

- external human `From`
- `To`, `Delivered-To`, `X-Original-To`, or forwarding headers pointing at the reply address
- `In-Reply-To` or `References` pointing back to MailerLite/mlsend
- `Re:` subject preserving the article title

False positives stay out of scoring:

- MailerLite outbound sender
- bulk/list-unsubscribe/feedback headers
- bounces, autoresponders, and no-reply senders
- weak/review-only confidence

## Local Command

```bash
npm run crm:vnext:gmail-reply-engagement-signals -- \
  --discovery-file ~/Documents/Mantis-Reports/email_reply_intelligence_discovery_v0_2026-05-15_1536.json \
  --out ~/Documents/Mantis-Reports/email_reply_engagement_signals_2026-05-15.json
```

Optional:

```bash
--window-days 30
--fail-on-empty
```

Then preview scoring:

```bash
npm run crm:vnext:engagement-signal-preview -- \
  --signals-file ~/Documents/Mantis-Reports/email_reply_engagement_signals_2026-05-15.json \
  --out ~/Documents/Mantis-Reports/email_reply_engagement_preview_2026-05-15.json
```

## Accepted Input

The adapter reads supplied rows from common keys:

- `representativeExamples`
- `replyActivities`
- `gmailReplyActivities`
- `records`
- `rows`
- `items`
- `results`
- `data`

Each row can include:

- `messageId` or `gmailMessageId`
- `threadId` or `gmailThreadId`
- `from.email`, `fromEmail`, or an email in `from`
- `date` or `observedAt`
- `subject`
- `matchedNewsletterOrCampaign`
- `replyConfidence`
- `candidateType`
- `reasonCodes`
- `selectedHeaders`
- `redactedSnippet`

Only strong/medium human reply candidates become `gmail_reply_activity` signals.

## Output

The output includes:

- `signals`: compact engagement-preview input
- `replyActivities`: metadata-only traceability rows
- `skippedRecords`: weak, false-positive, or unusable rows with reasons
- `summary`: counts and safety flags

Recent accepted replies set `replies30d: 1` and `lastReplyAt`. Older accepted replies keep `lastReplyAt` but stay outside `replies30d`.

## Safety

This adapter is read-only:

- no Gmail API call,
- no credential read/print/rotation,
- no full email body export,
- no Gmail label/archive/delete/send,
- no CRM card mutation,
- no Fact Store write,
- no outbound message.

Email replies are high-signal relationship evidence, but they do not authorize outreach by themselves.

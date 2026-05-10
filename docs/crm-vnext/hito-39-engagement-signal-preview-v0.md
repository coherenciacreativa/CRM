# Hito 39: Engagement Signal Preview v0

Date: 2026-05-11

## What Changed

CRM vNext now has a read-only engagement preview layer.

Mantis can supply engagement snapshots from safe read-only searches and ask CRM vNext:

```text
If these MailerLite/Gmail/Instagram signals belong to these cards, how would warmth, stage, reasons, risks, and review queues move?
```

The new surfaces are:

```text
POST /api/crm-vnext/engagement-signal-preview
```

and:

```bash
npm run crm:vnext:engagement-signal-preview -- --signals-file <json>
```

## Why It Matters

This moves the project from "we can stitch contact cards" toward "the CRM can become alive."

After a card is stable, CRM vNext can now preview the effect of:

- campaign opens and clicks from MailerLite,
- email replies from Gmail,
- Instagram interaction snapshots,
- manual engagement observations.

That makes heat scoring inspectable before any automation acts on it.

## Output

The report includes:

- matched and unmatched engagement signals,
- before/after score summaries,
- deltas for priority, commercial warmth, community depth, relationship engagement, and data confidence,
- new reason and risk codes,
- internal queues such as `email_nurture_candidate`, `human_follow_up_review`, and `suppression_review`,
- `operationsExecuted: 0`.

## Safety

No cards were mutated.

No Fact Store write happened.

No MailerLite, Gmail, Instagram, ManyChat, Google Drive, Contacts, WhatsApp, Telegram, or credential call happened.

No outbound permission is implied by a warmed score. It only changes internal review priority.

## Next

The next useful layer is an engagement source adapter for Mantis:

```text
MailerLite/Gmail/Instagram read-only evidence -> engagement signals -> preview -> scoring policy review
```

That adapter should keep the same boundary: source helpers gather read-only snapshots, then CRM vNext computes the impact locally.

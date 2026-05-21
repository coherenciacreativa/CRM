# CRM vNext Scoring Policy v0

Date: 2026-05-21
Status: Implemented as typed policy contract

## Purpose

CRM vNext should not use one flat "heat" idea for every relationship.

The scoring model separates four dimensions:

| Dimension | Meaning | What it does not mean |
| --- | --- | --- |
| Commercial warmth | Near-term evidence that a person may be ready for a product, service, renewal, upgrade, or personal follow-up. | Permission to sell or contact automatically. |
| Community depth | Belonging, history, trust, and participation across classes, retreats, Encuentro Feliz, volunteer work, and long relationships. | Purchase intent. |
| Relationship engagement | Current two-way attention: replies, DMs, comments, thoughtful email responses, WhatsApp interaction, and fresh participation. | Product fit or correct timing by itself. |
| Data confidence | How safely the CRM can identify the person across email, Instagram, phone, location, and evidence sources. | Warmth. |

Composite priority is only an internal sorting aid:

```text
priorityScore =
  commercialWarmth * 0.42
  + communityDepth * 0.30
  + relationshipEngagement * 0.20
  + dataConfidence * 0.08
```

The policy lives in:

- `lib/crm/community-scoring-policy.ts`
- `lib/crm/community-scoring.ts`

## Source Impact Criteria

### ClassBot / Yoga / Recording Delivery

Primary meaning: continuity, care, retention, and yoga product fit.

- Commercial warmth: low
- Community depth: high
- Relationship engagement: medium
- Data confidence: medium

Interpretation:

An active ClassBot yoga student can be a deep community member without being more "commercially hot" than someone who just replied thoughtfully to an email. The next action should usually be care, continuity, attendance review, gratitude, or recording hygiene before any offer.

### Gmail / Newsletter Replies

Primary meaning: two-way relationship and possible intent.

- Commercial warmth: medium
- Community depth: medium
- Relationship engagement: high
- Data confidence: medium

Interpretation:

A thoughtful reply to a newsletter is a stronger live relationship signal than passive email opens. It becomes commercial warmth only when the reply content shows desire, pain, timing, or product interest.

### MailerLite Opens / Clicks / Subscriber Status

Primary meaning: reading history and topic interest.

- Commercial warmth: low
- Community depth: medium
- Relationship engagement: medium
- Data confidence: medium

Interpretation:

Open history is relationship memory. Clicks and recent repeated opens can raise review priority, but replies, DMs, purchases, or explicit product questions are stronger.

### Instagram Activity

Primary meaning: current social attention and conversation.

- Commercial warmth: medium
- Community depth: medium
- Relationship engagement: high
- Data confidence: medium

Interpretation:

DMs and comments are stronger than likes and story views. Story views are useful as repeated attention, especially when paired with DMs, comments, email replies, or product questions. Instagram UI or API source recovery should capture city/country when explicitly present in the conversation.

### Purchases / Payments / Shopify-like Commerce

Primary meaning: client history, fulfillment, retention, and product fit.

- Commercial warmth: high
- Community depth: high
- Relationship engagement: medium
- Data confidence: medium

Interpretation:

Recent purchase can support a care or retention action and may indicate fit for a complementary offer, but past spend alone must not become blanket upsell pressure.

### Human Context

Primary meaning: high-value memory from Alejandro, Juana, or Mantis.

- Commercial warmth: medium
- Community depth: high
- Relationship engagement: medium
- Data confidence: medium

Interpretation:

Human context should enter scoring only after it has been transformed into approved evidence/facts with provenance. Raw conversation should not silently change scores.

### Restricted Service Context

Primary meaning: real service relationship that needs privacy.

- Commercial warmth: restricted
- Community depth: medium
- Relationship engagement: restricted
- Data confidence: medium

Interpretation:

Therapy/psychotherapy context can confirm that a person is a client of a real service, but it must not drive automated outbound or casual summaries.

## Historical Reuse Decision

Use historical CRM/Instagram work as follows:

### Reuse as Core Infrastructure

- `lib/crm/community-scoring.ts`
- `lib/crm/community-scoring-policy.ts`
- `lib/crm/crm-vnext-signal-event-ledger.js`
- `lib/crm/crm-vnext-signal-event-projection.js`
- `scripts/crm-vnext-signal-event-pipeline.mts`
- `scripts/crm-vnext-mailerlite-engagement-signals.mjs`
- `scripts/crm-vnext-gmail-reply-engagement-signals.mjs`
- `scripts/crm-vnext-classbot-yoga-evidence.mjs`

### Reuse as Evidence / Operator Tools

- `scripts/crm-vnext-instagram-dm-ui-evidence.mjs`
- `docs/crm-vnext/instagram-dm-ui-evidence.md`
- `docs/crm-vnext/hito-43-instagram-dm-ui-stitching-fallback-v0.md`
- `docs/crm-vnext/hito-50-instagram-ui-location-capture-v0.md`
- `docs/crm-vnext/hito-61-official-flow-source-recovery-v0.md`

### Treat as Reference, Not Source of Truth

- `docs/ops/ig-assistant-playbook.md`
- `docs/ops/agents/RADAR.md`
- older campaign-specific ManyChat/Instagram automation notes

These older pieces contain useful business judgment, but CRM vNext should not revive old outbound behavior or campaign-specific loops without explicit review.

## Operator Rule

Mantis should read score movement as an internal prioritization signal.

A high score or warmed signal may justify:

- reviewing context,
- improving stitching,
- asking Alejandro a concise question,
- preparing a no-send decision brief,
- or recommending an approved human follow-up.

It never authorizes:

- Instagram messages,
- email replies,
- WhatsApp messages,
- ManyChat LIVE changes,
- credential changes,
- or automatic offers.

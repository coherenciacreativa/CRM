# Hito 75 - Next Best Action Policy v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added a shared operator-action policy:

- `lib/crm/community-next-best-action-policy.ts`
- `docs/crm-vnext/next-best-action-policy-v0.md`

Updated Engagement Movement Queue to use that shared policy instead of keeping its action routing hidden inside a local helper.

## Why It Matters

Scoring answers "what changed." Next Best Action answers "what should Mantis do with that change?"

The policy now distinguishes:

- identity work,
- risk/restricted review,
- reply context review,
- care/retention,
- social context review,
- warm-contact review,
- community invitation planning,
- observation.

The key behavioral guardrail:

```text
ClassBot/yoga participation
  -> care_or_retention
  -> not automatic commercial follow-up

Gmail/newsletter reply
  -> review_reply_context
  -> stronger live relationship signal than passive opens

MailerLite opens / light story views
  -> keep_observing_email
  -> not enough for a human follow-up decision by themselves
```

## Current Integration

The first integration point is:

- `lib/crm/crm-vnext-engagement-movement-queue.ts`

Rows can now carry richer operator decisions with:

- action code,
- category,
- review boundary,
- reason,
- signal policy ids,
- allowed internal actions,
- blocked actions until approval.

`engagement-decision-brief` also recognizes the new action codes.

## Safety

Read-only only:

- no outbound,
- no card writes,
- no Fact Store writes,
- no score mutation,
- no live source calls,
- no credential reads,
- no ManyChat/Instagram/MailerLite mutations.

Every operator action keeps outbound approval required.

## Validation

Covered by:

- `__tests__/community-next-best-action-policy.spec.ts`
- `__tests__/crm-vnext-engagement-movement-queue.spec.ts`
- `__tests__/crm-vnext-engagement-decision-brief.spec.ts`

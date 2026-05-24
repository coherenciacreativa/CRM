# Hito 81 - Omnichannel Coverage Push v0

Date: 2026-05-24
Status: Implemented

## Why

The strategic alignment report found the practical bottleneck: CRM vNext already has a large card store, but too few contacts are connected across both email and Instagram.

That weakens:

- identity stitching,
- MailerLite/Instagram score interpretation,
- future next-best-action recommendations,
- Mantis' ability to know whether a warm Instagram person is also an email subscriber or customer.

## Added

- `npm run crm:vnext:omnichannel-coverage-push`
- `lib/crm/crm-vnext-omnichannel-coverage-push.ts`
- `lib/crm/crm-vnext-omnichannel-coverage-push-markdown.ts`
- `scripts/crm-vnext-omnichannel-coverage-push.mjs`
- `docs/crm-vnext/omnichannel-coverage-push.md`

## Behavior

The planner reads the local vNext card store and builds two prioritized lanes:

```text
Instagram known, email missing
Email known, Instagram missing
```

It ranks candidates by:

- current CRM priority,
- source richness,
- official-flow / lead-capture evidence,
- relationship and product context,
- how much the missing bridge would improve data confidence.

It also suppresses email-to-Instagram work when existing evidence already says the person has no Instagram, so the planner does not recycle known dead ends.

It also generates a Mantis-ready prompt with specific read-only source lanes.

## Boundary

The command is a planner only.

It does not call live sources, read credentials, mutate person cards, write Fact Store, change scores, touch ManyChat LIVE, or send outbound messages.

## Product Decision

This is now the preferred next hito after Control Room when the question is:

```text
How do we raise useful email+Instagram coverage without drifting into broad repetitive stitching?
```

Mantis should return contact-keyed evidence. Card writes still require the normal approval path.

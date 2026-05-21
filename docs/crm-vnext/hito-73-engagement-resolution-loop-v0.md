# Hito 73 - Engagement Resolution Loop v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added an answer-ready loop on top of Engagement Decision Brief.

New surfaces:

- `GET /api/crm-vnext/engagement-resolution-loop`
- `npm run crm:vnext:engagement-resolution-loop`
- `lib/crm/crm-vnext-engagement-resolution-loop.ts`
- `lib/crm/crm-vnext-engagement-resolution-loop-markdown.ts`

Follow-up hardening:

- The loop now reads local card evidence, Fact Store, and context-fact apply ledger.
- Contacts with enough prior Alejandro/human context move to `contextCoveredItems`.
- Broad questions are suppressed for already-enriched cards; Mantis gets an internal signal-review instruction instead.

## Why It Matters

CRM vNext can now move from detected warmth to structured human context:

```text
signal -> movement -> decision brief -> Alejandro question -> response evidence -> fact proposal
```

This is the first small closed loop of the CRM dream: the system notices something, asks only the useful question, and routes the answer toward structured memory without sending anything or writing cards automatically.

The hardening matters because the loop now avoids asking Alejandro to repeat context he already gave. Recent engagement still matters, but the question becomes narrower: inspect the new signal, then escalate only if it changes the relationship picture or requires a future approved follow-up.

## Safety

Read-only only:

- no outbound,
- no CRM card writes,
- no Fact Store writes,
- no score mutation,
- no live source calls,
- no credential reads.

## Validation

Covered by `__tests__/crm-vnext-engagement-resolution-loop.spec.ts`.

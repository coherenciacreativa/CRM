# Hito 72 - Engagement Decision Brief v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added a no-send decision brief on top of the engagement movement queue.

New surfaces:

- `GET /api/crm-vnext/engagement-decision-brief`
- `npm run crm:vnext:engagement-decision-brief`
- `lib/crm/crm-vnext-engagement-decision-brief.ts`
- `lib/crm/crm-vnext-engagement-decision-brief-markdown.ts`

## Why It Matters

The movement queue shows who warmed. The decision brief turns that into a short operator surface:

- who Mantis should review,
- what question to ask Alejandro,
- what can be done internally,
- what remains blocked until explicit approval.

This keeps CRM vNext moving toward a living system without confusing warmth with permission to contact someone.

## Safety

Read-only only:

- no outbound,
- no CRM card writes,
- no Fact Store writes,
- no score mutation,
- no live source calls,
- no credential reads or rotations.

## Validation

Covered by `__tests__/crm-vnext-engagement-decision-brief.spec.ts`.


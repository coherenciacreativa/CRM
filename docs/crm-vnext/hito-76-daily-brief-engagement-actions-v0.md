# Hito 76 - Daily Brief Engagement Actions v0

Date: 2026-05-21
Status: Implemented

## What Changed

The CRM vNext Daily Brief now includes a compact summary of stored Engagement Movement Queue actions.

Touched surfaces:

- `lib/crm/community-daily-brief.ts`
- `lib/crm/community-daily-brief-markdown.ts`
- `pages/api/crm-vnext/community-daily-brief.ts`
- `pages/crm-vnext/daily-brief.tsx`
- `scripts/crm-vnext-daily-brief.mjs`

## Why It Matters

The scoring pipeline can now say more than "this person warmed up." The Daily Brief can show Mantis the safe internal action categories in one daily operating surface:

- keep observing passive email movement,
- review newsletter reply context,
- route unmatched engagement to stitching,
- prepare care/retention review for active participants.

This moves the CRM closer to the "living command center" without creating a second scoring lane or asking Alejandro redundant broad questions.

## Safety

The daily engagement summary reads only stored local movement history:

- no live MailerLite/Gmail/Instagram calls,
- no credential reads,
- no card writes,
- no Fact Store writes,
- no score mutation,
- no outbound messages.

The engagement action section is routing guidance only. It is not permission to contact anyone.

## Operator Rule

Use `GET /api/crm-vnext/community-daily-brief`, `/crm-vnext/daily-brief`, or `npm run crm:vnext:daily-brief` as the first daily CRM read.

If engagement actions include:

- `review_reply_context`: inspect the engagement resolution loop before asking Alejandro.
- `stitch_identity`: resolve identity before using the signal.
- `care_or_retention`: prepare internal care notes; outbound still needs explicit approval.
- `keep_observing_email`: observe unless stronger relationship/commercial signals appear.

## Validation

Covered by:

- `__tests__/community-daily-brief.spec.ts`
- `__tests__/community-daily-brief-markdown.spec.ts`
- `__tests__/community-daily-brief-api.spec.ts`
- `__tests__/operator-capabilities.spec.ts`

# Hito 8 - Multi-Service Card Proposal v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Multi-Service Card Proposal v0 is a read-only proposal layer between Identity Stitching Research and any future card write path.

It takes a conversational CRM report, researches local identity candidates, and returns a card plan that preserves all service relationships together.

## Why It Matters

Alejandro clarified that many people in the community are not one-dimensional CRM records.

For example, Juan Jose can be:

- client/student in yoga classes,
- retreat client/attendee,
- therapy consultation client/patient,
- friend, ally, and consultant context.

This hito prevents the CRM from choosing one category and losing the rest.

## New Surfaces

- `lib/crm/crm-vnext-multi-service-card-proposal.ts`
- `POST /api/crm-vnext/multi-service-card-proposal`
- `/crm-vnext/multi-service-card-proposal`
- `npm run crm:vnext:multi-service-card-proposal`

## Real Batch Learning

For the Juan Jose + Mayerli batch:

- Juan Jose resolves to a strong local Mailer bridge candidate, `juanjotru@gmail.com`, and receives one multi-service proposal with yoga, retreats, and restricted therapy consultation context.
- `@mayuyis2626` / Mayerli receives a new-card-from-stable-identity proposal with yoga and retreats preserved together.

## Guardrails

- No card mutation.
- No Fact Store write.
- No external channels.
- No live MailerLite/Instagram/ManyChat/WhatsApp/Telegram/Gmail calls.
- No credential reads.
- No local filesystem paths in API responses.
- Therapy service context is restricted and cannot drive outbound without human review.

## Verification

- `npm test`: passing with new unit and API coverage.
- `npm run build`: passing, including `/api/crm-vnext/multi-service-card-proposal` and `/crm-vnext/multi-service-card-proposal`.
- Real batch smoke returned 2 proposals, both multi-service, with Juan Jose marked for restricted service review.

## Next Decision

The next meaningful hito is not another parser tweak. It is the first reviewed apply policy:

- who can approve new card creation,
- when a Mailer bridge candidate can seed a real card,
- whether restricted therapy service context is visible only to Alejandro/Mantis,
- and whether local card writes should remain manual or become an explicit approved job.

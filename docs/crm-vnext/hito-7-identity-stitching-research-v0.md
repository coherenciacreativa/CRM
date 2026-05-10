# Hito 7 - Identity Stitching Research v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Identity Stitching Research v0 is a read-only research layer for unmatched or incomplete identity clues.

It takes conversational CRM reports and searches:

- local person cards,
- local MailerLite/IG bridge enriched export.

It returns candidate identities, match reasons, confidence, and a recommendation.

## Why It Matters

Activation Run showed that the CRM can parse real facts, but not every person already exists in the 728 current cards.

This hito makes the system proactive: instead of asking Alejandro immediately for missing identifiers, Mantis can inspect local evidence first.

## New Surfaces

- `lib/crm/crm-vnext-identity-stitching-research.ts`
- `POST /api/crm-vnext/identity-stitching-research`
- `/crm-vnext/identity-stitching-research`
- `npm run crm:vnext:identity-stitching-research`

## Real Batch Learning

The real two-contact batch revealed:

- Juan Jose Trujillo has a strong local MailerLite/bridge candidate:
  - `juanjotru@gmail.com`
  - Juan Jose / trujillo
  - labels including Estudiantes, Consejeros, Asistentes a retiros, Aliados importantes, Amigos de la Fundacion, Medellin.
- `@mayuyis2626` / Mayerli has a stable Instagram identity but no current local card or Mailer bridge candidate in v0 sources, so she is a new-card candidate.

## Privacy Policy Applied

"Paciente de psicologia" is treated as restricted service/customer context, not as a discarded or unusable fact.

The CRM can use it internally for service history and care continuity, but not for automated outbound copy or public segmentation.

## Guardrails

- No card mutation.
- No Fact Store write.
- No external channels.
- No live MailerLite/Instagram/ManyChat/WhatsApp/Telegram/Gmail calls.
- No credential reads.
- No local filesystem paths in API responses.
- Weak candidates never authorize automatic stitching.

## Verification

- `npm test`: 49 files / 167 tests passing.
- `npm run build`: passing, including `/api/crm-vnext/identity-stitching-research` and `/crm-vnext/identity-stitching-research`.
- Real batch smoke returned 2 clues, 1 strong Mailer bridge candidate, 1 new-card candidate, and no local path leakage.
- Local UI route returned 200 and includes the research surface copy.

## Next Decision

After a few more real cases, define the first card creation/stitching policy:

- when to create a new card,
- when to merge MailerLite candidate into a card,
- when to ask Alejandro,
- which restricted fields require special visibility rules.

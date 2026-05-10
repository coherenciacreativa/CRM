# Hito 9 - Deep Local Stitching v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Deep Local Stitching v0 is a read-only local memory search layer.

It runs after Identity Stitching Research and before card creation proposals when a contact appears to be new.

## Why It Matters

Alejandro pointed out that `@mayuyis2626` / Mayerli probably exists somewhere else on the computer.

That was right.

The previous recommendation to create a new card was only true inside a narrow search perimeter. This hito expands the perimeter to configured safe local memory and can now defer new-card creation when older evidence exists.

## New Surfaces

- `lib/crm/crm-vnext-deep-local-stitching.ts`
- `POST /api/crm-vnext/deep-local-stitching`
- `/crm-vnext/deep-local-stitching`
- `npm run crm:vnext:deep-local-stitching`

## Real Batch Learning

For Mayerli, the system found local Telegram coordination memory:

```text
Juana reporta que Mayerli y su esposo no podrán asistir al retiro por cruce con otro evento.
```

That is not enough to mutate a card, but it is enough to stop treating the case as clean new-card creation.

New operational recommendation:

```text
defer_new_card_creation
```

## Guardrails

- No card mutation.
- No Fact Store write.
- No external channels.
- No live MailerLite/Instagram/ManyChat/WhatsApp/Telegram/Gmail calls.
- No credential reads.
- No absolute local filesystem paths in API responses.
- Local snippets are review evidence, not final truth.

## Verification

- `npm test`: passing with unit and API coverage.
- `npm run build`: passing, including `/api/crm-vnext/deep-local-stitching` and `/crm-vnext/deep-local-stitching`.
- Real Mayerli smoke found local memory evidence and deferred new-card creation.

## Next Decision

Next useful hito: use Deep Local Stitching evidence inside the card proposal layer, so the proposal itself can say:

- "create new card",
- "create but attach local evidence",
- or "do not create yet; review local evidence first."

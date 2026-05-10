# Legacy Person Card V1 Adapter

Date: 2026-05-08
Status: Implemented as pure local adapter

## Purpose

The CRM Memory Fabric already has generated Person Cards V1. CRM vNext should not discard that work. The adapter maps V1 cards into the Person Card vNext contract so Mantis and the dashboard can begin reading one shape while ingestion sources mature.

This is a local translation layer only. It does not read credentials, touch ManyChat, call Instagram, call MailerLite, or send messages.

## Source Shape

V1 cards currently include:

- `personId`
- `identities.igHandle`
- `identities.email`
- `channels.instagram`
- `channels.email`
- `engagement.ig.stage`
- `engagement.ig.lastLeadAt`
- `engagement.ig.fromIgApi`
- `engagement.ig.fromUiSignals`
- `engagement.email.opens30d`
- `engagement.email.clicks30d`
- `engagement.email.lastOpenAt`
- `engagement.email.lastClickAt`
- `lifecycleStageGuess`
- `priorityScore`
- `confidence`
- `updatedAt`
- `evidence`

## Mapping

- V1 `personId` remains the stable `personId`.
- V1 `identities.email` and `identities.igHandle` become vNext trusted identities.
- V1 `lifecycleStageGuess` becomes the existing stage hint.
- V1 email opens/clicks/recency become vNext email scoring inputs.
- V1 IG stage/API/UI presence/recency become conservative vNext IG inputs.
- V1 `confidence` is converted into a coarse trusted-match/source boost.
- V1 evidence strings become structured evidence rows.

## Safety

- Unknown or malformed stages are ignored instead of promoted.
- Missing identity keeps `dataConfidence` low.
- Direct follow-up recommendations still require human review.
- The adapter is deterministic and covered by tests.

## Next Use

The next safe build step is to expose a local/internal API or dashboard loader that reads a generated V1 payload and returns vNext cards, starting with redacted/internal-only views.

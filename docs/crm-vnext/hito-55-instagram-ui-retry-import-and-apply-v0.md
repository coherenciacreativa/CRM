# Hito 55 - Instagram UI Retry Import and Apply v0

Date: 2026-05-15
Status: Implemented and used on real evidence

## Why

After the Human-Unblock Retry Rule, Mantis produced a new Instagram Messages UI retry report shape:

`mantis.crm_vnext.stitching_batch_instagram_ui_complement_retry.v1`

That report includes fields such as `recoveredHandle`, `threadDisplayName`, `compactContext`, `recommendedActionAfterInstagramUi`, discarded candidates, and structured `locationEvidence`.

CRM vNext needed to ingest that shape without hand-copying evidence.

## What Changed

`scripts/crm-vnext-mantis-evidence-import.mjs` now understands the retry schema and maps it into the existing safe import contract:

- `recoveredHandle` -> Instagram handle,
- `threadDisplayName` / `label` -> candidate name,
- `email:<address>` contact keys -> candidate email,
- `recoveredPhone` -> candidate phone,
- `locationEvidence.city` / `country` -> structured location,
- `locationEvidence.sourceText` -> evidence text,
- `compactContext` -> thread context,
- `recommendedActionAfterInstagramUi` -> recommended next step,
- discarded candidate `label` fields -> review-only discarded-candidate evidence.

## Real Application

Alejandro approved applying:

- Santiago Bernal handle,
- Gabriel Rojas stronger self-location evidence.

Local-only writes performed:

- Santiago Bernal `email:santiagobernal676@gmail.com` now has Instagram handle `santiagobernal676`.
- Santiago received appended evidence from the Instagram UI retry.
- Gabriel `ig:gabrielrojas_r` kept `Iquique, Chile` and received appended evidence containing the explicit self-location line from Instagram UI.

## Safety

No outbound messages were sent.

No Fact Store, ManyChat LIVE, MailerLite, Gmail, Drive, Contacts, Instagram state, credentials, follows, reactions, or messages were touched.

Only local CRM vNext card-store/ledger writes were performed after Alejandro approval, with backups.

## Validation

- `npm test -- __tests__/crm-vnext-mantis-evidence-import-script.spec.ts`
- `npm run crm:vnext:readiness`

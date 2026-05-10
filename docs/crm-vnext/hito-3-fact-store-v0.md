# Hito 3 - Fact Store v0

Date: 2026-05-09
Status: implemented for local approved fact storage

## What Changed

Hito 3 adds a local append-only fact ledger. This lets Mantis/Alejandro/Juana move from "preview facts" to "store approved facts" without touching live person cards.

## New Route

- `/crm-vnext/fact-store`

## New API

- `GET /api/crm-vnext/fact-store`
- `POST /api/crm-vnext/fact-store`

## New Command

```bash
npm run crm:vnext:fact-store
```

Append preview:

```bash
npm run crm:vnext:fact-store -- \
  --source-kind telegram_human_report \
  --reporter Juana \
  --channel telegram \
  --text "CRM: Ana Gomez es estudiante de yoga."
```

Commit locally:

```bash
npm run crm:vnext:fact-store -- \
  --write \
  --approved-by Alejandro \
  --source-kind telegram_human_report \
  --reporter Juana \
  --channel telegram \
  --text "CRM: @mariana_luz esta interesada en mentoria 1:1."
```

## What It Stores

Each stored row includes:

- original `factId`
- source kind, reporter, channel
- evidence text
- person hints
- fact type
- suggested card tags/scoring hints
- approval metadata
- card-apply readiness

## What It Does Not Do

- No person-card mutation.
- No outbound messages.
- No MailerLite calls.
- No Instagram calls.
- No credential reads.

## Stop Rule

This hito stops before identity matching and card rebuild. Stored facts are now available as evidence, but cards still remain untouched.

Next recommended hito: `Identity Review Queue + Card Rebuild Preview`.

# Hito 4 - Identity Review + Card Rebuild Preview

Date: 2026-05-09
Status: implemented as read-only preview

## What Changed

Hito 4 adds the bridge between stored facts and person cards. The system can now review approved facts, find candidate local cards, and preview what could be added later without changing any card.

## New Route

- `/crm-vnext/identity-review`

## New API

- `GET /api/crm-vnext/identity-review`

## New Command

```bash
npm run crm:vnext:identity-review
```

Strict automation mode:

```bash
npm run crm:vnext:identity-review -- --fail-on-review
```

## What It Produces

Each review item includes:

- stored fact id and original fact id
- review status
- reason
- candidate person cards
- match reasons and confidence
- rebuild preview when exactly one stable match is safe

## What It Does Not Do

- No card mutation.
- No write to the Fact Store.
- No external channel.
- No Instagram, MailerLite, ManyChat, WhatsApp, Telegram, or credential action.

## Stop Rule

This hito stops at preview. The next hito should create a reviewed card rebuild artifact or dry-run diff, still without applying it to canonical person cards until Alejandro approves that write policy.

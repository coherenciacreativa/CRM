# Hito 5 - Card Rebuild Diff v0

Date: 2026-05-09
Status: implemented as read-only sprint closeout layer

## What Changed

Hito 5 adds the first explicit before/after diff for person-card enrichment.

The CRM can now move from:

1. conversational fact,
2. approved local fact,
3. identity-reviewed fact,
4. to a card-level change proposal.

No card is written yet.

## New Route

- `/crm-vnext/card-rebuild-diff`

## New API

- `GET /api/crm-vnext/card-rebuild-diff`

## New Command

```bash
npm run crm:vnext:card-rebuild-diff
```

Strict automation mode:

```bash
npm run crm:vnext:card-rebuild-diff -- --fail-on-blocked
```

## What It Produces

Each diff includes:

- target person id and display name
- source fact ids
- current card summary
- proposed evidence additions
- proposed future tags
- proposed product/scoring increments
- operation list
- blocked review items kept out of the diff

## Stop Rule

This hito intentionally stops the autonomous sprint. The next step is not more blind building; it is a human/product decision:

- approve a write policy for reviewed card rebuilds,
- or inspect the internal console with real facts first,
- or move priority to MailerLite/Instagram ingestion.

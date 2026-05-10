# CRM vNext Card Rebuild Diff

Date: 2026-05-09
Status: v0 read-only diff

## Purpose

Card Rebuild Diff turns ready Identity Review items into a before/after proposal for person cards.

It answers: "If we applied the approved and identity-matched facts, exactly what would change on each card?"

## Surfaces

- Browser route: `/crm-vnext/card-rebuild-diff`
- API: `GET /api/crm-vnext/card-rebuild-diff`
- CLI:

```bash
npm run crm:vnext:card-rebuild-diff
npm run crm:vnext:card-rebuild-diff -- --limit 25
npm run crm:vnext:card-rebuild-diff -- --fail-on-blocked
```

## What It Shows

For each card with ready facts:

- current stage, priority score, next action, and product counters
- evidence that would be appended
- tags that would be available to future card/profile layers
- product counter increments, such as yoga attendance or purchase count
- scoring hints to merge in a later reviewed rebuild
- blocked facts that were excluded from the diff

## What It Does Not Do

- No person-card write.
- No canonical rebuild.
- No Fact Store write.
- No external API call.
- No outbound channel.
- No credential read or refresh.

## Operator Rule

This is a decision surface, not a mutation surface. Mantis can show Alejandro or the team what would change, but the next write path requires an explicit policy decision.

For a one-batch activation preview, use `/crm-vnext/activation-run` or:

```bash
npm run crm:vnext:activation-run -- --text "CRM: @ana_yoga es estudiante de yoga."
```

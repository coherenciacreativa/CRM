# CRM vNext Fact Store

Date: 2026-05-09
Status: v0 local append ledger

## Purpose

Fact Store persists approved CRM facts locally without applying them to person cards.

It is the evidence shelf between conversational intake and future card rebuilds. Fact Intake answers "what did this message mean?" Fact Store answers "what approved facts are now part of CRM memory?"

## Surfaces

- Browser route: `/crm-vnext/fact-store`
- API:
  - `GET /api/crm-vnext/fact-store`
  - `POST /api/crm-vnext/fact-store`
- CLI:

```bash
npm run crm:vnext:fact-store
npm run crm:vnext:fact-store -- --text "CRM: @mariana_luz esta interesada en mentoria 1:1."
npm run crm:vnext:fact-store -- --write --approved-by Alejandro --source-kind telegram_human_report --reporter Juana --channel telegram --text "CRM: @mariana_luz esta interesada en mentoria 1:1."
```

## Storage

Default path:

```text
.crm-vnext/fact-store/facts.jsonl
```

This path is intentionally gitignored through `.crm-vnext/` because it is local operational memory and may contain private community data.

## Safety

- Local only.
- Requires `approvedBy` when `commit=true`.
- Dedupes by `factId`.
- Does not mutate person cards.
- Does not call external APIs.
- Does not send messages.
- Does not read or modify credentials.

## Readiness

Stored facts have a `cardApply` status:

- `ready`: stable enough for a future reviewed card rebuild.
- `needs_review`: should stay in review because identity or business meaning is not stable enough yet.

Examples:

- A fact with an Instagram handle can often be `ready`.
- A fact with only a name like "Ana Gomez" is stored but marked `needs_review` until identity matching is resolved.

## Downstream Path

The next safe layer is Identity Review, not automatic card mutation:

1. Read stored facts.
2. Match them to candidate person cards.
3. Surface ambiguous matches.
4. Preview card changes.
5. Only then apply a reviewed rebuild.

Current route: `/crm-vnext/identity-review`.

For first real batches, prefer Activation Run:

```bash
npm run crm:vnext:activation-run -- --text "CRM: @ana_yoga es estudiante de yoga."
```

It chains Fact Intake, optional Fact Store append, Identity Review, and Card Rebuild Diff in one report.

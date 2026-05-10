# CRM vNext Fact Intake

Date: 2026-05-09
Status: v0 dry-run

## Purpose

Fact intake turns a human or system report into structured CRM facts before any person card is changed.

Examples:

```text
CRM: Ana Gomez y Carlos Diaz son estudiantes de yoga en el programa mensual de mayo.
CRM: Laura Perez asistio al retiro de Barichara.
CRM: @mariana_luz esta interesada en mentoria 1:1.
```

The output is a dry-run draft with people, fact types, source, confidence, evidence text, suggested tags, scoring hints, and review flags.

## Surfaces

- Browser route: `/crm-vnext/fact-intake`
- API: `POST /api/crm-vnext/fact-intake`
- Follow-up store route: `/crm-vnext/fact-store`
- CLI:

```bash
npm run crm:vnext:fact-intake -- \
  --source-kind telegram_human_report \
  --reporter Juana \
  --channel telegram \
  --text "CRM: Ana Gomez es estudiante de yoga."
```

## Supported Source Kinds

- `alejandro_conversation`
- `telegram_human_report`
- `mailerlite_tag_snapshot`
- `instagram_signal`
- `manual_import`
- `unknown`

## Supported Fact Types

- `program_participation`
- `retreat_attendance`
- `community_event_attendance`
- `expressed_interest`
- `client_status`
- `purchase`
- `identity_update`
- `note`

## Safety

- Dry-run only.
- No person-card mutation.
- No message delivery.
- Ambiguous people remain reviewable.
- Purchase/client facts require review by default.

## Future Write Path

The staged write path is:

1. Receive text or source signal.
2. Create a fact draft.
3. Match identity candidates.
4. Put ambiguities in a review queue.
5. Persist approved facts to the local fact store.
6. Rebuild person cards from facts and source snapshots only after a reviewed preview exists.

The card should stay a living view. The facts should be the evidence layer behind it.

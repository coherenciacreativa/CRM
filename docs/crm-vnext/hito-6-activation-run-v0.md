# Hito 6 - Activation Run v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

Activation Run v0 is the first safe end-to-end CRM vNext circuit:

```text
human/source report -> Fact Intake -> Fact Store preview/commit -> Identity Review -> Card Rebuild Diff
```

This lets Alejandro or Mantis test a real mini-batch of community facts without manually walking through every layer.

## Why It Matters

The CRM vision requires a living intake system: Juana can report a retreat attendance, Alejandro can tell Mantis that someone joined yoga, MailerLite can later surface tags, and the CRM should translate those signals into auditable facts and proposed card enrichments.

Activation Run is the first version of that operating loop.

## New Surfaces

- `lib/crm/crm-vnext-activation-run.ts`
- `POST /api/crm-vnext/activation-run`
- `/crm-vnext/activation-run`
- `npm run crm:vnext:activation-run`

## Guardrails

- Dry-run by default.
- Fact Store write requires `commit=true` and `approvedBy`.
- Person cards are never mutated.
- No outbound channels are called.
- No credentials or platform permissions are touched.
- Local paths are redacted from API responses.

## Verification

- `npm test`: 47 files / 161 tests passing.
- `npm run build`: passing, including `/api/crm-vnext/activation-run` and `/crm-vnext/activation-run`.
- Local API smoke with a matched handle produced 1 ready fact, 1 card diff, and 5 proposed operations.
- Browser smoke confirmed the UI loads and the dry-run preview works.

## First Real Test Batch

Ask Alejandro for 10-20 low-risk real facts, one per line, such as:

```text
CRM: @handle es estudiante de yoga.
CRM: nombre@example.com asistio a Mi Encuentro Feliz.
CRM: Nombre Apellido asistio al retiro X.
CRM: @handle esta interesada en mentoria 1:1.
```

Avoid payment details, health notes, private therapeutic content, or sensitive retreat logistics in the first batch.

## Next Decision After This Hito

Once the dry-run report looks right, Alejandro can approve committing those facts to the local Fact Store.

The next later policy decision is separate: whether and how CRM vNext may write rebuilt person cards. That decision is not included in this hito.

# CRM vNext Activation Run

Date: 2026-05-10
Status: v0 safe local activation circuit

## Purpose

Activation Run is the first end-to-end operator circuit for a real fact batch.

It takes a short report from Alejandro, Juana, Mantis, MailerLite tags, or another trusted source and runs it through:

1. Fact Intake
2. Fact Store append preview, or explicit local commit
3. Identity Review
4. Card Rebuild Diff

The default mode is dry-run. It does not mutate person cards and does not send messages.

## Surfaces

- Browser route: `/crm-vnext/activation-run`
- API: `POST /api/crm-vnext/activation-run`
- CLI:

```bash
npm run crm:vnext:activation-run -- --text "CRM: @ana_yoga es estudiante de yoga."
npm run crm:vnext:activation-run -- --source-kind telegram_human_report --reporter Juana --channel telegram --text "CRM: @ana_yoga es estudiante de yoga."
```

Committed Fact Store writes require explicit flags:

```bash
npm run crm:vnext:activation-run -- --write --approved-by Alejandro --text "CRM: @ana_yoga es estudiante de yoga."
```

## Input Format

Keep each fact on its own line when possible:

```text
CRM: @handle es estudiante de yoga.
CRM: nombre@example.com asistio a Mi Encuentro Feliz.
CRM: Nombre Apellido asistio al retiro Batir Alas.
CRM: @handle esta interesada en mentoria 1:1.
```

Activation Run accepts imperfect text, but stable identifiers are stronger than names:

- best: email, Instagram handle, phone, or known person id
- usable with review: full name
- weak: first name only or generic "una persona"

## Response Shape

```json
{
  "ok": true,
  "source": {
    "kind": "legacy-person-cards-v1",
    "generatedAt": "2026-05-10T12:00:00.000Z",
    "cards": 728
  },
  "activation": {
    "schemaVersion": "crm-vnext-activation-run-2026-05-10",
    "mode": "dry_run_activation_run",
    "committed": false,
    "summary": {
      "factsParsed": 1,
      "factsAdded": 1,
      "readyForPreview": 1,
      "blockedFacts": 0,
      "cardsWithDiffs": 1
    },
    "nextSteps": []
  }
}
```

The response excludes local filesystem paths and secret values.

## Safety

- Default dry-run.
- Commit writes only approved facts to the local Fact Store.
- No person-card mutation.
- No Telegram, Instagram, WhatsApp, email, or ManyChat send.
- No Instagram, MailerLite, ManyChat, WhatsApp, or Telegram API calls.
- No credential read, refresh, or permission change.

## Operator Rule

Mantis can use Activation Run when Alejandro or Juana reports facts conversationally.

If the report produces blocked facts, Mantis should ask for identity or business clarification before any future card write policy. If the report produces clean diffs, Mantis can show the proposed changes to Alejandro, but still cannot mutate person cards until a separate write policy exists.

When blocked facts are caused by unmatched or name-only people, the next safe surface is Identity Stitching Research:

```bash
npm run crm:vnext:identity-stitching-research -- --text "CRM: Juan Jose Trujillo es estudiante de yoga."
```

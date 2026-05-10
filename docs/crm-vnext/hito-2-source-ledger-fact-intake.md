# Hito 2 - Source Ledger + Fact Intake v0

Date: 2026-05-09
Status: implemented for local dry-run

## What Changed

Hito 2 adds the first "living CRM" layer:

- A source ledger that tracks local source freshness, coverage, trust, and blocked paths.
- A dry-run fact intake parser for Alejandro/Juana/Mantis reports.
- Browser pages for both surfaces.
- Internal APIs and CLI commands for Mantis.
- Tests for contracts, API safety, and path redaction.

## New Routes

- `/crm-vnext/sources`
- `/crm-vnext/fact-intake`
- `/api/crm-vnext/source-ledger`
- `/api/crm-vnext/fact-intake`

## New Commands

```bash
npm run crm:vnext:source-ledger
npm run crm:vnext:source-ledger -- --expected-mailerlite-contacts 1000
npm run crm:vnext:fact-intake -- --source-kind telegram_human_report --reporter Juana --channel telegram --text "CRM: Ana Gomez es estudiante de yoga."
```

## What This Enables

Mantis can now preview signals from:

- Alejandro conversational reports.
- Juana/human-assistant Telegram reports.
- MailerLite tag snapshots.
- Manual imports.
- Future Instagram signals.

The system turns those signals into facts such as:

- student in yoga
- retreat attendee
- Mi Encuentro Feliz attendee
- interested in mentorship/therapy/retreats
- customer/client status
- purchase signal
- identity update

## What This Does Not Do Yet

- It does not persist facts.
- It does not update person cards.
- It does not call MailerLite or Instagram.
- It does not read credentials.
- It does not send external messages.

## Why This Is The Right Next Step

The CRM is moving from "dashboard over snapshots" toward "evidence-backed community memory."

Before allowing Mantis to update cards conversationally, the system needs a structured, auditable staging layer. This hito creates that staging layer.

## Stop Rule

Next expansion should stop before persistence unless a reviewed write contract exists. The next sub-hito should be `Fact Store v0` or `MailerLite read-only reconciliation`, not live mutation.

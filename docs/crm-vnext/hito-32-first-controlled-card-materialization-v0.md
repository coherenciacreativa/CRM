# Hito 32: First Controlled Card Materialization v0

Date: 2026-05-10

## What Changed

CRM vNext now has its first real local card-store materialization from Alejandro-approved contact facts.

The approved batch wrote six local vNext cards into:

- `.crm-vnext/person-card-store/person-cards-vnext.json`
- `.crm-vnext/card-write-apply/ledger.jsonl`

The local read surfaces now prefer that vNext card store when it exists, while preserving explicit legacy-source overrides for tests and controlled analysis.

Updated read surfaces:

- `/crm-vnext`
- `/crm-vnext/people`
- `/crm-vnext/person/[personId]`
- `/crm-vnext/queues`
- `/crm-vnext/daily-brief`
- `GET /api/crm-vnext/community-insights`
- `GET /api/crm-vnext/community-queues`
- `GET /api/crm-vnext/community-daily-brief`
- `GET /api/crm-vnext/community-queue-brief`
- `GET /api/crm-vnext/community-decision-brief`
- `GET /api/crm-vnext/person-card`
- `GET /api/crm-vnext/readiness`

## Applied Cards

Committed local upserts:

- Adriana Bernal: `email:adrianabv86@hotmail.com`
- Amalia de Bedud: `email:amaliadbg@hotmail.com`
- Lina Maria Bernal: `email:bernallinamaria592@gmail.com`
- Natalia Cardenas de Bedut: `email:ncardenasdb@gmail.com`
- Eliana Cadavid: `email:eli.cadavid@hotmail.com`, Instagram `cadavid_eli`, phone `+573104954266`
- Luis Enrique Lopera: `email:luis.e.lopera@gmail.com`

Juan Jose Trujillo was staged for merge review against `email:juanjotru@gmail.com` instead of auto-merged.

Santiago Bernal was intentionally left out of this first apply batch because the known email was old/protection context and needs stronger current identity evidence.

## Store Result

Local vNext store after commit:

- cards: 734
- base cards before apply: 728
- merge review queue: 1
- provenance records: 7
- backup created before write

## Safety

Still prohibited:

- outbound messages,
- Fact Store writes from this step,
- live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram API calls,
- credential reads or rotations,
- automatic merges.

Committed writes required explicit approval and wrote only local ignored `.crm-vnext` artifacts.

## Verification

Passed:

```bash
npm test
npm run build
```

Smoke checks:

- `GET /api/crm-vnext/person-card?personId=email%3Aeli.cadavid%40hotmail.com`
- `GET /api/crm-vnext/community-insights?topLimit=1`
- `GET /api/crm-vnext/community-queues`
- `GET /api/crm-vnext/readiness`

All returned `source.kind=vnext-person-card-store` and `cards=734`.

Browser verification:

- `/crm-vnext/people?q=Eliana`
- `/crm-vnext/person/email%3Aeli.cadavid%40hotmail.com`

Both loaded Eliana from the vNext store with no error state.

## Why It Matters

This is the first closed loop from:

```text
conversation -> evidence -> review -> approval -> local card store -> dashboard/API visibility
```

Mantis can now inspect newly materialized cards through the same internal dashboard and exact person-card APIs instead of relying on a separate preview artifact.

The next logical milestone is a controlled merge-review resolver for staged records like Juan Jose, followed by a larger batch of current students and community contacts.

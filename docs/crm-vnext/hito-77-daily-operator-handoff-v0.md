# Hito 77 - Daily Operator Handoff v0

Date: 2026-05-21
Status: Implemented

## What Changed

Added a read-only dispatcher that turns the Daily Brief into an ordered Mantis operating list:

- `lib/crm/crm-vnext-daily-operator-handoff.ts`
- `lib/crm/crm-vnext-daily-operator-handoff-markdown.ts`
- `pages/api/crm-vnext/daily-operator-handoff.ts`
- `scripts/crm-vnext-daily-operator-handoff.mjs`
- `docs/crm-vnext/daily-operator-handoff.md`

## Why It Matters

The CRM now has an intermediate layer between "we measured signals" and "what should Mantis do today?"

It can say:

- prepare a no-send decision brief for notify queues,
- ask compact engagement-context questions only when needed,
- avoid redundant broad questions when human context already exists,
- keep passive email/social signals quiet,
- route identity problems to stitching before using engagement.

## Safety

The handoff is local/read-only:

- no live source calls,
- no outbound,
- no CRM writes,
- no Fact Store writes,
- no score mutation,
- no credential reads.

## Validation

Covered by:

- `__tests__/crm-vnext-daily-operator-handoff.spec.ts`
- `__tests__/operator-capabilities.spec.ts`

The real handoff report should be written to `~/Documents/Mantis-Reports` when used operationally.

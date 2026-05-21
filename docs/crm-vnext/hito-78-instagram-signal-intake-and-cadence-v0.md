# Hito 78 - Instagram Signal Intake + Cadence Policy v0

Date: 2026-05-21
Status: Implemented

## Why

Alejandro asked whether it makes sense to run the engagement loop daily while Instagram is the most active channel and not yet fully wired.

Decision: keep daily CRM automation as a quiet infrastructure pulse, and run intelligence/decision loops only when new signal packets arrive.

## Added

- `npm run crm:vnext:instagram-signal-events`
- `lib/crm/crm-vnext-instagram-signal-events.js`
- `scripts/crm-vnext-instagram-signal-events.mjs`
- `docs/crm-vnext/instagram-signal-events.md`
- `docs/crm-vnext/operator-cadence-policy.md`

## Behavior

The new Instagram adapter converts supplied read-only observations into canonical Signal Event Ledger records:

- DMs,
- comments,
- likes,
- story views,
- follows,
- aggregate Instagram engagement snapshots.

Those events can then enter the existing source-to-score pipeline through:

```bash
npm run crm:vnext:signal-event-pipeline -- --events-file <json>
```

## Boundary

The adapter does not open Instagram, call live APIs, read credentials, send DMs, mutate cards, write Fact Store, mutate ManyChat LIVE, or change scores.

It only makes Instagram observations compatible with the existing Signal Event Ledger / Projection / Engagement Preview architecture.

## Cadence Rule

Daily:

- snapshot,
- health/readiness,
- quiet operator pulse,
- failure/blocker alerts.

Delta-triggered:

- engagement movement queue,
- engagement decision brief,
- engagement resolution questions,
- any human-question loop.

This prevents the CRM from asking Alejandro repetitive questions while the highest-volume channel is still not fully ingested.

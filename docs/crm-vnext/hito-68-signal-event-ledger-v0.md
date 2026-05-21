# Hito 68 - Signal Event Ledger v0

Date: 2026-05-21
Status: Implemented

## What Changed

CRM vNext now has a canonical local ledger for activity-shaped observations:

- `lib/crm/crm-vnext-signal-event-ledger.js`
- `npm run crm:vnext:signal-event-ledger`
- `.crm-vnext/signal-events/ledger.jsonl`
- `docs/crm-vnext/signal-event-ledger.md`
- `docs/crm-vnext/source-of-truth-map.md`
- tests for normalization, safety, append, read, duplicate skipping, and approval requirement

## Why It Matters

The CRM was already strong at stitching cards and storing approved facts, but the next stage needs a stable place for living signals:

- MailerLite opens/clicks,
- Gmail newsletter replies,
- Instagram DMs/comments/likes/story views,
- ClassBot attendance or recording delivery,
- human/operator observations that are events rather than durable facts.

Before this hito, those observations could be previewed as score movement, but there was no canonical event shelf beneath the scoring layer.

Now the system can preserve "what happened" before deciding "what it means."

## New Architecture Boundary

This hito makes the source-of-truth map explicit:

- local vNext card store = current consolidated person cards,
- Fact Store = approved durable facts,
- Signal Event Ledger = observed events and engagement/activity snapshots,
- Engagement Snapshot Ledger = reviewed score movement,
- legacy Supabase/ManyChat infrastructure = source/import lane or future backend candidate, not current vNext authority.

## Command

Preview normalization:

```bash
npm run crm:vnext:signal-event-ledger -- \
  --events-file <signals-or-events.json>
```

Commit after approval:

```bash
npm run crm:vnext:signal-event-ledger -- \
  --events-file <signals-or-events.json> \
  --write \
  --approved-by Alejandro
```

Read recent events:

```bash
npm run crm:vnext:signal-event-ledger -- --limit 50
```

## Boundary

This hito does not:

- mutate person cards,
- write Fact Store,
- change heat scores,
- call live APIs,
- read credentials,
- send outbound messages,
- touch MailerLite/Gmail/Instagram/ManyChat/Drive/Contacts.

It is local-only and append-only.

## Next Leverage

The next high-leverage step is a projection adapter:

```text
Signal Event Ledger -> selected engagement signals -> engagement-signal-preview -> movement ledger/dashboard
```

That will let Mantis collect ongoing source observations into one ledger first, then run scoring movement previews from the same history instead of handling each source as a one-off report.

# CRM vNext Operator Cadence Policy

Date: 2026-05-21
Status: Operator policy v0

## Decision

Run the CRM vNext daily loop as a quiet infrastructure pulse, not as a daily decision machine.

Reason: Instagram is currently the most active community channel, but full Instagram ingestion is not stable yet. A daily decision loop based mostly on MailerLite/Gmail/ClassBot can create redundant questions or biased warmth interpretation.

## Daily Pulse

Safe to run daily, preferably failure-only/noise-minimized:

- encrypted card-store snapshot,
- source health checks for gog/Google Workspace, MailerLite, and Instagram UI readiness,
- local readiness checks,
- local Daily Brief or Daily Operator Handoff only when needed for operator planning,
- `crm:vnext:signal-packet-inbox` to detect whether a saved source packet is new,
- `crm:vnext:control-room` as the single daily operating read,
- ingestion/pipeline only if a new approved source packet exists.

The daily pulse should report only when:

- a source is blocked,
- a backup or restore check fails,
- a new packet was processed,
- a human decision is required,
- a queue crosses a meaningful threshold.

## Delta-Triggered Intelligence

Run the engagement movement / decision / resolution loop when there is new signal material:

- MailerLite engagement snapshot,
- Gmail reply discovery,
- Instagram signal event packet,
- ClassBot/yoga participation packet,
- WhatsApp/Bhakti packet,
- Shopify/payment/purchase packet,
- human enrichment packet,
- approved local card/stitching write that changes identity coverage.

Do not run broad human questions daily without new evidence.

## Instagram Bridge Until API Is Stable

Until full Instagram API ingestion is reliable, use the staged pattern:

```text
Instagram UI/API/ManyChat/proxy observations
  -> crm:vnext:instagram-signal-events
  -> crm:vnext:signal-event-pipeline
  -> Engagement Snapshot Ledger, if approved
  -> Movement Queue / Decision Brief only if movement is meaningful
```

For identity bridges from DMs, keep using:

```text
crm:vnext:instagram-dm-ui-evidence
  -> Deep Local Stitching / approval packet
```

The two lanes are different:

- `instagram-dm-ui-evidence` resolves identity and context.
- `instagram-signal-events` feeds engagement movement.

## Mantis Rule

When Alejandro asks "qué sigue hoy en CRM?", Mantis should:

1. run `npm run crm:vnext:control-room`;
2. use `signal-packet-inbox` details inside the Control Room to check whether new source packets exist;
3. check source health if a high-value source is expected;
4. run decision loops only for new deltas or a concrete Control Room state that asks for them;
5. otherwise report "observe/no new CRM action" instead of generating fresh questions.

Waiting is valid operator behavior when the signal base has not changed.

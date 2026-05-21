# Hito 79 - Signal Packet Inbox v0

Date: 2026-05-22
Status: Implemented

## Why

After the Instagram signal adapter and cadence policy, Mantis still needed a local way to decide whether a daily CRM wake should build, process, ask for an unblock, or stay quiet.

The missing piece was not another source adapter. It was a router for already-saved packets.

## Added

- `npm run crm:vnext:signal-packet-inbox`
- `lib/crm/crm-vnext-signal-packet-inbox.js`
- `scripts/crm-vnext-signal-packet-inbox.mjs`
- `docs/crm-vnext/signal-packet-inbox.md`

## Behavior

The inbox scans `~/Documents/Mantis-Reports` and classifies local JSON files into:

- unprocessed signal input packets,
- already-processed source packets,
- active source blockers,
- superseded blockers,
- observe-only reports.

When it finds a candidate, it emits the exact safe local command for:

```bash
npm run crm:vnext:signal-event-pipeline
```

with the right source flag.

## Boundary

This is a planner only.

It does not call live sources, read credentials, mutate cards, write Fact Store, write score ledgers, send outbound messages, or perform social actions.

It can only write its own local report when the CLI receives `--out` or `--markdown-out`.

## Operator Impact

Daily CRM operation now has a concrete first step:

```text
signal-packet-inbox
  -> process new packet if present
  -> ask for source unblock if needed
  -> otherwise observe/no action
```

This closes the gap between the cadence policy and Mantis' daily behavior.

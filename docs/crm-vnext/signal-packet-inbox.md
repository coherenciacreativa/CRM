# CRM vNext Signal Packet Inbox

Date: 2026-05-22
Status: Implemented local read-only planner

## Purpose

`crm:vnext:signal-packet-inbox` is the daily routing check for engagement intelligence.

It scans saved JSON reports under `~/Documents/Mantis-Reports`, classifies which ones are real signal inputs, suppresses packets already consumed by `signal-event-pipeline`, and tells Mantis the next local command to run.

This prevents the daily CRM pulse from rerunning broad engagement loops when nothing new has arrived.

## Command

```bash
npm run crm:vnext:signal-packet-inbox
```

Useful report form:

```bash
npm run crm:vnext:signal-packet-inbox -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_signal_packet_inbox_2026-05-22.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_signal_packet_inbox_2026-05-22.md
```

## Packet Kinds

The inbox recognizes unprocessed inputs for the shared source-to-score pipeline:

- `mailerlite_snapshot` -> `--mailerlite-snapshot-file`
- `gmail_reply_discovery` -> `--gmail-reply-discovery-file`
- `engagement_signals` -> `--signals-file`
- `signal_events` -> `--events-file`

It intentionally treats these as observe-only outputs:

- signal pipeline reports,
- engagement movement/decision/resolution reports,
- daily briefs and daily handoffs,
- healthchecks,
- snapshots,
- source-health preflight reports.

## Mantis Rule

At the start of a daily CRM pulse:

1. Run `crm:vnext:signal-packet-inbox`.
2. If it returns `run_signal_event_pipeline_preview`, run the recommended pipeline command.
3. If it returns `await_human_unblock_or_run_source_health_preflight`, ask Alejandro for the exact source unblock.
4. If it returns `observe_only_no_signal_delta`, do not run engagement decision/resolution loops.

## Safety

The command is local-only and read-only.

It does not:

- open Instagram, Gmail, MailerLite, Google Drive, Contacts, WhatsApp, Shopify, or ManyChat,
- call live APIs,
- read or mutate credentials,
- mutate CRM cards,
- write Fact Store,
- write score ledgers,
- send outbound messages,
- perform social actions.

It may write only its own JSON/Markdown report when `--out` or `--markdown-out` is supplied.

# CRM vNext Community Queue Monitor Job

Date: 2026-05-09
Status: Implemented local wrapper

## Purpose

Give Mantis a safe local job for recurring queue checks:

- call the read-only queue API,
- persist `snapshot.current` locally when requested,
- emit a compact local alert payload when Alejandro review is needed.

This job prepares signal. It does not deliver messages.

## Command

Default dry run:

```bash
npm run crm:vnext:queue-monitor
```

Persist the current snapshot:

```bash
npm run crm:vnext:queue-monitor -- --write-snapshot
```

Use an explicit snapshot file:

```bash
npm run crm:vnext:queue-monitor -- --snapshot-path .crm-vnext/community-queue-snapshot.json --write-snapshot
```

Write a local alert payload if a queue reaches `notify`:

```bash
npm run crm:vnext:queue-monitor -- --alert-output-path .crm-vnext/queue-alert.json
```

## Runtime Inputs

- `--api-url`: defaults to `http://localhost:3000/api/crm-vnext/community-queues`.
- `--snapshot-path`: defaults to `CRM_VNEXT_QUEUE_SNAPSHOT_PATH` or `.crm-vnext/community-queue-snapshot.json`.
- `--write-snapshot`: writes `snapshot.current`.
- `--alert-output-path`: writes the alert JSON only when an Alejandro alert is needed.
- `--fail-on-notify`: exits with code `2` when an alert is needed.

If `CRM_VNEXT_INSIGHTS_TOKEN` is configured, the script sends it as an internal API header. The token is never printed.

## Output

The script prints a JSON report with:

- current status totals,
- snapshot read/write state,
- whether Alejandro needs an alert,
- the local alert payload when applicable.

The report intentionally excludes:

- person rows,
- source file paths from the API payload,
- secrets,
- outbound-channel instructions.

## Safety Boundary

Allowed:

- localhost API reads,
- local snapshot writes under the configured path,
- local alert JSON writes.

Not allowed without explicit approval:

- Telegram delivery,
- Instagram messages or permission changes,
- ManyChat LIVE changes,
- MailerLite credential or campaign changes,
- WhatsApp delivery,
- contact mutation.

## Mantis Operating Rule

Mantis can run this wrapper on the queue cadence and inspect the JSON result.

If `alert.shouldAlertAlejandro=true`, Mantis should prepare the decision brief. Actual Telegram delivery is a separate adapter and requires explicit approval before activation.

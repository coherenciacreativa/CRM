# CRM vNext Daily Brief Export

Date: 2026-05-09
Status: Implemented local script

## Purpose

Give Mantis a local CLI path to produce a readable daily brief without opening the browser.

The script reads the internal daily brief API and can write:

- Markdown report,
- raw JSON payload.

The report now includes stored engagement-movement action summaries when the local Engagement Snapshot Ledger has data. It does not send messages and does not mutate CRM records.

## Command

Dry run:

```bash
npm run crm:vnext:daily-brief
```

Write local files:

```bash
npm run crm:vnext:daily-brief -- --write
```

Use explicit output paths:

```bash
npm run crm:vnext:daily-brief -- --write --markdown-path .crm-vnext/daily-brief/latest.md --json-path .crm-vnext/daily-brief/latest.json
```

Use a previous queue snapshot:

```bash
npm run crm:vnext:daily-brief -- --previous-snapshot-path .crm-vnext/community-queue-snapshot.json
```

## Options

- `--api-url`: defaults to `http://localhost:3000/api/crm-vnext/community-daily-brief`.
- `--previous-snapshot-path`: optional local snapshot for delta-aware queue status.
- `--focus-queue-limit`: default `3`, max `5`.
- `--people-per-queue`: default `3`, max `10`.
- `--markdown-path`: defaults to `.crm-vnext/daily-brief/latest.md`.
- `--json-path`: defaults to `.crm-vnext/daily-brief/latest.json`.
- `--write`: writes Markdown and JSON locally.
- `--fail-on-notify`: exits with code `2` when notify queues exist.

If `CRM_VNEXT_INSIGHTS_TOKEN` is configured, the script sends it as an internal API header. The token is never printed.

## Safety

- Local filesystem writes only when `--write` is passed.
- No Telegram delivery.
- No Instagram calls.
- No email or WhatsApp sends.
- No ManyChat changes.
- No MailerLite changes.
- No live engagement-source calls; engagement actions come from stored local movement history.
- No contact mutation.

## Mantis Operating Rule

Use the Markdown file as a local operating report.

If the JSON result has `brief.queues.totals.notify > 0`, Mantis should prepare a concise decision note for Alejandro. Actual Telegram delivery remains a separate approved adapter.

If the report includes `## Engagement Actions`, treat it as routing guidance only: reply-context reviews and identity stitching can proceed internally, but no outreach follows from the score movement by itself.

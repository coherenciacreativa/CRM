# CRM vNext Readiness CLI

Date: 2026-05-09
Status: Implemented local script

## Purpose

Give Mantis a command-line preflight before running CRM vNext operator jobs.

The script reads `GET /api/crm-vnext/readiness` and prints a path-redacted summary:

- readiness status,
- source counts,
- identity totals,
- queue totals,
- checks and operator actions,
- safety block.

It does not write files, send messages, or mutate CRM records.

## Command

Dry run:

```bash
npm run crm:vnext:readiness
```

Fail if blocked:

```bash
npm run crm:vnext:readiness -- --fail-on-blocked
```

Fail if watch or blocked:

```bash
npm run crm:vnext:readiness -- --fail-on-watch
```

## Options

- `--api-url`: defaults to `http://localhost:3000/api/crm-vnext/readiness`.
- `--fail-on-blocked`: exits with code `2` when readiness status is `blocked`.
- `--fail-on-watch`: exits with code `2` when readiness status is `watch` or `blocked`.

If the internal read token is configured, the script sends it as an API header. The token is never printed.

## Safety

- No filesystem writes.
- No Telegram delivery.
- No Instagram calls.
- No email or WhatsApp sends.
- No ManyChat changes.
- No MailerLite changes.
- No contact mutation.

## Mantis Operating Rule

Run this before queue monitor, daily brief export, or decision brief export.

If status is `blocked`, stop and repair the local source before downstream jobs.

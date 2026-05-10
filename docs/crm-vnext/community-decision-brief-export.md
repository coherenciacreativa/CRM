# CRM vNext Community Decision Brief Export

Date: 2026-05-09
Status: Implemented local script

## Purpose

Give Mantis a local CLI path to turn one CRM vNext queue into a readable no-send decision note.

The script reads the internal decision brief API and can write:

- Markdown report,
- raw JSON payload.

It does not send messages and does not mutate CRM records.

## Command

Dry run:

```bash
npm run crm:vnext:decision-brief -- --queue-id ig_without_email
```

Write local files:

```bash
npm run crm:vnext:decision-brief -- --queue-id ig_without_email --write
```

Use explicit output paths:

```bash
npm run crm:vnext:decision-brief -- --queue-id commercial_follow_up --write --markdown-path .crm-vnext/decision-brief/commercial.md --json-path .crm-vnext/decision-brief/commercial.json
```

Fail when a human decision is required:

```bash
npm run crm:vnext:decision-brief -- --queue-id commercial_follow_up --fail-on-decision
```

## Options

- `--queue-id`: required. One of `ig_without_email`, `email_engaged`, `human_review_required`, `identity_stitching`, `commercial_follow_up`.
- `--api-url`: defaults to `http://localhost:3000/api/crm-vnext/community-decision-brief`.
- `--limit`: default `5`, max `10`.
- `--markdown-path`: defaults to `.crm-vnext/decision-brief/latest.md`.
- `--json-path`: defaults to `.crm-vnext/decision-brief/latest.json`.
- `--write`: writes Markdown and JSON locally.
- `--fail-on-decision`: exits with code `2` when the brief says Alejandro's decision is required.

If the internal read token is configured, the script sends it as an API header. The token is never printed.

## Safety

- Local filesystem writes only when `--write` is passed.
- No Telegram delivery.
- No Instagram calls.
- No email or WhatsApp sends.
- No ManyChat changes.
- No MailerLite changes.
- No contact mutation.

## Mantis Operating Rule

Use the Markdown file as an internal decision note.

It can help prepare what to ask Alejandro, but it is not delivery approval and must not be treated as permission to contact anyone.

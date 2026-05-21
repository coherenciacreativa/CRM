# CRM vNext Daily Operator Handoff

Date: 2026-05-21
Status: Implemented local read-only dispatcher

## Purpose

Turn the Daily Brief into a compact Mantis task list:

- what to do today,
- what to inspect internally,
- what requires Alejandro,
- what should stay quiet,
- what must not trigger outreach or writes.

This is a dispatcher, not a new scoring system. It consumes the existing Daily Brief, stored Engagement Movement Queue history, and the Engagement Resolution Loop anti-redundancy guard.

Cadence note: while Instagram is the most active channel and full Instagram ingestion is not stable yet, use this handoff as a quiet operator pulse. Run the engagement decision/resolution loops when new signal packets arrive, not merely because a new day started.

## API

```text
GET /api/crm-vnext/daily-operator-handoff
```

## CLI

Preview:

```bash
npm run crm:vnext:daily-operator-handoff
```

Write local reports:

```bash
npm run crm:vnext:daily-operator-handoff -- \
  --out /Users/alejandrogomez/Documents/Mantis-Reports/crm_vnext_daily_operator_handoff.json \
  --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/crm_vnext_daily_operator_handoff.md
```

## Task Lanes

- `queue_review`: notify-level CRM queues that need a no-send decision brief.
- `engagement_context`: reply/context interpretation and anti-redundancy review.
- `identity_stitching`: unmatched or incomplete identity before interpreting a signal.
- `email_capture`: Instagram-known people without email; planning only until approved.
- `observation`: passive movement that should stay quiet.
- `safety`: reserved for blocked or policy-critical items.

## Safety

Read-only/local only:

- no outbound,
- no card writes,
- no Fact Store writes,
- no score mutation,
- no live API calls,
- no credential reads,
- no ManyChat LIVE changes.

The handoff may recommend a route such as `engagement-resolution-loop`, `community-decision-brief`, or `identity_stitching`, but it does not execute those follow-up writes or send anything.

## Mantis Operating Rule

Use this after the Daily Brief when Alejandro says something natural like:

```text
que sigue hoy en CRM?
```

Mantis should return the first one or two tasks in plain language, not the full technical packet, unless Alejandro asks for the report.

If the handoff says `observe_only`, do not manufacture questions. Waiting is an active operator decision.

For cadence details, see `docs/crm-vnext/operator-cadence-policy.md`.

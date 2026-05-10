# CRM vNext Source Ledger

Date: 2026-05-09
Status: v0 read-only

## Purpose

The source ledger answers: what can CRM vNext currently trust, what is stale, what is blocked, and what needs a human or credential decision before it becomes live ingestion.

This is the next layer after the internal console. The dashboard shows the community; the ledger shows the health of the sources feeding that community view.

## Surfaces

- Browser route: `/crm-vnext/sources`
- API: `GET /api/crm-vnext/source-ledger`
- CLI: `npm run crm:vnext:source-ledger`

Optional coverage check:

```bash
npm run crm:vnext:source-ledger -- --expected-mailerlite-contacts 1000
```

That flag does not call MailerLite. It only compares a known external floor against the local MailerLite snapshot count.

## Current Sources

- `person_cards_v1`: local read model for dashboards, queues, briefs, and cards.
- `mailerlite_engagement_snapshot`: local MailerLite engagement snapshot.
- `mailer_ig_bridge`: curated email-to-Instagram identity bridge.
- `skipped_mailer_rows`: local rows that could not become person cards.
- `ig_ui_signals`: lightweight local Instagram UI signal state.
- `ig_api_inbox`: Instagram API read snapshot/status.
- `ig_web_probe`: fallback web probe state.
- `fact_intake_protocol`: protocol for conversational/manual fact intake.
- `fact_store`: local append-only ledger of approved CRM facts.

## Safety

- No credential reads.
- No external API calls.
- No record mutation.
- No outbound messages.
- No local paths in public/API output.

## Operator Use

Mantis should use this before choosing the next ingestion sprint:

1. If MailerLite local count is lower than Alejandro's known account count, treat CRM coverage as incomplete.
2. If Instagram API read is blocked, keep Instagram ingestion in feasibility/dry-run.
3. If a source is stale, refresh through a reviewed read-only path before relying on it.
4. If a source is fresh and local, it can feed dashboards and planning safely.

## Why This Matters

The CRM should not just collect data. It should know the quality of the evidence behind the data. A person card with a stale source and a person card with a fresh, multi-source trail should not carry the same operational confidence.

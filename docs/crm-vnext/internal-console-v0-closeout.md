# CRM vNext Internal Console v0 Closeout

Date: 2026-05-09
Status: complete for internal read-only demo

## Verdict

Milestone 1 is complete: CRM vNext now has a local internal console and operator-readable contracts for community state, person cards, queue status, daily briefs, decision briefs, and readiness checks.

This closeout intentionally freezes further technical expansion until the demo/report has been reviewed. The next useful step is product validation, not another endpoint.

## What Exists

- Internal dashboard routes:
  - `http://localhost:3000/crm-vnext`
  - `http://localhost:3000/crm-vnext/daily-brief`
  - `http://localhost:3000/crm-vnext/queues`
  - `http://localhost:3000/crm-vnext/people`
  - `http://localhost:3000/crm-vnext/person/ig%3Aangiemontero16`
- Read-only APIs for insights, person cards, queue lists, queue briefs, daily briefs, decision briefs, operator capabilities, and readiness.
- CLI commands for operator smoke checks:
  - `npm run crm:vnext:readiness`
  - `npm run crm:vnext:queue-monitor -- --snapshot-path /tmp/crm-vnext-community-queue-snapshot.json`
  - `npm run crm:vnext:daily-brief`
  - `npm run crm:vnext:decision-brief -- --queue-id ig_without_email --limit 2`
- Safety boundaries encoded in the contracts:
  - no outbound messages
  - no CRM record mutation
  - no ManyChat LIVE changes
  - no Instagram or MailerLite credential changes
  - local paths redacted from readiness output

## Current Data Snapshot

Latest readiness run:

- Status: `ready`
- Local cards: 728
- Email present: 630
- Instagram present: 103
- Omnichannel identities: 5
- Queues: 5 total
- Queue status: 0 notify, 2 watch, 3 ok

Daily brief snapshot:

- Lifecycle:
  - `SEMILLA`: 715
  - `GERMINADA`: 12
  - `FLORECIDA`: 1
  - `COSECHA`: 0
- Next actions:
  - `ask_for_email`: 98
  - `keep_warming`: 630
- Watch queues:
  - `ig_without_email`: 98 matched
  - `identity_stitching`: 625 matched

Decision brief smoke:

- Queue: `ig_without_email`
- Mode: `dry-run`
- Matched: 98
- Shown: 2
- Requires Alejandro decision: true

## What This Is Not Yet

- It is not live Instagram API ingestion.
- It is not a ManyChat replacement.
- It is not MailerLite live ingestion.
- It is not an outbound messaging agent.
- It does not mutate contact records.

Those pieces remain future milestones because they require external-channel approvals, credential handling, or production-risk decisions.

## Autonomy Rule Going Forward

After three to five meaningful technical increments, or once a milestone has dashboard/API/CLI/readiness coverage, stop and close a product checkpoint.

For this project, the stop rule is:

1. Build the smallest internal read-only product that can be used.
2. Verify it with tests, build, and smoke checks.
3. Write the report/demo script.
4. Ask for human review only when the next step would touch live credentials, external channels, ManyChat LIVE, or product strategy.

## Recommended Next Milestones

1. Source reliability map: document exactly what data currently comes from email, Instagram-derived exports, Telegram reports, and local memory, with freshness/confidence per source.
2. MailerLite read-only ingestion: integrate email engagement metrics without changing subscribers or campaigns.
3. Instagram API feasibility and dry-run ingestion: prove exactly which comments, likes, followers, DMs, or profile fields are available via approved APIs.
4. ManyChat shadow replacement: reproduce the current welcome/email-capture flow locally in read-only/shadow mode before touching LIVE.
5. Approved action workflow: let Mantis propose actions, but keep sending/mutation behind explicit Alejandro approval.

## Validation

Recent full validation before this closeout:

- `npm test`: 35 files, 132 tests passed.
- `npm run build`: passed.

Closeout smoke on 2026-05-09:

- `npm run crm:vnext:readiness`: passed, status `ready`.
- Daily brief API: returned HTTP 200.
- `npm run crm:vnext:decision-brief -- --queue-id ig_without_email --limit 2`: passed in `dry-run`.

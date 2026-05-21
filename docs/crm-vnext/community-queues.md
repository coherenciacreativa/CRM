# CRM vNext Mantis Queues

Date: 2026-05-09
Status: Implemented local read-only page

## Purpose

Give Mantis and Alejandro stable internal views for recurring CRM operator work. These are not automations; they are saved filters over local vNext person cards.

## Route

`/crm-vnext/queues`

Read-only API:

`/api/crm-vnext/community-queues`

Person-level brief API:

`/api/crm-vnext/community-queue-brief?queueId=ig_without_email`

Daily operator brief API:

`/api/crm-vnext/community-daily-brief`

Engagement movement queue:

`/crm-vnext/engagement-movement`

`/api/crm-vnext/engagement-movement-queue`

## Current Queues

- `IG without email`: Instagram-known people who should eventually be guided toward email capture.
- `Email engaged`: people ready for continued email nurture.
- `Human review required`: suppression/sensitive/direct follow-up cases that must not move automatically.
- `Identity stitching`: email-known people missing Instagram identity.
- `Commercial follow-up`: warm contacts that require human decision before any outreach.

## Engagement Movement Queue

The movement queue is not a saved person-card filter. It reads the approved `Engagement Snapshot Ledger` and shows recent score movement caused by engagement sources such as MailerLite and Gmail replies.

Use it after storing engagement snapshots when Mantis needs to see who warmed, why, and whether the safe next step is observe, inspect a reply, review a warm contact, or route an unmatched signal back to stitching.

## Status Contract

Queue status is evaluated by `lib/crm/community-queue-status.ts` and returned by `/api/crm-vnext/community-queues`.

- `ok`: no operator action needed now.
- `watch`: monitor on normal cadence.
- `notify`: alert Alejandro before any next step.

See `docs/crm-vnext/community-queue-status-contract.md` for cadence and alert thresholds.

## Snapshots

Queue snapshots are implemented in `lib/crm/community-queue-snapshots.ts`.

- The API returns `snapshot.current` for explicit local persistence.
- Previous snapshots can feed delta-aware status through `CRM_VNEXT_QUEUE_SNAPSHOT_PATH`.
- Snapshot payloads exclude person rows and local source paths.

See `docs/crm-vnext/community-queue-snapshots.md`.

## Monitor Job

The local wrapper is `scripts/crm-vnext-queue-monitor.mjs`.

- Default command: `npm run crm:vnext:queue-monitor`.
- It calls `/api/crm-vnext/community-queues`.
- It can persist `snapshot.current` with `--write-snapshot`.
- It can write a local alert payload with `--alert-output-path`.
- It does not send Telegram or any other outbound message.

See `docs/crm-vnext/community-queue-monitor-job.md`.

## Queue Briefs

`lib/crm/community-queue-briefs.ts` and `/api/crm-vnext/community-queue-brief` generate bounded person-level briefs for one queue at a time.

- They are local/read-only.
- They cap returned people at 25.
- They include scores, next action, product fit, key signals, risks, and evidence sources.
- They include an explicit safety block: no outbound, no ManyChat change, no CRM mutation.

Use these briefs for Mantis decision preparation, not automatic outreach.

See `docs/crm-vnext/community-queue-brief-api.md`.

## Daily Brief

`lib/crm/community-daily-brief.ts` and `/api/crm-vnext/community-daily-brief` combine:

- community insight totals,
- queue status totals,
- watch/notify highlights,
- safe next-step recommendations,
- selected focus queue briefs.

It is meant as Mantis's first read before deciding which queue to inspect. It does not send alerts or mutate records.

See `docs/crm-vnext/community-daily-brief-api.md`.

## Safety

- Reads local Person Cards V1 through the vNext adapter.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.
- No fuzzy enrichment.
- Non-localhost requests stay disabled unless `CRM_VNEXT_DASHBOARD_ENABLED=1`.

## Next Step

Add an approved delivery adapter later if Alejandro wants queue alerts to reach Telegram automatically.

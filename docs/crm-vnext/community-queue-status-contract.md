# CRM vNext Community Queue Status Contract

Date: 2026-05-09
Status: Implemented in code and exposed through queue API

## Purpose

Give Mantis a stable rulebook for reading CRM vNext queues without over-alerting Alejandro.

The contract separates three states:

- `ok`: no operator action needed now.
- `watch`: Mantis should keep monitoring on cadence.
- `notify`: Mantis should alert Alejandro with concise context before any next step.

## Current Cadence

- `IG without email`: every 6 hours.
- `Email engaged`: every 24 hours.
- `Human review required`: every 6 hours.
- `Identity stitching`: every 24 hours.
- `Commercial follow-up`: every 6 hours.

## Notify Rules

- `Human review required`: notify when any row exists.
- `Commercial follow-up`: notify when any row exists.
- `IG without email`: notify when matched count reaches 150 or grows by 25 since prior snapshot.
- `Email engaged`: notify when matched count reaches 75 or grows by 25 since prior snapshot.
- `Identity stitching`: notify only when it grows by 100 since prior snapshot.

Standing backlog is usually `watch`, not `notify`.

## API

`GET /api/crm-vnext/community-queues`

The response includes:

- `queues`: queue metadata and counts only.
- `status`: evaluated queue state, operator action, alert action, and whether Alejandro should be alerted.
- `snapshot.current`: path-free queue snapshot payload for explicit local persistence.
- `snapshot.previousLoaded`: whether a previous snapshot was used for delta evaluation.

The API intentionally does not return person rows.

## Snapshot Input

For delta-aware status, provide a previous snapshot by setting `CRM_VNEXT_QUEUE_SNAPSHOT_PATH` or, in local non-production checks, `previousSnapshotPath`.

The API reads previous snapshots but does not write them. Writing is handled by explicit local jobs using `writeCommunityQueueSnapshot`.

## Safety

- No outbound messages are sent by this contract.
- `notify` means “prepare/raise an alert”; it does not authorize contacting community members.
- Production still requires `CRM_VNEXT_INSIGHTS_TOKEN`.
- ManyChat LIVE, Instagram auth/API permissions, MailerLite credentials, and outbound channels remain untouched.

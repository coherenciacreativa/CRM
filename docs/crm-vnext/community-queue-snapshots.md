# CRM vNext Community Queue Snapshots

Date: 2026-05-09
Status: Implemented local snapshot utility

## Purpose

Persist queue counts between Mantis runs so status evaluation can detect real deltas instead of relying on live chat memory.

## Snapshot Contract

Snapshots use schema:

`community-queue-snapshot-2026-05-09`

They include:

- generation time,
- source kind, generated time, and card count,
- queue ids,
- matched/returned/total counts.

They intentionally exclude:

- person rows,
- local source path,
- secrets,
- outbound instructions.

## Code

- Build snapshot: `buildCommunityQueueSnapshot(queues, source)`.
- Read snapshot: `readCommunityQueueSnapshot(path)`.
- Write snapshot: `writeCommunityQueueSnapshot(path, snapshot)`.
- Convert to status input: `snapshotToPreviousMatched(snapshot)`.

## API Integration

`GET /api/crm-vnext/community-queues` returns:

- `queues`: current queue counts.
- `status`: `ok/watch/notify` evaluation.
- `snapshot.current`: a path-free snapshot payload that a local Mantis job can persist.
- `snapshot.previousLoaded`: whether a previous snapshot was read.
- `snapshot.previousGeneratedAt`: previous snapshot timestamp if available.

Previous snapshot path can be supplied by:

- non-production query param: `previousSnapshotPath`.
- server config: `CRM_VNEXT_QUEUE_SNAPSHOT_PATH`.

The API reads previous snapshots but does not write files. Persistence must happen in an explicit local job.

## Local Monitor Wrapper

`scripts/crm-vnext-queue-monitor.mjs` is the first explicit local job wrapper.

- Dry run: `npm run crm:vnext:queue-monitor`.
- Persist snapshot: `npm run crm:vnext:queue-monitor -- --write-snapshot`.
- Explicit path: `npm run crm:vnext:queue-monitor -- --snapshot-path .crm-vnext/community-queue-snapshot.json --write-snapshot`.

When the snapshot file already exists, the wrapper passes it back to the local API as `previousSnapshotPath` so queue status can detect deltas.

See `docs/crm-vnext/community-queue-monitor-job.md`.

## Safety

- Local filesystem only.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No contact mutation.

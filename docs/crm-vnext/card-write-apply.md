# Card Write Apply

Date: 2026-05-10
Status: Implemented as a guarded local write path

## Purpose

`card-write-apply` is the first bridge from approval-ready stitching intelligence into a local CRM vNext card store.

It is intentionally narrow:

- it only applies items that are already `ready_for_human_approval`,
- committed writes require `approvedBy`,
- committed writes require either explicit `approvalItemIds` or `applyAllReady=true`,
- committed writes create backups first,
- every applied item gets provenance and a local JSONL ledger entry,
- merge candidates are staged for review instead of being merged automatically.

It never sends outbound messages, writes Fact Store, calls live APIs, changes credentials, or touches ManyChat/Instagram/MailerLite state.

Staged merge-review items are intentionally handed to `card-merge-review-resolver`, which has its own explicit approval and restricted-service acknowledgement boundary.

## Route

`POST /api/crm-vnext/card-write-apply`

## Local Command

```bash
npm run crm:vnext:card-write-apply -- \
  --text "<CRM facts>" \
  --include-expanded-sources \
  --evidence-file ./selected-evidence.json \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl \
  --apply-all-ready
```

Commit requires explicit approval:

```bash
npm run crm:vnext:card-write-apply -- \
  --text "<CRM facts>" \
  --evidence-file ./selected-evidence.json \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl \
  --approval-item-id <approvalItemId> \
  --write \
  --approved-by Alejandro
```

## Write Targets

Default committed local files:

- `.crm-vnext/person-card-store/person-cards-vnext.json`
- `.crm-vnext/card-write-apply/ledger.jsonl`
- `.crm-vnext/backups/card-write-apply/*`

The API response redacts local paths. The CLI can receive explicit paths for tests or controlled local runs.

## Read Surfaces After Commit

After a committed write, these internal surfaces prefer the local vNext card store when it exists:

- `/crm-vnext`
- `/crm-vnext/people`
- `/crm-vnext/person/[personId]`
- `/crm-vnext/queues`
- `/crm-vnext/daily-brief`
- `GET /api/crm-vnext/community-insights`
- `GET /api/crm-vnext/community-queues`
- `GET /api/crm-vnext/community-daily-brief`
- `GET /api/crm-vnext/community-queue-brief`
- `GET /api/crm-vnext/community-decision-brief`
- `GET /api/crm-vnext/person-card`
- `GET /api/crm-vnext/readiness`

Explicit local test overrides can still force the legacy Person Cards V1 source.

## Safety Boundary

Allowed:

- upsert an approved vNext card into the local vNext card store,
- stage a merge-review packet,
- append local provenance,
- create local backups.

Not allowed:

- automatic merge,
- Fact Store write,
- outbound message,
- live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp call,
- credential read/refresh,
- write without approval.

## Merge Review Follow-Up

When this command stages a merge instead of upserting a card, inspect the queue with:

```bash
npm run crm:vnext:card-merge-review-resolver
```

Do not resolve a merge until Alejandro has approved the selected `reviewId`. If the staged review contains therapy or other restricted service context, the resolver commit must include `--ack-restricted-service`.

## Eliana Pattern

For `@cadavid_eli`, Mantis can pass selected lead-capture evidence from ManyChat cache, old CRM, Vercel/proxy, WhatsApp/classbot, and MailerLite investigation into the CRM as `lead_capture_export` packets.

Once evidence questions such as email ownership are resolved in the evidence decision ledger, this write path can turn the approval-ready packet into a local vNext card-store upsert with provenance.

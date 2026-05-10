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

## Eliana Pattern

For `@cadavid_eli`, Mantis can pass selected lead-capture evidence from ManyChat cache, old CRM, Vercel/proxy, WhatsApp/classbot, and MailerLite investigation into the CRM as `lead_capture_export` packets.

Once evidence questions such as email ownership are resolved in the evidence decision ledger, this write path can turn the approval-ready packet into a local vNext card-store upsert with provenance.

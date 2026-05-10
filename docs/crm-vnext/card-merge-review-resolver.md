# Card Merge Review Resolver

Date: 2026-05-10
Status: Implemented as a guarded local merge-review write path

## Purpose

`card-merge-review-resolver` closes the loop for merge candidates staged by `card-write-apply`.

It exists because automatic merging is still too risky for CRM vNext. When `card-write-apply` sees an approved item that should be reviewed as create-vs-merge, it stages a local `mergeReviewQueue` item instead of mutating the target card. This resolver lets Mantis or Codex inspect that queue and, after explicit approval, resolve selected review items into the local vNext card store.

It is intentionally narrow:

- dry-run by default,
- reads only the local vNext card store,
- requires `approvedBy` for committed writes,
- requires either explicit `reviewIds` or `resolveAllReady=true`,
- requires `ackRestrictedService=true` when therapy or other restricted service context is present,
- creates a backup before writing,
- appends a local merge-review ledger entry,
- never sends outbound messages or touches live sources.

## Route

`POST /api/crm-vnext/card-merge-review-resolver`

## Local Command

Preview the queue:

```bash
npm run crm:vnext:card-merge-review-resolver
```

Preview one review:

```bash
npm run crm:vnext:card-merge-review-resolver -- \
  --review-id <reviewId>
```

Preview one review with supplemental read-only evidence, such as a MailerLite subscriber packet supplied by Mantis:

```bash
npm run crm:vnext:card-merge-review-resolver -- \
  --review-id <reviewId> \
  --evidence-file ./selected-mailerlite-evidence.json
```

Commit one approved review:

```bash
npm run crm:vnext:card-merge-review-resolver -- \
  --review-id <reviewId> \
  --write \
  --approved-by Alejandro
```

If the review includes restricted service context, the committed command must acknowledge that scope explicitly:

```bash
npm run crm:vnext:card-merge-review-resolver -- \
  --review-id <reviewId> \
  --write \
  --approved-by Alejandro \
  --ack-restricted-service
```

The same `--evidence-file` can be included in a committed command after human approval. The resolver matches supplemental evidence by stable identity, currently exact email/target email or exact Instagram handle. Matching evidence can fill missing card fields such as phone, city, country, email status, and Instagram handle before the final local card-store write.

## Write Targets

Default committed local files:

- `.crm-vnext/person-card-store/person-cards-vnext.json`
- `.crm-vnext/card-merge-review-resolver/ledger.jsonl`
- `.crm-vnext/backups/card-merge-review-resolver/*`

The API response redacts local paths. CLI path overrides exist for tests and controlled local runs.

## Safety Boundary

Allowed:

- inspect staged merge-review items,
- preview the exact proposed resolved card,
- preview extra contact fields from supplied read-only evidence packets,
- resolve explicitly approved local merge-review items,
- remove resolved reviews from the local queue,
- append local ledger entries,
- create local backups.

Not allowed:

- automatic merge,
- Fact Store write,
- outbound message,
- live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram API call,
- credential read/refresh,
- write without approval,
- restricted service merge without explicit acknowledgement.

## Supplemental Evidence Contract

The resolver accepts either a JSON array or an object containing `evidenceSources`.

Expected evidence packet shape:

```json
{
  "evidenceSources": [
    {
      "sourceKind": "mailerlite_export",
      "sourceId": "mailerlite:subscriber:152595767566009988",
      "title": "Juan Jose Trujillo",
      "email": "juanjotru@gmail.com",
      "snippet": "Name: Juan Jose Trujillo\nPhone: +573136579879\nCity: Medellin\nStatus: active"
    }
  ]
}
```

The API does not call MailerLite, Gmail, Drive, Instagram, ManyChat, WhatsApp, or Telegram. Mantis/Codex may gather selected read-only evidence through the appropriate helper or connector and then pass the packet in.

## Juan Jose Pattern

Juan Jose Trujillo is the first intended real use case:

- the existing local target card is `email:juanjotru@gmail.com`,
- MailerLite supplied email, phone, city, and group evidence,
- Alejandro supplied yoga, retreat, therapy consultation, friend, ally, and consultant context,
- `card-write-apply` staged the merge instead of auto-merging,
- this resolver can preview the final enriched card and requires restricted-service acknowledgement before committing it.

This keeps the important multi-service relationship intact while preserving the human review boundary around therapy consultation context.

Recommended next move for Juan Jose: refresh the MailerLite subscriber evidence packet with the phone/city Mantis already found, dry-run the resolver with `--evidence-file`, then decide whether to commit with `--ack-restricted-service`.

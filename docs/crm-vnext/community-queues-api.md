# CRM vNext Community Queues API

Date: 2026-05-09
Status: Implemented read-only endpoint

## Route

`GET /api/crm-vnext/community-queues`

## Purpose

Expose safe queue counts to Mantis/OpenClaw without scraping `/crm-vnext/queues`.

## Response Shape

```json
{
  "ok": true,
  "source": {
    "kind": "legacy-person-cards-v1",
    "generatedAt": "2026-05-08T12:00:00.000Z",
    "cards": 728
  },
  "queues": [
    {
      "id": "ig_without_email",
      "title": "IG without email",
      "purpose": "Capture email for Instagram-known people before deeper nurture.",
      "operatorNote": "Safe local queue for future email-capture follow-up. No message is sent from this view.",
      "filters": {
        "channel": "missing_email_with_instagram",
        "nextAction": "ask_for_email",
        "limit": 12
      },
      "counts": {
        "total": 728,
        "matched": 98,
        "returned": 12
      }
    }
  ],
  "status": {
    "generatedAt": "2026-05-09T01:00:00.000Z",
    "totals": {
      "queues": 5,
      "notify": 0,
      "watch": 2,
      "ok": 3
    },
    "statuses": [
      {
        "id": "ig_without_email",
        "title": "IG without email",
        "level": "watch",
        "matched": 98,
        "returned": 12,
        "deltaMatched": null,
        "checkCadenceHours": 6,
        "shouldAlertAlejandro": false,
        "reason": "98 rows should be monitored on the normal cadence.",
        "operatorAction": "Review volume and spot-check profiles before planning any email-capture move.",
        "alertAction": null
      }
    ]
  },
  "snapshot": {
    "current": {
      "schemaVersion": "community-queue-snapshot-2026-05-09",
      "generatedAt": "2026-05-09T01:00:00.000Z",
      "source": {
        "kind": "legacy-person-cards-v1",
        "generatedAt": "2026-05-08T12:00:00.000Z",
        "cards": 728
      },
      "queues": [
        {
          "id": "ig_without_email",
          "matched": 98,
          "returned": 12,
          "total": 728
        }
      ]
    },
    "previousLoaded": false,
    "previousGeneratedAt": null
  }
}
```

The endpoint intentionally returns queue metadata, counts, and status only. It does not return person rows.

The `source` object is path-redacted. Local filesystem paths are not returned.

`snapshot.current` is safe for a local Mantis job to persist. It excludes person rows and local source paths.

For a bounded person-level decision brief, use:

`GET /api/crm-vnext/community-queue-brief?queueId=<queueId>`

See `docs/crm-vnext/community-queue-brief-api.md`.

For one compact Mantis daily read across insights, queues, highlights, and focus briefs, use:

`GET /api/crm-vnext/community-daily-brief`

See `docs/crm-vnext/community-daily-brief-api.md`.

## Auth And Safety

- `GET` only.
- Uses `CRM_VNEXT_INSIGHTS_TOKEN` when configured.
- Non-loopback production requests fail closed if the token is not configured.
- Loopback localhost requests are allowed so local Mantis jobs can run without copying secrets into shell history.
- Non-production can run locally without a token for development.
- `sourcePath` override is allowed only outside production or from loopback localhost.
- `previousSnapshotPath` override is allowed only outside production or from loopback localhost.
- `CRM_VNEXT_QUEUE_SNAPSHOT_PATH` can point the server to a previous local snapshot.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.

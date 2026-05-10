# CRM vNext Community Queue Brief API

Date: 2026-05-09
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/community-queue-brief?queueId=ig_without_email`

## Purpose

Give Mantis a bounded, person-level decision brief for one queue without scraping the dashboard.

This is separate from `/api/crm-vnext/community-queues` because the queue API intentionally returns counts only. Briefs include local person rows and therefore stay behind the stricter internal/read-only boundary.

## Query

- `queueId`: required. One of:
  - `ig_without_email`
  - `email_engaged`
  - `human_review_required`
  - `identity_stitching`
  - `commercial_follow_up`
- `limit`: optional, default `8`, max `25`.
- `sourcePath`: optional only outside production or from loopback localhost.

## Response Shape

```json
{
  "ok": true,
  "source": {
    "kind": "legacy-person-cards-v1",
    "generatedAt": "2026-05-08T12:00:00.000Z",
    "cards": 728
  },
  "brief": {
    "generatedAt": "2026-05-09T04:00:00.000Z",
    "queue": {
      "id": "ig_without_email",
      "title": "IG without email",
      "counts": {
        "total": 728,
        "matched": 98,
        "returned": 8
      },
      "status": {
        "level": "watch",
        "shouldAlertAlejandro": false
      }
    },
    "safety": {
      "mode": "read_only_local_brief",
      "outboundProhibited": true
    },
    "people": [
      {
        "personId": "ig:example",
        "displayName": "Example",
        "identities": {
          "email": null,
          "instagramHandle": "example",
          "city": null,
          "country": null
        },
        "stage": {
          "code": "SEMILLA",
          "label": "Semilla"
        },
        "scores": {
          "priority": 36,
          "commercialWarmth": 18,
          "communityDepth": 10,
          "relationshipEngagement": 32,
          "dataConfidence": 46
        },
        "nextAction": {
          "code": "ask_for_email",
          "requiresHumanReview": false
        }
      }
    ]
  }
}
```

The response excludes local source paths and never includes outbound instructions or message drafts.

For full exact detail on one row returned in a brief, use:

`GET /api/crm-vnext/person-card?personId=<personId>`

See `docs/crm-vnext/person-card-api.md`.

For an approval-boundary brief before any outbound or CRM mutation decision, use:

`GET /api/crm-vnext/community-decision-brief?queueId=<queueId>&limit=<n>`

See `docs/crm-vnext/community-decision-brief-api.md`.

## Safety

- `GET` only.
- Local read-only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require `CRM_VNEXT_INSIGHTS_TOKEN`.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.

## Mantis Operating Rule

Use this endpoint to prepare a decision brief, not to act.

If `brief.queue.status.shouldAlertAlejandro=true`, Mantis can summarize why Alejandro needs to decide. Actual Telegram delivery remains a separate approved adapter.

Decision briefs are still internal notes; they do not authorize sending anything.

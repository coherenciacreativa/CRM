# CRM vNext Community Daily Brief API

Date: 2026-05-09
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/community-daily-brief`

Browser view:

`/crm-vnext/daily-brief`

Local export script:

`npm run crm:vnext:daily-brief`

See `docs/crm-vnext/community-daily-brief-export.md`.

## Purpose

Give Mantis one compact daily operating brief for CRM vNext:

- community totals and identity coverage,
- queue status totals,
- highlights worth watching,
- next-step recommendations,
- bounded focus queue briefs with selected person rows.

This is a reading surface. It does not mutate CRM records and does not send messages.

## Query

- `focusQueueLimit`: optional, default `3`, max `5`.
- `peoplePerQueue`: optional, default `3`, max `10`.
- `sourcePath`: optional only outside production or from loopback localhost.
- `previousSnapshotPath`: optional only outside production or from loopback localhost.

## Response Shape

```json
{
  "ok": true,
  "source": {
    "kind": "legacy-person-cards-v1",
    "generatedAt": "2026-05-08T12:00:00.000Z",
    "cards": 728
  },
  "snapshot": {
    "previousLoaded": true,
    "previousGeneratedAt": "2026-05-08T19:41:22.606Z"
  },
  "brief": {
    "mode": "read_only_daily_brief",
    "summary": {
      "totals": {
        "cards": 728,
        "emailPresent": 630,
        "instagramPresent": 103,
        "omnichannel": 5
      }
    },
    "queues": {
      "totals": {
        "queues": 5,
        "notify": 0,
        "watch": 2,
        "ok": 3
      }
    },
    "highlights": [],
    "nextSteps": [],
    "focusQueues": [],
    "safety": {
      "outboundProhibited": true,
      "recordMutationProhibited": true
    }
  }
}
```

The response excludes local source paths. Focus queues may include bounded person rows, so this endpoint should stay internal.

For full exact detail on one person returned in a focus queue, use:

`GET /api/crm-vnext/person-card?personId=<personId>`

See `docs/crm-vnext/person-card-api.md`.

## Safety

- `GET` only.
- Local/read-only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require `CRM_VNEXT_INSIGHTS_TOKEN`.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.

## Mantis Operating Rule

Use this endpoint as the first daily read before deciding what to inspect.

If `queues.totals.notify > 0`, Mantis should prepare a decision brief for Alejandro. Actual Telegram delivery remains a separate approved adapter.

Use `GET /api/crm-vnext/community-decision-brief?queueId=<queueId>&limit=<n>` to generate that no-send decision brief.

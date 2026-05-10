# CRM vNext Readiness API

Date: 2026-05-09
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/readiness`

Local CLI:

`npm run crm:vnext:readiness`

See `docs/crm-vnext/readiness-cli.md`.

## Purpose

Give Mantis a fast local readiness check before running daily briefs, queue monitors, decision briefs, or person-card reads.

The endpoint reports:

- whether the local person-card source can be loaded,
- source counts without local path exposure,
- identity totals,
- queue contract status,
- safety checks for read-only/local operation.

It does not return person rows and does not send or mutate anything.

## Query

- `sourcePath`: optional only outside production or from loopback localhost.

## Response Shape

```json
{
  "ok": true,
  "readiness": {
    "schemaVersion": "crm-vnext-readiness-2026-05-09",
    "mode": "read_only_readiness",
    "status": "ready",
    "source": {
      "kind": "legacy-person-cards-v1",
      "generatedAt": "2026-05-08T12:00:00.000Z",
      "cards": 728
    },
    "totals": {
      "cards": 728,
      "emailPresent": 630,
      "instagramPresent": 103,
      "omnichannel": 5
    },
    "queues": {
      "totals": {
        "queues": 5,
        "notify": 0,
        "watch": 2,
        "ok": 3
      }
    },
    "checks": [],
    "safety": {
      "outboundProhibited": true,
      "recordMutationProhibited": true,
      "localPathsRedacted": true
    }
  }
}
```

If the local source cannot be loaded, the endpoint still returns `ok: true` with `readiness.status = "blocked"` and a generic repair action. It does not expose the failed path.

## Safety

- `GET` only.
- Local/read-only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require the configured internal read token.
- No person rows.
- No local source path exposure.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.

## Mantis Operating Rule

Use readiness as the first operational check.

If `readiness.status = "blocked"`, do not run downstream briefs until the local source issue is repaired.

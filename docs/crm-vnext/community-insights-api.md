# Community Insights API

Date: 2026-05-08
Status: Implemented local/internal API

## Endpoint

`GET /api/crm-vnext/community-insights`

## Purpose

Expose the local Community Insights summary to the internal dashboard and to Mantis-readable tooling.

The endpoint currently reads the generated Person Cards V1 artifact, converts it through the vNext adapter, and returns the dashboard-ready summary.

## Source

Default source:

`~/.openclaw-lakshmi/workspace/memory/projects/crm-memory-fabric/ops/person-cards-v1.json`

Override for local development:

- `CRM_VNEXT_PERSON_CARDS_V1_PATH`
- `sourcePath` query parameter, allowed outside production or from loopback localhost

## Safety

- Read-only.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No credential reads beyond optional internal token comparison.
- No outbound messages.
- Non-loopback production requests fail closed unless `CRM_VNEXT_INSIGHTS_TOKEN` is configured.
- Loopback localhost requests can run without copying tokens into shell history.
- When a token exists, clients must send `Authorization: Bearer <token>` or `x-crm-vnext-token`.

## Query Parameters

- `topLimit`: optional number of top priority people to return, default `10`.
- `sourcePath`: local development or loopback localhost only, for testing alternate local artifacts.

## Response

```json
{
  "ok": true,
  "source": {
    "kind": "legacy-person-cards-v1",
    "path": "...",
    "generatedAt": "2026-05-08T02:41:24.417547+00:00",
    "cards": 728
  },
  "summary": {
    "totals": {},
    "lifecycle": {},
    "nextActions": {},
    "identityGaps": {},
    "topPriority": []
  }
}
```

## Next Step

Build the internal dashboard page against this endpoint, starting with read-only overview and top-priority/contact exploration.

# CRM vNext Community Decision Brief API

Date: 2026-05-09
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/community-decision-brief?queueId=<queueId>&limit=<n>`

Local export script:

`npm run crm:vnext:decision-brief -- --queue-id <queueId>`

See `docs/crm-vnext/community-decision-brief-export.md`.

## Purpose

Give Mantis a no-send decision brief for one CRM vNext queue before any human-facing or outbound move.

This endpoint turns queue data into:

- the decision question,
- approval boundary,
- safe internal options,
- bounded candidate summaries,
- explicit prohibited actions.

It is not a messaging endpoint and not a CRM mutation endpoint.

## Query

- `queueId`: required. One of `ig_without_email`, `email_engaged`, `human_review_required`, `identity_stitching`, `commercial_follow_up`.
- `limit`: optional, default `5`, max `10`.
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
    "mode": "read_only_decision_brief",
    "queue": {
      "id": "ig_without_email",
      "counts": {
        "matched": 98,
        "returned": 5
      }
    },
    "summary": {
      "urgency": "watch",
      "requiresAlejandroDecision": true,
      "recommendedQuestion": "..."
    },
    "decisionOptions": [],
    "candidates": [],
    "safety": {
      "outboundProhibited": true,
      "recordMutationProhibited": true
    }
  }
}
```

The response excludes local source paths. Candidate rows are bounded and intended for internal operator use.

## Safety

- `GET` only.
- Local/read-only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require the configured internal read token.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.

## Mantis Operating Rule

Use this endpoint when a queue implies a real decision, especially:

- `commercial_follow_up`,
- `human_review_required`,
- `ig_without_email` before any email-capture outreach,
- any queue whose status is `notify`.

The output may help Mantis prepare a concise note for Alejandro, but it is still internal. It does not authorize delivery.

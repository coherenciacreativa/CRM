# CRM vNext Person Card API

Date: 2026-05-09
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/person-card?personId=<personId>`

Browser view:

`/crm-vnext/person/[personId]`

## Purpose

Give Mantis exact programmatic access to one vNext person card without scraping the browser detail page.

Use this after a queue, daily brief, or people search identifies a `personId`.

## Query

- `personId`: required. Exact stable person id.
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
  "card": {
    "schemaVersion": "person-card-vnext-2026-05-08",
    "personId": "ig:example",
    "displayName": "Example",
    "identities": {
      "email": null,
      "instagramHandle": "example",
      "phone": null,
      "city": null,
      "country": null
    },
    "channels": {},
    "products": {},
    "scoring": {},
    "nextAction": {},
    "evidence": []
  }
}
```

The response excludes the local source path.

## Errors

- `400 invalid_person_id`
- `404 person_card_not_found`
- `405 method_not_allowed`
- `503 internal_token_not_configured`
- `401 unauthorized`

## Safety

- `GET` only.
- Exact lookup only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require `CRM_VNEXT_INSIGHTS_TOKEN`.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- No record mutation.

## Mantis Operating Rule

Use this endpoint to inspect one person before preparing a decision note.

Do not treat `nextAction` as permission to send anything. It is a planning signal until Alejandro explicitly approves an outbound action.

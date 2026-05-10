# CRM vNext MailerLite Evidence Helper

Date: 2026-05-10
Status: v0 read-only evidence helper

## Purpose

MailerLite Evidence Helper turns CRM person clues into safe subscriber search plans and converts supplied MailerLite results into `mailerlite_export` evidence packets for Deep Local Stitching.

It is the bridge between Alejandro's email-first community layer and CRM identity stitching:

```text
CRM clue -> MailerLite read-only search/export -> evidence packet -> Deep Local Stitching -> Card Apply Preview
```

The CRM should learn from MailerLite, but it should not own or print MailerLite credentials.

## Surfaces

- API: `POST /api/crm-vnext/mailerlite-evidence-helper`
- CLI:

```bash
npm run crm:vnext:mailerlite-evidence -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:mailerlite-evidence -- --search-results-file ./mailerlite-results.json --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:mailerlite-evidence -- --use-mailerlite-cli --text "CRM: @mayuyis2626 es Mayerli."
```

## Operating Modes

Planning only:

- receives a CRM report,
- runs Identity Stitching Research locally,
- emits subscriber search terms,
- returns no evidence packets until results are supplied.

Supplied results:

- receives MailerLite connector/API/export results through `mailerLiteSearchResults`,
- matches them against identity clues,
- emits `evidenceSources` packets with `sourceKind: mailerlite_export`,
- carries fields like email, phone, city, country, status, and groups when present.

Optional local MailerLite CLI search:

- the CLI can call the existing `mailerlite_cli` in read-only `people find` mode,
- it cursor-paginates subscribers with `next_cursor` and filters locally,
- it does not rely on MailerLite's `search` endpoint for completeness,
- if the local API key is expired or invalid, it reports the auth blocker,
- it never prints or rotates credentials.

## API Shape

```json
{
  "text": "CRM: @mayuyis2626 es Mayerli...",
  "sourceKind": "alejandro_conversation",
  "reporter": "Alejandro",
  "channel": "codex",
  "mailerLiteSearchResults": [
    {
      "id": "subscriber-id",
      "email": "person@example.com",
      "name": "Person Name",
      "phone": "+57...",
      "city": "Bogota",
      "country": "Colombia",
      "status": "active",
      "groups": [{ "id": "group-id", "name": "Yoga Colombia" }]
    }
  ]
}
```

## Safety

- Read-only.
- No subscriber create/update/delete/suppress.
- No tag/group/automation/campaign mutation.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No credential read or print.
- API does not call live MailerLite.

## Current Auth Finding

The local CRM `mailerlite_cli` route on this machine was tested in read-only mode and returned:

```text
HTTP 401: Unauthenticated.
```

No credential was printed or touched.

Mantis later confirmed that other OpenClaw MailerLite routes can read subscribers successfully and that complete reads require cursor pagination plus local filtering. The helper/CLI now follows that pattern.

Recommended unblock:

1. Let Mantis/OpenClaw use whichever MailerLite app is currently healthy and supply selected subscriber results as JSON.
2. Or refresh the local MailerLite CLI credential separately, then rerun `npm run crm:vnext:mailerlite-evidence -- --use-mailerlite-cli`.

Do not rotate credentials just because CRM needs evidence; first reuse a healthy existing connector or an explicit export.

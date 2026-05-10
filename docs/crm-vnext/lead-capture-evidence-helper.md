# CRM vNext Lead Capture Evidence Helper v0

Date: 2026-05-10

## Purpose

Create a safe read-only lane for Instagram-origin contacts whose email or phone should exist in the capture trail:

Instagram / ManyChat / Vercel proxy / CRM webhook / MailerLite / WhatsApp automation.

This helper exists for cases like `@cadavid_eli`: Alejandro knows the data was captured, but the current card cannot prove the stitching yet.

## Surfaces

- API: `POST /api/crm-vnext/lead-capture-evidence-helper`
- CLI: `npm run crm:vnext:lead-capture-evidence -- --text <text>`
- Core: `lib/crm/crm-vnext-lead-capture-evidence-helper.ts`

## Inputs

The helper accepts normal CRM fact text plus optional supplied search/export rows:

```json
{
  "text": "@cadavid_eli se llama Eliana y llego por Instagram.",
  "sourceKind": "alejandro_conversation",
  "leadCaptureSearchResults": {
    "leadCaptureRecords": [
      {
        "sourceSystem": "manychat",
        "flow_name": "To CRM copy 2",
        "contact_id": "563924665",
        "instagram_username": "cadavid_eli",
        "email": "eliana@example.com",
        "phone": "+573104954266"
      }
    ]
  }
}
```

Accepted row families include:

- `leadCaptureRecords`
- `manychatResults` / `manyChatResults`
- `webhookEvents` / `webhook_events`
- `events`, `logs`, `rows`, `data`, `items`, `results`

Rows can contain top-level fields, `contact`, `subscriber`, `data`, `payload`, `body`, `meta`, `Full_Contact_Data`, `custom_fields`, or `fields`.

## Output

The helper returns:

- query plans for Mantis: ManyChat, CRM webhook, Vercel proxy, WhatsApp automation, and MailerLite follow-up lookups
- normalized `lead_capture_export` evidence packets
- review signals such as `handle_matched_capture_identity` or `lead_capture_source_hunt_required`
- safety metadata proving no live channel was called

## Safety boundary

Allowed:

- plan searches
- consume read-only selected rows/exports supplied by Mantis/Codex
- produce evidence packets for Deep Local Stitching

Prohibited:

- edit, pause, resume, or test ManyChat LIVE
- call live Instagram or change Instagram permissions
- mutate MailerLite subscribers, groups, tags, or automations
- send WhatsApp, Instagram, email, Telegram, or ManyChat messages
- mutate person cards or Fact Store
- read, print, rotate, or refresh credentials

## Operator playbook for Mantis

1. Run the helper first with the human clue and no results to get source-specific lookup suggestions.
2. Search read-only in the safest available route:
   - ManyChat API/export/browser for `Instagram username`, email, phone, custom fields, and contact id
   - CRM old webhook tables for `webhook_events`, `contacts`, `interactions`
   - Vercel/proxy logs or exports for the lead registration payload
   - MailerLite cursor pagination + local filtering, not `search`
   - WhatsApp/class automation logs for phone evidence
3. Supply selected rows back to the helper as `leadCaptureSearchResults`.
4. Feed resulting `evidenceSources` into Deep Local Stitching, Card Write/Merge Policy, and the approval packet chain.
5. Stop before any write or outbound action unless Alejandro explicitly approves the exact scope.

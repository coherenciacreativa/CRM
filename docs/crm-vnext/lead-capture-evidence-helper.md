# CRM vNext Lead Capture Evidence Helper v0

Date: 2026-05-10

## Purpose

Create a safe read-only lane for Instagram-origin contacts whose email or phone should exist in the capture trail:

Instagram / ManyChat / Vercel proxy / CRM webhook / MailerLite / WhatsApp automation.

This helper exists for cases like `@cadavid_eli`: Alejandro knows the data was captured, but the current card cannot prove the stitching yet.

## Surfaces

- API: `POST /api/crm-vnext/lead-capture-evidence-helper`
- CLI: `npm run crm:vnext:lead-capture-evidence -- --text <text> --out tmp/crm-vnext/lead_capture_evidence.json`
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
   - If ManyChat API/export is blocked but UI is accessible, use exact custom-field filters such as `email_from_buffer is <exact email>` and `email_raw_from_first_dm is <exact email>` before trying any name-only search.
   - CRM old webhook tables for `webhook_events`, `contacts`, `interactions`
   - Vercel/proxy logs or exports for the lead registration payload
   - MailerLite cursor pagination + local filtering, not `search`
   - WhatsApp/class automation logs for phone evidence
3. Supply selected rows back to the helper as `leadCaptureSearchResults`.
4. Feed resulting `evidenceSources` into Deep Local Stitching, Card Write/Merge Policy, and the approval packet chain.
5. Stop before any write or outbound action unless Alejandro explicitly approves the exact scope.

## Eliana / Instagram Onboarding Proof

The Eliana `@cadavid_eli` run is the model case for this lane:

- read-only selected rows from ManyChat cache, old CRM webhook/interactions, and WhatsApp/class automation logs produced 4 `lead_capture_export` evidence packets;
- Card Apply Preview recognized the existing vNext card `email:eli.cadavid@hotmail.com`;
- the planned action became `enrich_existing_card`, not `create_card_candidate`;
- the approval packet no longer re-asks email ownership when the same email is already assigned on the existing vNext card.

This is the pattern Mantis should use later for Instagram-origin leads captured by ManyChat, Vercel proxies, CRM webhook traces, MailerLite, or WhatsApp automation logs.

## Instagram Onboarding Mini-Batches

The 2026-05-12 mini-batch proved the lane can operate beyond a single contact:

- selected MailerLite/onboarding rows were supplied as read-only `leadCaptureRecords`;
- the helper emitted five `lead_capture_export` evidence packets;
- the Batch Operating Loop produced five approval-ready, dry-run-only card previews;
- structured `Name`, `City`, `Country`, phone, and unique Instagram handle fields were preserved into the proposed card drafts when the evidence supported them.

This is now the preferred local pattern for small Instagram/onboarding batches before any card write.

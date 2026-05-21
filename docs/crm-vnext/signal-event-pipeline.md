# CRM vNext Signal Event Pipeline

Date: 2026-05-21
Status: Implemented local CLI

## Purpose

`crm:vnext:signal-event-pipeline` is the first end-to-end local loop for the living CRM:

```text
read-only source snapshot
  -> source adapter
  -> Signal Event Ledger normalization
  -> Signal Event Projection
  -> Engagement Signal Preview
  -> optional Engagement Snapshot Ledger history
```

It lets Mantis or Codex test real engagement movement without mutating cards or touching external systems.

## Local Command

Dry-run a MailerLite engagement snapshot:

```bash
npm run crm:vnext:signal-event-pipeline -- \
  --mailerlite-snapshot-file ~/Documents/Mantis-Reports/crm_vnext_mailerlite_engagement_snapshot_2026-05-15.json \
  --source-label "MailerLite engagement snapshot 2026-05-15" \
  --collector Mantis \
  --out ~/Documents/Mantis-Reports/crm_vnext_signal_event_pipeline_preview_2026-05-21.json
```

Dry-run a Gmail reply discovery:

```bash
npm run crm:vnext:signal-event-pipeline -- \
  --gmail-reply-discovery-file ~/Documents/Mantis-Reports/email_reply_intelligence_discovery_v0_2026-05-15_1536.json \
  --source-label "Gmail newsletter replies 2026-05-15" \
  --collector Mantis
```

Commit local event history and preview movement history after explicit approval:

```bash
npm run crm:vnext:signal-event-pipeline -- \
  --mailerlite-snapshot-file <json> \
  --gmail-reply-discovery-file <json> \
  --write-events \
  --write-snapshot \
  --approved-by Alejandro \
  --source-label "First CRM vNext engagement mini-flow"
```

## Accepted Sources

| Flag | Meaning |
| --- | --- |
| `--mailerlite-snapshot-file` | Converts supplied MailerLite subscriber/campaign engagement rows into email engagement events. |
| `--gmail-reply-discovery-file` | Converts supplied Gmail newsletter reply metadata into email reply events. |
| `--signals-file` | Accepts existing `engagement-signal-preview` signals. |
| `--events-file` | Accepts already canonical signal events, including future Shopify, Bhakti WhatsApp, ClassBot, payment, or Instagram events. |

Multiple source files can be supplied in one run.

## Future Source Pattern

Future sources should emit canonical event-shaped records:

```json
{
  "events": [
    {
      "sourceKind": "shopify",
      "sourceId": "order_123",
      "eventKind": "purchase",
      "channel": "commerce",
      "email": "persona@example.com",
      "observedAt": "2026-05-21T12:00:00.000Z",
      "metrics": {
        "amount": 49,
        "productKind": "digital"
      }
    }
  ]
}
```

or:

```json
{
  "events": [
    {
      "sourceKind": "bhakti_whatsapp",
      "sourceId": "delivery_456",
      "eventKind": "recording_delivery",
      "channel": "whatsapp",
      "phone": "+573001112233",
      "quantity": 1,
      "observedAt": "2026-05-21T12:00:00.000Z"
    }
  ]
}
```

This keeps Shopify, Bhakti WhatsApp, ClassBot, payments, Instagram, and future apps inside one scoring lane instead of creating parallel CRMs.

## Output

The report includes:

- source adapter summaries,
- normalized Signal Event Ledger counts,
- projection counts,
- engagement preview items and unmatched signals,
- optional local snapshot-ledger write receipt,
- safety receipt.

The preview may show warmer/cooler movement, but it is still internal intelligence. It is not permission to contact anyone.

## Safety

Default mode is dry-run.

Allowed only with explicit flags:

- `--write-events --approved-by <name>` appends to `.crm-vnext/signal-events/ledger.jsonl`.
- `--write-snapshot --approved-by <name>` appends to `.crm-vnext/engagement-snapshots/ledger.jsonl`.
- `--out <path>` writes a local report.

Always prohibited:

- card mutation,
- Fact Store write,
- outbound messages,
- live MailerLite/Gmail/Instagram/Shopify/WhatsApp/Google/payment API calls,
- credential reads or prints,
- treating warmth as outreach permission.

Restricted events remain excluded from projection unless `--include-restricted` is supplied deliberately.

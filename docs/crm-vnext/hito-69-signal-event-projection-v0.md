# Hito 69 - Signal Event Projection v0

Date: 2026-05-21
Status: Implemented

## What Changed

CRM vNext can now project canonical Signal Event Ledger events into engagement/scoring preview signals.

Implemented:

- `lib/crm/crm-vnext-signal-event-projection.js`
- `npm run crm:vnext:signal-event-projection`
- `docs/crm-vnext/signal-event-projection.md`
- tests for Shopify/commerce, Bhakti WhatsApp, ClassBot, restricted-event skipping, and end-to-end projection into engagement preview

Also extended the scoring/preview contract to accept:

- WhatsApp/Bhakti activity,
- participation activity,
- commerce/purchase activity,
- future source kinds such as `shopify_activity`, `payment_activity`, `classbot_activity`, and `bhakti_whatsapp_activity`.

## Why It Matters

The previous hito created the canonical event shelf. This hito makes that shelf useful for the living CRM loop:

```text
source event -> Signal Event Ledger -> Signal Event Projection -> Engagement Signal Preview
```

That means future sources can feed one shared system instead of each source becoming its own custom scoring path.

Examples:

- Shopify order -> `purchase` event -> purchase activity -> commercial warmth/product fit preview.
- Bhakti WhatsApp delivery -> `recording_delivery` event -> WhatsApp delivery signal -> relationship/digital-product fit preview.
- ClassBot attendance -> `class_attendance` event -> participation signal -> community depth preview.

## Boundary

This hito does not write scores into cards.

It does not:

- mutate person cards,
- write Fact Store,
- call live Shopify, WhatsApp, MailerLite, Gmail, Instagram, Drive, or payment APIs,
- send outbound,
- read credentials,
- treat projected warmth as permission to contact someone.

Restricted events are skipped by default unless an explicit operator run uses `--include-restricted`.

## Operator Command

Project from the local ledger:

```bash
npm run crm:vnext:signal-event-projection -- \
  --from-ledger \
  --out ~/Documents/Mantis-Reports/crm_vnext_signal_event_projection.json
```

Feed into preview:

```bash
npm run crm:vnext:engagement-signal-preview -- \
  --signals-file ~/Documents/Mantis-Reports/crm_vnext_signal_event_projection.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_engagement_preview.json
```

## Next Leverage

The next high-leverage step is to run this chain on real safe events:

1. store a small approved batch of MailerLite/Gmail/ClassBot or manual events in the Signal Event Ledger,
2. project it,
3. preview scoring movement,
4. store the engagement snapshot if useful.

After that, the dashboard can start showing live movement from a unified event history instead of isolated reports.

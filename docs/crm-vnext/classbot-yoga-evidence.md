# ClassBot Yoga Evidence

Date: 2026-05-20
Status: Implemented as a read-only CRM vNext source helper

## Purpose

`crm:vnext:classbot-yoga-evidence` turns the local ClassBot yoga recipients list and delivery idempotency cache into a CRM vNext evidence packet.

This makes the yoga cohort repeatable for Mantis/Codex:

- current or recent yoga students come from `~/classbot/dispatcher/src/recipients.csv`,
- delivery recency comes from ClassBot idempotency caches,
- existing CRM cards are matched by phone or identity/name tokens,
- every contact gets a dry-run `ready_write_preview`,
- no card write happens inside this helper.

## Command

```bash
npm run crm:vnext:classbot-yoga-evidence -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_classbot_yoga_evidence_$(date +%F).json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_classbot_yoga_evidence_$(date +%F).md
```

Useful overrides:

```bash
npm run crm:vnext:classbot-yoga-evidence -- \
  --classbot-root ~/classbot \
  --card-store-path .crm-vnext/person-card-store/person-cards-vnext.json \
  --out /tmp/classbot-yoga-evidence.json
```

## Safety Boundary

Allowed:

- read ClassBot recipients CSV,
- read ClassBot idempotency caches,
- read local CRM vNext card store,
- write local reports under the requested output paths.

Not allowed:

- execute ClassBot,
- touch Twilio,
- send WhatsApps,
- create or mutate CRM cards,
- write Fact Store,
- call live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp APIs,
- read, print, rotate, or mutate credentials.

## Operator Use

Use this helper before asking Alejandro to manually list yoga students. It gives Mantis a clean source packet with:

- `classbot_display_name`,
- `classbot_program`,
- `classbot_status`,
- `delivery_evidence_summary`,
- candidate CRM card,
- confidence,
- recommended action,
- missing fields,
- concise questions when identity is not strong.

Strong `enrich_existing_card` rows can later be applied only after explicit approval. Medium rows need identity confirmation. Blocked/no-card rows should not become new cards until duplicate risk is reduced.

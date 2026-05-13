# Hito 44 - IG-Origin Batch Prompt v0

Date: 2026-05-14

## Why

After the first Instagram DM UI stitching pass, the next high-leverage move is not to hand-write long prompts for every batch. Alejandro should be able to say "probemos un batch de Instagram" and Mantis should receive a bounded, precise operating packet.

## What Changed

- Added `crm:vnext:ig-origin-batch-prompt`.
- The command reads the local vNext card store and card-write ledger.
- It prioritizes likely Instagram/onboarding contacts by:
  - recent approved writes,
  - missing handle/phone/city/country/context,
  - lead-capture / Instagram / onboarding evidence,
  - low evidence count.
- It emits:
  - JSON packet for auditability,
  - Markdown with a copy-ready prompt for Mantis.

## Command

```bash
npm run crm:vnext:ig-origin-batch-prompt -- \
  --latest-writes 8 \
  --limit 8 \
  --out tmp/crm-vnext/ig_origin_batch_prompt.json \
  --markdown-out ~/Documents/Mantis-Reports/ig_origin_batch_prompt.md
```

## Operator Contract

Mantis should use the prompt to search read-only sources:

- lead-capture / ManyChat / Vercel proxy / Custom GPT proxy traces,
- MailerLite cursor pagination plus local filtering,
- Gmail, Drive, Contacts, local reports when already authenticated,
- Instagram Messages UI only as read-only observation.

If a DM thread reveals useful context, Mantis should capture only compact fields:

- city/country,
- interest and program fit,
- preferences,
- communication tone,
- origin story,
- next-step cues.

Full conversations should not be exported into CRM evidence.

## Safety

This command is read-only and only prepares a prompt. It does not open Instagram, call live APIs, mutate cards, write Fact Store, touch credentials, send outbound messages, or alter ManyChat LIVE.

Any later card write still requires the normal approval packet and explicit Alejandro approval.

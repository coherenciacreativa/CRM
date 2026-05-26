# CRM vNext ManyChat Exact-Anchor Apply

Date: 2026-05-25
Status: Implemented local apply lane

## Purpose

This lane applies high-confidence bridges recovered from ManyChat historical capture plus Instagram read-only corroboration.

It exists because Alejandro's official Instagram onboarding flow often captured email, city, country, phone, and Instagram identity in or around the same welcome conversation. When that bridge is exact, it is high leverage for CRM card coverage.

## Command

Dry-run:

```bash
npm run crm:vnext:manychat-exact-anchor-apply -- \
  --evidence-file ~/Documents/Mantis-Reports/crm_vnext_manychat_exact_anchor_batch12_20260525.json \
  --apply-all-ready \
  --include-human-confirmed-candidates
```

Committed local apply:

```bash
npm run crm:vnext:manychat-exact-anchor-apply -- \
  --evidence-file ~/Documents/Mantis-Reports/crm_vnext_manychat_exact_anchor_batch12_20260525.json \
  --apply-all-ready \
  --include-human-confirmed-candidates \
  --approved-by Alejandro \
  --write \
  --out ~/Documents/Mantis-Reports/crm_vnext_manychat_exact_anchor_batch12_apply_20260525.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_manychat_exact_anchor_batch12_apply_20260525.md
```

## Promotion Rules

Allowed for local card write:

- `ready_for_write_review` exact-anchor items.
- `ready_for_human_confirmation_with_handle_candidate` only with `--include-human-confirmed-candidates` after Alejandro explicitly approves.
- Email and Instagram handle must both be present.
- Existing email/handle collisions block the item.
- Display names prefer explicit `derivedName`, corroborated Instagram UI names, then the ManyChat profile name. ManyChat `firstName` / `lastName` fields are fallback only because they can be split incorrectly and duplicate surnames.

Blocked:

- `review_only_email_variant`.
- name-only Instagram hits.
- similar handles or display names without an exact bridge.
- any item with conflicting email, handle, or phone on an existing card.

## Writes

The command may:

- create a new local vNext card when no card exists and email+IG are strongly anchored;
- enrich an existing local vNext card with missing email/IG/phone/city/country;
- append compact evidence;
- append local ledger entries;
- create a backup before commit.

The command never:

- calls ManyChat, Instagram, Gmail, MailerLite, Drive, Contacts, WhatsApp, or Telegram;
- sends outbound messages;
- writes Fact Store;
- mutates ManyChat LIVE or Instagram state;
- reads or changes credentials.

## Why This Matters

This makes the official-flow stitching procedure reusable by Mantis, Codex, or another future agent. The agent that does the UI recovery can produce the JSON packet; this local apply lane performs the disciplined, auditable card write.

# Hito 83 - Source Result Ledger v0

Date: 2026-05-25
Status: implemented

## Why

The ManyChat UI retry exposed a subtle operator risk: a report can say "no bridge found" while mixing two very different cases.

- Some contacts had exact ManyChat profiles opened read-only; the visible onboarding fields explicitly showed no captured email.
- Other contacts were only searched through the current free ManyChat UI search box, which is name-oriented and did not surface the needed custom-field filter.

Those should not have the same operational meaning.

## What Changed

Added:

- `npm run crm:vnext:source-result-ledger`;
- local append-only ledger `.crm-vnext/source-result-ledger/ledger.jsonl`;
- operator documentation in `docs/crm-vnext/source-result-ledger.md`;
- Mantis Natural Batch Protocol hardening for `sourceResultStatus`, `sourceExhaustion`, `resultStrength`, and `retryPolicy`.

## Result Classes

- `bridge_found`
- `found_profile_no_requested_bridge`
- `not_found_limited_search`
- `not_found_exhaustive`
- `blocked`

## Boundary

This hito does not mutate person cards, Fact Store, scores, ManyChat LIVE, Instagram, MailerLite, Google, WhatsApp, Telegram, or outbound channels.

It only preserves source-check memory so future agents do not repeat weak work or bury useful retry candidates.

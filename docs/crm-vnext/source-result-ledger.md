# CRM vNext Source Result Ledger

Date: 2026-05-25
Status: implemented local append-only ledger

## Purpose

The source result ledger records what a specific source check actually proved for a specific contact.

This is different from the global source ledger:

- Source ledger: is the source healthy or blocked?
- Source result ledger: for this contact, did this source prove a bridge, fail strongly, fail weakly, or never really run?

The goal is to keep Mantis, Codex, and future agents from repeating weak searches or treating weak searches as exhausted evidence.

## Command

Preview:

```bash
npm run crm:vnext:source-result-ledger -- \
  --report-file ~/Documents/Mantis-Reports/crm_vnext_next8_manychat_ui_retry_20260525.json
```

Append to local ledger and write a delivery report:

```bash
npm run crm:vnext:source-result-ledger -- \
  --report-file ~/Documents/Mantis-Reports/crm_vnext_next8_manychat_ui_retry_20260525.json \
  --run-label manychat-ui-next8-retry-20260525 \
  --recorded-by Codex \
  --write \
  --out ~/Documents/Mantis-Reports/crm_vnext_source_result_ledger_manychat_next8_20260525.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_source_result_ledger_manychat_next8_20260525.md
```

Local append-only ledger:

```text
.crm-vnext/source-result-ledger/ledger.jsonl
```

## Result Classes

`bridge_found`

A source found a usable bridge, still subject to the normal card-write approval path.

`found_profile_no_requested_bridge`

The exact source profile or thread was found and inspected, but the requested bridge was not visible. Example: ManyChat profile exists for `@gabrielrojas_r`, but visible fields say `has_email_from_buffer: No` and `has_email_in_first_dm: No`.

This is a strong negative only for those visible fields. It does not mean Gmail, MailerLite, Instagram thread history, Drive, or human memory cannot still provide the missing field.

`not_found_limited_search`

The source returned no result, but the search route was limited. Example: ManyChat free UI simple search is labeled `Search by name..`, so an email search returning zero is not enough to conclude the person is absent from ManyChat.

These should not be buried. They should be retried only with a stronger route: custom-field filter, export/API if available, or another exact-anchor lane.

`not_found_exhaustive`

The report declares a source-appropriate exact-anchor search and no match. Do not repeat the same method unless new anchors appear.

`blocked`

No evidence result yet. The correct state is `awaiting_human_unblock`, then retry.

## Operator Use

Mantis should include these fields when returning future source-recovery reports:

- `sourceResultStatus`;
- `sourceExhaustion`;
- `resultStrength`;
- `retryPolicy`;
- `methodClass`;
- `whyNotExhausted` when the result is weak.

The important operational distinction:

- `found_profile_no_requested_bridge` can reduce repeat work for that exact source profile.
- `not_found_limited_search` should stay alive as a retry candidate when a stronger source lane becomes available.

## Safety

This ledger does not authorize writes to person cards, Fact Store, ManyChat LIVE, MailerLite, Google, Instagram, WhatsApp, Telegram, or any outbound channel.

It is provenance and operator memory only.

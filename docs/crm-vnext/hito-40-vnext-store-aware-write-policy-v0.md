# Hito 40: vNext Store-Aware Write Policy v0

Date: 2026-05-11

## What Changed

The card proposal and write-review chain now prefers the local vNext card store when it exists:

```text
.crm-vnext/person-card-store/person-cards-vnext.json
```

Updated read-only surfaces:

- `POST /api/crm-vnext/identity-stitching-research`
- `POST /api/crm-vnext/multi-service-card-proposal`
- `POST /api/crm-vnext/card-write-merge-policy`
- `POST /api/crm-vnext/card-apply-preview`
- `POST /api/crm-vnext/card-write-approval-packet`

The approval-packet CLI also accepts:

```bash
npm run crm:vnext:card-write-approval-packet -- --connected-evidence-only --evidence-file <json> --text <batch>
```

## Why It Matters

CRM vNext is no longer only reading the original legacy card snapshot for write decisions. If Mantis/Codex already materialized a card locally, future runs should enrich that existing card instead of proposing another candidate.

Eliana `@cadavid_eli` is the proving case:

- lead-capture evidence confirmed email, phone, Instagram, ManyChat, old CRM webhook, and WhatsApp/class automation traces;
- the existing vNext card `email:eli.cadavid@hotmail.com` was detected;
- Card Apply Preview returned `enrich_existing_card`;
- Card Write Apply dry-run selected 1 ready item and planned 4 operations with `operationsExecuted: 0`;
- no card write was committed.

## Safety

No cards were mutated.

No Fact Store write happened.

No ManyChat LIVE, Instagram, MailerLite, Gmail, Drive, Contacts, WhatsApp, Telegram, or credential action happened.

This hito only improves which local card source the read-only policy chain sees.

## Operator Rule

For natural Mantis batches, use the vNext-aware chain before asking Alejandro for write approval:

```text
Mantis evidence JSON -> import/helper -> card-apply-preview -> card-write-approval-packet -> optional card-write-apply dry-run
```

Ask for explicit approval only after the packet says `ready_for_human_approval`.

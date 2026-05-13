# Hito 42 - Recent Writes Human Enrichment v0

Date: 2026-05-14

## Why

After the first approved local writes, CRM vNext needed a tighter loop for Alejandro's human memory.

The system can now ask, "what do we need to ask Alejandro about the people we just wrote?" without requiring Mantis or Codex to manually copy person IDs from the card-write ledger.

This keeps new cards from becoming technically present but relationally thin.

## What Changed

- Extended `crm:vnext:human-enrichment-questions` with card-write ledger seeding.
- Added `--latest-writes <n>` to select the latest unique committed `upsert_vnext_card` entries.
- Added `--from-card-write-ledger`, `--card-write-ledger-path`, and `--since <iso-date>` for controlled local follow-up packets.
- Documented the pattern in the natural batch protocol so Mantis can use it after `card-write-apply`.

## Operator Pattern

After an approved local write:

```bash
npm run crm:vnext:human-enrichment-questions -- \
  --latest-writes 5 \
  --out tmp/crm-vnext/<slug>_latest_writes_human_questions.json \
  --markdown-out tmp/crm-vnext/<slug>_latest_writes_human_questions.md
```

The output should be used to ask Alejandro for relationship context, program participation, origin story, missing contact fields, current role, and next-step intuition.

Alejandro's answers still go through Fact Intake, evidence search, or a later approved card enrichment path. This command is not itself a card mutation path.

## Safety

Read-only.

No card mutation, Fact Store write, outbound message, live API call, credential read, or external-channel change.


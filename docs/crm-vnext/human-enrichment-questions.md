# CRM vNext Human Enrichment Questions

Date: 2026-05-11
Status: v0 local read-only command

## Purpose

After a batch has been imported, reviewed, or locally written, Alejandro often knows relationship context that is not in MailerLite, Google, Instagram, or old CSVs.

This command turns a batch loop plus selected person IDs into a person-by-person interview sheet. It asks Alejandro what he remembers about each contact: programs, roles, origin story, current relationship, missing contact fields, and next-step context.

The output is intentionally not a write path. Alejandro's answers should go back through Fact Intake, Mantis evidence search, or a later approved card-write batch.

## Command

```bash
npm run crm:vnext:human-enrichment-questions -- \
  --batch-loop-file tmp/crm-vnext/<slug>_loop.json \
  --person-id ig:cielo_gom_g \
  --out tmp/crm-vnext/<slug>_human_questions.json \
  --markdown-out tmp/crm-vnext/<slug>_human_questions.md
```

Use `--person-id` repeatedly or comma-separated when Alejandro wants to add a person outside the current batch, such as a recently written card.

After approved local writes, the command can seed itself directly from the card-write ledger:

```bash
npm run crm:vnext:human-enrichment-questions -- \
  --latest-writes 5 \
  --out tmp/crm-vnext/latest_writes_human_questions.json \
  --markdown-out tmp/crm-vnext/latest_writes_human_questions.md
```

Use this when Alejandro says something like "preguntame por los ultimos contactos que escribimos" or when Mantis needs to close the loop after `card-write-apply`. The ledger path defaults to `.crm-vnext/card-write-apply/ledger.jsonl`, and only committed `upsert_vnext_card` entries are included; staged merge reviews remain outside this question sheet until resolved.

## When To Use

Use after:

- a Mantis natural batch,
- a card-write approval/apply,
- a difficult identity hunt,
- or any moment where Alejandro says "I know more about this person."

This is especially useful for contacts who already have a rough card but lack the human layer: how they arrived, which programs they actually belong to, whether they are a client, what they might need next, and what tone/context Mantis should remember.

## Safety

- Read-only.
- No card mutation.
- No Fact Store write.
- No live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts calls.
- No credentials.
- No outbound.

The packet can be used to prepare future facts, but writing those facts or cards still requires a separate explicit approval.

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

## Compact Review Mode

When Alejandro needs to review several contacts quickly, use compact mode:

```bash
npm run crm:vnext:human-enrichment-questions -- \
  --questions-file ~/Documents/Mantis-Reports/<existing-human-questions>.json \
  --format compact \
  --markdown-out ~/Documents/Mantis-Reports/<compact-review>.md
```

Compact mode keeps the heavy evidence JSON intact but renders a shorter sheet:

- person name / handle,
- optional Instagram profile screenshot,
- a short "Tenemos" list,
- short memory cues from existing evidence when available, such as a sanitized reply snippet or IG/onboarding clue,
- a short "Completar si recuerdas" list,
- one freestyle response box.

Use memory cues to help Alejandro recognize the person quickly. Keep them short and sanitized; this sheet should not become a long email or chat export.

If Mantis has captured read-only Instagram profile screenshots, pass a manifest:

```bash
--profile-screenshot-manifest ~/Documents/Mantis-Reports/<profile-screenshots-manifest>.json
```

Manifest values can be keyed by `personId`, handle, or email:

```json
{
  "ig:cielo_gom_g": "/Users/alejandrogomez/Documents/Mantis-Reports/profile-screenshots/cielo_gom_g.png",
  "@cadavid_eli": {
    "path": "/Users/alejandrogomez/Documents/Mantis-Reports/profile-screenshots/cadavid_eli.png",
    "source": "instagram_ui_profile_screenshot",
    "capturedAt": "2026-05-15T12:00:00.000Z"
  }
}
```

Screenshot capture itself stays outside this command. Mantis may gather it through Instagram UI only in read-only mode; if Instagram asks for login, Relay, permissions, checkpoint, CAPTCHA, or any human action, Mantis must pause and ask Alejandro to unblock before retrying.

## When To Use

Use after:

- a Mantis natural batch,
- a card-write approval/apply,
- a difficult identity hunt,
- or any moment where Alejandro says "I know more about this person."

This is especially useful for contacts who already have a rough card but lack the human layer: how they arrived, which programs they actually belong to, whether they are a client, what they might need next, and what tone/context Mantis should remember.

Use compact mode first when the goal is fast memory capture. Use verbose mode when auditing evidence or debugging a batch.

## Safety

- Read-only.
- No card mutation.
- No Fact Store write.
- No live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts calls.
- No credentials.
- No outbound.

The packet can be used to prepare future facts, but writing those facts or cards still requires a separate explicit approval.

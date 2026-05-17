# Hito 59 - Human Enrichment Compact Review v0

Date: 2026-05-15
Status: Completed

## Why

The previous human-enrichment sheet was useful for audit, but too verbose for Alejandro to answer quickly. The needed surface is lighter:

- recognize the person,
- see the few known facts,
- optionally see the Instagram profile,
- write a freestyle memory.

The heavy evidence should stay available to Mantis/Codex, but not sit in Alejandro's way.

## What Changed

`crm:vnext:human-enrichment-questions` now supports:

- `--format compact`
- `--questions-file <path>` to re-render an existing packet without rebuilding it
- `--profile-screenshot-manifest <path>` for local Instagram profile screenshots

Compact markdown renders:

- name / handle,
- optional profile screenshot,
- `Tenemos`,
- short memory cues from existing evidence,
- `Completar si recuerdas`,
- `Respuesta libre`.

Update 2026-05-17: compact sheets now include up to two short sanitized memory cues from existing evidence when available. This helps Alejandro recognize people from a newsletter reply or IG/onboarding clue without forcing him to inspect the full evidence packet.

## Screenshot Rule

Screenshot capture remains outside this command. Mantis may gather Instagram profile screenshots only in strict read-only mode. If Instagram asks for login, Relay/browser permission, checkpoint, CAPTCHA, saved-profile selection, or any human action, Mantis must stop and ask Alejandro to unblock before retrying.

## Command

```bash
npm run crm:vnext:human-enrichment-questions -- \
  --questions-file ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_questions_2026-05-15.json \
  --format compact \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_compact_review_2026-05-15.md
```

With screenshots:

```bash
npm run crm:vnext:human-enrichment-questions -- \
  --questions-file <questions.json> \
  --format compact \
  --profile-screenshot-manifest <screenshots-manifest.json> \
  --markdown-out <compact-review.md>
```

## Safety

Read-only. No card mutation, no Fact Store write, no Instagram/Gmail/Drive/MailerLite/ManyChat/WhatsApp/Telegram calls, no credential reads, and no outbound messages.

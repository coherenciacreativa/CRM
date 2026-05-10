# CRM vNext Evidence Source Expansion

Date: 2026-05-10
Status: v0 read-only local evidence expansion

## Purpose

Evidence Source Expansion makes stitching less narrow.

When Alejandro gives a clue like:

```text
@mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros.
```

the CRM should not jump from "no current card found" to "create new card" too quickly. It should first ask:

```text
Where else might this person appear on this computer or in connected read-only sources?
```

## Current v0 Scope

The implemented v0 expands `Deep Local Stitching` beyond memory-only search.

It can search:

- OpenClaw/local memory,
- downloaded/local CSVs,
- retreat attendee or registration tables in text/CSV form,
- local contact exports such as `.csv`, `.vcf`, and Apple `.contact` text files,
- targeted safe document roots configured as local evidence sources.

Current default expanded roots are high-signal folders only:

- local memory,
- `Downloads`,
- local contact exports,
- local social/contact tables,
- Mantis report exports,
- known workshop/contact tables.

It classifies evidence into source families:

- `telegram_chat_memory`
- `crm_memory_fabric`
- `workspace_memory`
- `local_csv`
- `retreat_table`
- `contacts_export`
- `downloaded_file`

## Future Adapters

Evidence adapters should keep the same contract:

- Gmail read-only search through `gmail-evidence-helper.md`,
- macOS/Google Contacts read-only search,
- MailerLite deeper tag/segment snapshots,
- parsed Excel `.xlsx` attendee tables,
- future Instagram/Mailer live sources only after explicit authorization.

Every adapter should return snippets with provenance, confidence, and source family. No adapter should mutate person cards directly.

## Connected Evidence Packets

`Deep Local Stitching` accepts supplied evidence packets through `evidenceSources`.

This lets Mantis/Codex do a read-only Gmail or Contacts investigation outside the CRM app and then pass selected findings into the same scoring/review flow:

```json
{
  "evidenceSources": [
    {
      "sourceKind": "contacts_app_export",
      "sourceId": "contacts-app:mayerli",
      "title": "Mayerli",
      "email": "mayerli@example.com",
      "handle": "@mayuyis2626",
      "text": "Contacto relacionado con yoga y retiros."
    }
  ]
}
```

Supported connected packet kinds include:

- `gmail_export`
- `contacts_app_export`
- `contacts_export`
- `retreat_table`
- `local_csv`

The packet path keeps connector permissions outside the CRM runtime while still giving the stitching engine structured evidence.

## Operator Rule

Use expanded evidence search before accepting `create_new_card_candidate`.

If evidence exists, the correct output is usually:

```text
defer_new_card_creation
```

Then Mantis can prepare a review packet instead of asking Alejandro to manually remember every scattered clue.

## Guardrails

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No live external API calls in this v0.
- No credential reads.
- No absolute local filesystem paths in API output.
- Snippets are evidence for review, not final truth.

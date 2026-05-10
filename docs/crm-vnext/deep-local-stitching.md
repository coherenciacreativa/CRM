# CRM vNext Deep Local Stitching

Date: 2026-05-10
Status: v0 read-only local evidence search

## Purpose

Deep Local Stitching searches configured local evidence before accepting a new-card recommendation.

It exists for cases like Mayerli:

```text
CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.
```

Identity Stitching Research can correctly say: "I do not see an existing card or Mailer bridge candidate."

Deep Local Stitching adds: "Before creating a new card, look in local memory, CSVs, retreat tables, and contact exports for older evidence."

## Surfaces

- Browser route: `/crm-vnext/deep-local-stitching`
- API: `POST /api/crm-vnext/deep-local-stitching`
- CLI:

```bash
npm run crm:vnext:deep-local-stitching -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:deep-local-stitching -- --source-kind alejandro_conversation --reporter Alejandro --channel codex --text-file ./batch.txt
npm run crm:vnext:deep-local-stitching -- --include-expanded-sources --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:deep-local-stitching -- --evidence-file ./gmail-contact-evidence.json --text "CRM: @mayuyis2626 es Mayerli."
```

## Sources

By default, v0 searches configured local memory files.

With `includeExpandedSources` or `--include-expanded-sources`, it can also search read-only local evidence files:

- downloaded/local CSVs,
- retreat attendee or registration tables in text/CSV form,
- contact exports such as `.csv`, `.vcf`, or Apple `.contact` text files,
- targeted documents under configured local evidence roots.

Default memory source family:

- OpenClaw workspace memory,
- CRM memory fabric,
- Telegram chat memory/worklogs stored locally.

It uses high-signal roots rather than broad whole-disk scans. It skips hidden folders, temp folders, `.env*`, credential/secret/token-like filenames, `node_modules`, `.next`, and unsupported binary file types. Excel `.xlsx` files are not parsed in this v0 unless exported to CSV or wired through a future table parser.

It does **not** call MailerLite, Instagram, ManyChat, WhatsApp, Telegram, Gmail, or email APIs.

Gmail, the macOS Contacts app, MailerLite, Google Drive/Docs/Sheets, and lead-capture traces can be supplied as read-only evidence packets through `evidenceSources`. The CRM app does not need live connector credentials for this; Mantis/Codex can investigate with a connector or export, then pass selected snippets into stitching.

Use:

- `POST /api/crm-vnext/gmail-evidence-helper` or `npm run crm:vnext:gmail-evidence`
- `POST /api/crm-vnext/contacts-evidence-helper` or `npm run crm:vnext:contacts-evidence`
- `POST /api/crm-vnext/mailerlite-evidence-helper` or `npm run crm:vnext:mailerlite-evidence`
- `POST /api/crm-vnext/google-drive-evidence-helper` or `npm run crm:vnext:google-drive-evidence`
- `POST /api/crm-vnext/lead-capture-evidence-helper` or `npm run crm:vnext:lead-capture-evidence`

These helpers create evidence packets; they do not approve card writes.

Example `evidenceSources` item:

```json
{
  "sourceKind": "mailerlite_export",
  "sourceId": "mailerlite:subscriber:example",
  "title": "Mayerli",
  "email": "example@example.com",
  "snippet": "Name: Mayerli. Groups: Yoga Colombia."
}
```

For Drive/Sheets retreat rows where an email may belong to a family member or companion, the packet should mark `emailOwnership: family_or_companion` before conversion. Deep Local Stitching then carries `family_email_review_required`, and Card Apply Preview keeps the email as a candidate instead of assigning it.

## Output

Each clue receives:

- identity research recommendation,
- local evidence hits,
- redacted source id,
- snippet,
- score/confidence,
- context signals,
- identity signals extracted from evidence:
  - full-name candidates,
  - email candidates,
  - phone candidates,
  - Instagram handles,
- recommendation.

Hits are selected with source diversity, so repeated memory snippets do not hide a lower-ranked but more useful identity source such as a Zoom chat download, contact export, Gmail packet, or retreat table.

The clue-level `identitySummary` also makes missing contact fields explicit. This lets Mantis distinguish:

```text
identity enriched: full name + Instagram handle found
contact incomplete: email + phone still missing
```

Important actions:

- `defer_new_card_creation`: local evidence exists; do not create a new card yet.
- `review_deep_local_evidence`: evidence exists for a clue that was not necessarily a new-card case.
- `new_card_creation_not_blocked_by_deep_search`: configured local evidence did not add evidence.
- `needs_more_identity`: still too little evidence.

## Mayerli Smoke

For the real Mayerli clue, v0 found local Telegram memory from the Juana coordination lane:

```text
Juana reporta que Mayerli y su esposo no podrán asistir al retiro por cruce con otro evento.
```

That changes the operational recommendation from "create new card" to:

```text
defer_new_card_creation
```

Meaning: local context exists and should be reviewed before creating a card from scratch.

The 2026-05-10 identity extraction pass also found a stronger full-name candidate for this same clue:

```text
Gladys Mayerli Garcia Ortegon
```

It appeared in:

- a read-only Gmail/Zoom evidence packet,
- a read-only Contacts evidence packet with a phone candidate,
- a downloaded Zoom chat file.

Google Drive/Sheets evidence later added retreat/program rows with phone candidate `3115381341` and two email candidates, `mayariana@hotmail.com` and `mayaariana@hotmail.com`. Because Alejandro remembers those emails may belong to Ariana/family, the system keeps the emails review-only and does not assign them to Mayerli.

The current next evidence action is therefore email ownership confirmation, not clean new-card creation.

## Safety

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No outbound channels.
- No live API calls.
- No credential reads or refreshes.
- Absolute local filesystem paths are redacted from API output.
- Snippets are evidence for review, not final truth.

## Operator Rule

Use this after Identity Stitching Research and before Multi-Service Card Proposal whenever a clue would become a new card.

Mantis should use it to do the boring detective work first, then ask Alejandro only for the decision that truly requires him.

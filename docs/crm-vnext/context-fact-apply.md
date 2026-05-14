# CRM vNext Context Fact Apply

Date: 2026-05-14
Status: v0 local gated command

## Purpose

`context-fact-apply` is the controlled write lane after `context-fact-proposals`.

The proposal step says: "this piece of Mantis evidence looks worth remembering." The apply step says: "Alejandro approved this exact proposal, so append it to the existing local person card evidence with backup and ledger."

This keeps the CRM alive without turning every clue into automatic memory.

## CLI

Dry-run a proposal packet:

```bash
npm run crm:vnext:context-fact-apply -- \
  --proposal-file ~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_apply_dry_run_2026-05-14.json
```

Commit specific approved proposals:

```bash
npm run crm:vnext:context-fact-apply -- \
  --proposal-file <json> \
  --proposal-id <proposal-id> \
  --approved-by Alejandro \
  --write
```

Useful options:

```bash
--proposal-id <id>       # may be repeated
--apply-all-ready        # selects all promote_to_card_evidence proposals
--card-store-path <path>
--ledger-path <path>
--backup-dir <path>
--approved-by <name>     # required with --write
--write                  # required for local commits
--out <json>
--fail-on-blocked
```

## Commit Requirements

A committed write requires all of these:

- `--write`
- `--approved-by`
- at least one explicit `--proposal-id`, or `--apply-all-ready`
- selected proposals must have `promotionAction: promote_to_card_evidence`
- selected proposals must point to an existing local vNext card
- selected proposals must include `suggestedCardEvidence`
- proposed evidence must not already be present on the card

## What It Writes

On commit, the command writes only:

- a backup of the local vNext card store,
- appended `evidence` entries on existing cards,
- a local JSONL context-fact apply ledger,
- provenance entries inside the local card store.

It does not create cards and does not mutate identity, scoring, product, service, channel, or outbound fields.

## Safety

- Dry-run by default.
- No Fact Store writes.
- No outbound messages.
- No live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts APIs.
- No credential reads or mutations.
- No ManyChat LIVE mutation.
- Review-only, weak, duplicate, or sensitive proposals remain blocked.

## Operator Rule

Mantis can use this as the "approved memory append" lane after Alejandro reviews a context proposal sheet.

For broad batches, prefer starting with explicit proposal IDs instead of `--apply-all-ready`. The all-ready path exists for later, once the proposal quality is consistently boring in the best possible way.

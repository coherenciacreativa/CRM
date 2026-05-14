# Hito 47 - Context Fact Apply v0

Date: 2026-05-14
Status: shipped locally, dry-run first

## Why This Exists

Hito 46 created context/fact proposals from rich Mantis evidence. This hito adds the next small but important hinge: approved proposals can now become local card evidence without reopening the whole card-write machinery.

In plain terms: Mantis can find useful story/context, Codex can convert it into reviewable proposals, Alejandro can approve exact items, and the CRM can remember them with backup and provenance.

## New Command

```bash
npm run crm:vnext:context-fact-apply -- --proposal-file <json>
```

The command is dry-run by default. A real local write requires:

```bash
--proposal-id <id>
--approved-by Alejandro
--write
```

or, later when quality is trusted:

```bash
--apply-all-ready
--approved-by Alejandro
--write
```

## Real Dry Run

Input:

```text
~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.json
```

Output:

```text
~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_apply_dry_run_2026-05-14.json
```

The dry-run plans local card evidence appends only. It executes zero writes unless explicitly committed.

## What It Protects

The command blocks:

- proposals that are review-only,
- missing proposal IDs,
- missing target cards,
- missing evidence notes/sources,
- duplicate evidence already on the card,
- commits without `approvedBy`,
- commits without explicit proposal selection or `--apply-all-ready`.

## Safety

No mutations are made to:

- Fact Store,
- ManyChat,
- Instagram,
- MailerLite,
- Gmail/Drive/Contacts,
- Telegram/WhatsApp/email/outbound channels,
- credentials,
- identity/scoring/product/channel fields.

Committed writes, when approved, touch only:

- the local vNext card store,
- its local backup,
- the local context-fact apply ledger,
- local provenance.

## Next Logical Step

Use the generated dry-run report to choose a small first set of proposal IDs from the IG-origin batch. Good first candidates are clear positive memories such as Rocio, Martha, Katy, Angélica, and Cielo-style context; review-only identity gaps should remain blocked until stronger evidence arrives.

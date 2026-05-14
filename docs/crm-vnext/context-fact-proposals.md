# CRM vNext Context Fact Proposals

Date: 2026-05-14
Status: v0 local read-only command

## Purpose

`context-fact-proposals` is the bridge between rich Mantis evidence and future card memory.

Card stitching answers questions such as:

- who is this person?
- do we know their email, phone, Instagram, city, or country?
- should we create, enrich, merge, or defer?

Context fact proposals answer the next layer:

- how did this person arrive?
- what did they express?
- what relationship context should Mantis remember?
- what evidence should stay review-only because it is weak, negative, sensitive, or a collision?

## CLI

```bash
npm run crm:vnext:context-fact-proposals -- \
  --evidence-file tmp/crm-vnext/ig_origin_batch_mantis_import_20260514.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.md
```

Accepted input:

- a JSON array of evidence sources,
- or an object with `evidenceSources`.

The command also reads the local vNext card store by default:

```text
.crm-vnext/person-card-store/person-cards-vnext.json
```

This lets the report attach proposals to existing cards when email, phone, or Instagram handle matches.

## Output

Each proposal includes:

- `targetPersonId`,
- display name and matched identity,
- `contextKind`,
- proposed statement,
- confidence,
- sensitivity,
- promotion action,
- original evidence source,
- optional `suggestedCardEvidence`.

Promotion actions:

- `promote_to_card_evidence`: good candidate for a future approved local card evidence write.
- `hold_review_only`: preserve, but do not promote yet.
- `ignore_duplicate`: already appears to be present on the card.

Context kinds currently include origin story, relationship context, engagement context, product interest, location context, identity bridge context, identity gaps, review-only collisions, tone/preference context, and general notes.

## Safety

- Read-only by default and in v0.
- No card writes.
- No Fact Store writes.
- No outbound messages.
- No live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts APIs.
- No credential reads or mutations.
- A proposal is not approval.

## Real Batch

The first real IG-origin batch produced:

- 35 evidence sources read.
- 33 context proposals.
- 27 ready for human approval.
- 6 review-only.
- 8 target people.
- 0 operations executed.

The report was saved to:

```text
~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.json
~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.md
```

Review-only examples included Edwin's missing IG handle and weak/collision evidence around Ana Ch and `_._only_lu_._`.

## Next Step

The next lane should apply a reviewed subset of these proposals to local card evidence, with:

- explicit proposal IDs,
- `approvedBy`,
- backup,
- local ledger,
- no Fact Store write,
- no external calls,
- and no outbound permission.


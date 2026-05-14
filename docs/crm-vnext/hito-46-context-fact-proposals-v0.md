# Hito 46 - Context Fact Proposals v0

Date: 2026-05-14
Status: shipped locally, read-only

## Why This Exists

The previous hito preserved rich evidence from Mantis. This hito turns that preserved evidence into reviewable memory proposals.

That matters because the CRM should not only know that a contact has an email or Instagram handle. It should also remember the human context: how the person arrived, what they expressed, what relationship exists, what should be followed up, and what should stay blocked or review-only.

## New Command

```bash
npm run crm:vnext:context-fact-proposals -- --evidence-file <json>
```

Useful options:

```bash
--card-store-path <path>
--out <json>
--markdown-out <md>
--fail-on-empty
```

## Real Dry Run

Input:

```text
tmp/crm-vnext/ig_origin_batch_mantis_import_20260514.json
```

Outputs:

```text
~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.json
~/Documents/Mantis-Reports/crm_vnext_ig_origin_context_fact_proposals_2026-05-14.md
```

Result:

- 35 evidence sources read.
- 741 cards available for matching.
- 33 proposals.
- 27 ready for human approval.
- 6 review-only.
- 8 target people.
- 0 operations executed.
- No card writes.
- No Fact Store writes.
- No live APIs.

## What It Protects

Negative or weak identity evidence is held back. For example:

- Edwin: IG Messages UI found the email, but no handle was recoverable.
- Ana Ch: loose Diana Chavarro collision must not be assigned.
- `_._only_lu_._`: Lu Marquez matched-message block is not proven to be the same identity.

Positive context becomes a candidate for future approved card evidence. Examples:

- Martha: prior Kamadhenu context and positive onboarding experience.
- Katy: connected with the welcome message and left Medellin/Colombia context.
- Rocio: interested in Alejandro's yoga/retreat material despite distance.

## Safety

This is proposal-only. It does not mutate:

- person cards,
- Fact Store,
- ManyChat,
- Instagram,
- MailerLite,
- Gmail/Drive/Contacts,
- Telegram/WhatsApp/email/outbound channels.

## Next Logical Hito

Build `context-fact-apply`:

```text
proposal packet
-> explicit proposal IDs
-> approvedBy
-> backup
-> local card evidence append
-> local ledger
```

That will let Alejandro approve selected memories and let Mantis keep the cards alive without re-entering the same context manually.


# CRM vNext Source Of Truth Map

Date: 2026-05-21
Status: ADR / operator architecture

## Decision

CRM vNext has one current operating source of truth for community cards:

```text
.crm-vnext/person-card-store/person-cards-vnext.json
```

Everything else has a defined supporting role. This prevents two CRMs from forming in parallel.

## Canonical Local State

| Layer | Canonical path | Role |
| --- | --- | --- |
| Person cards | `.crm-vnext/person-card-store/person-cards-vnext.json` | Current consolidated profile per person. This is what Mantis, dashboards, and write policies should prefer. |
| Card write provenance | `.crm-vnext/card-write-apply/ledger.jsonl` and related write ledgers | Local record of approved card writes and staged merge decisions. |
| Fact Store | `.crm-vnext/fact-store/facts.jsonl` | Approved durable facts that are not automatically card state. |
| Signal Event Ledger | `.crm-vnext/signal-events/ledger.jsonl` | Canonical event/observation history below scoring and cards. |
| Engagement Snapshot Ledger | `.crm-vnext/engagement-snapshots/ledger.jsonl` | Reviewed score-movement history produced from engagement previews. |
| Encrypted snapshots | `.crm-vnext/snapshots/local/*.tgz.enc` + iCloud ciphertext copy | Disaster recovery for the local CRM vNext state. |

## Source Roles

| Source | Current role | Authority |
| --- | --- | --- |
| MailerLite | High-value read source for subscriber identity, groups, status, opens/clicks. Use cursor pagination + local filtering. | Evidence/signals source, not direct card authority by itself. |
| Gmail / newsletter replies | High-value read source for human replies and relationship context. Use metadata/redacted snippets. | Signal/evidence source. No email body export by default. |
| Instagram UI | High-value read-only source recovery lane for handle/email/location/context when API access is limited. | Evidence/signals source. No social actions. |
| Google Drive/Docs/Sheets | Retreat/program tables and historical context. | Evidence source, often requiring human review for shared/family emails. |
| Contacts app | Phone/email/location bridge source. | Evidence source. |
| ClassBot | Yoga cohort, phone/contact, attendance/recording-delivery clues. | Evidence/signals source. |
| Shopify / payment providers | Future purchase/order source for digital products, retreats, yoga plans, mentorship, or other offers. | Signal source first; card/customer state only after reviewed projection/write policy. |
| Bhakti WhatsApp / WhatsApp apps | Future delivery/interaction source for WhatsApp automations and on-demand products. | Signal source first; no outbound or automation mutation from CRM preview. |
| Telegram/Mantis/human reports | Human reports from Alejandro, assistants, and operations. | Fact/evidence source after parsing and approval. |
| ManyChat LIVE | Existing business-critical onboarding transport. | Keep alive. Do not mutate without explicit approval. |
| Legacy Supabase CRM | Earlier production-oriented CRM attempt with contacts/interactions/webhooks. | Legacy source/import lane or future backend candidate, not current vNext authority. |

## Legacy Boundary

The repository still contains earlier Supabase/ManyChat/MailerLite webhook infrastructure. It should not be deleted just because it is old; it contains useful ideas and possible production ingestion routes.

But it must not silently compete with CRM vNext.

Current rule:

- vNext local card store is the operating brain.
- legacy Supabase contacts/interactions are legacy/source data unless a future migration explicitly promotes Supabase into the production backend.
- legacy endpoints that read or write Supabase should not be used as the canonical dashboard or card-writing path for vNext decisions.
- legacy MailerLite reads that depend on subscriber `search` should be treated as less reliable than cursor pagination + local filtering.

## Data Semantics

Use the right layer for the right kind of truth:

| If we learned... | Store/route through... |
| --- | --- |
| "This person is a yoga student" | Fact Intake -> Fact Store, then reviewed card/evidence apply. |
| "This person attended Tuesday class" | Signal Event Ledger. |
| "This email belongs to this person" | Evidence review/card write approval. |
| "This person opened 2 campaigns in 30 days" | Signal Event Ledger -> engagement preview. |
| "This person replied thoughtfully to a newsletter" | Signal Event Ledger, plus evidence if the snippet helps stitching/context. |
| "This person is a therapy client/patient" | Restricted fact/evidence/card path with human-review boundaries. |
| "This score moved warmer this week" | Engagement Snapshot Ledger. |

## Operating Policy

Mantis should use this order before a meaningful CRM batch:

1. Read operator capabilities.
2. Check source health if live/high-value lanes are needed.
3. Gather source evidence read-only.
4. Normalize events into Signal Event Ledger when the data is activity-shaped.
5. Project canonical events into engagement preview inputs when the data should affect score movement.
6. Use Fact Store for approved stable truths.
7. Use card-write approval for identity/card updates.
8. Use engagement preview/snapshot ledgers for score movement.
9. Never send outbound or mutate external systems without explicit approval.

## Long-Term Direction

The current local-first architecture is correct while the CRM is still learning how to stitch identities and score relationships safely.

Later, Supabase or another backend may become the production database. That should be a deliberate migration:

```text
vNext contracts -> tested backend schema -> migration/replay -> production read/write switch
```

Not:

```text
old Supabase CRM + vNext local cards both acting as truth
```

## Why This Matters

Alejandro wants a living command center, not a pile of reports. The only way to get there safely is to separate:

- observation,
- interpretation,
- approval,
- current card state,
- and outbound action.

This map keeps the system powerful without letting automation get ahead of trust.

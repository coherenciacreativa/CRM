# CRM vNext Contacts Evidence Helper

Date: 2026-05-10
Status: v0 read-only evidence helper

## Purpose

Contacts Evidence Helper turns CRM person clues into safe Contacts search plans and converts supplied Contacts results into `contacts_app_export` evidence packets for Deep Local Stitching.

It exists for the scattered-data phase: a person may already be in local Contacts with a phone, email, nickname, or note, even when the current CRM card is missing those fields.

## Surfaces

- API: `POST /api/crm-vnext/contacts-evidence-helper`
- CLI:

```bash
npm run crm:vnext:contacts-evidence -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:contacts-evidence -- --search-results-file ./contacts-results.json --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:contacts-evidence -- --use-macos-contacts-db --text "CRM: @mayuyis2626 es Mayerli."
```

## Operating Modes

Planning only:

- receives a CRM report,
- runs Identity Stitching Research locally,
- emits Contacts search terms,
- returns no evidence packets until results are supplied.

Supplied results:

- receives contacts results through `contactsSearchResults`,
- matches them against identity clues,
- emits `evidenceSources` packets with `sourceKind: contacts_app_export`.

Optional local Contacts DB search:

- the CLI can query the macOS AddressBook SQLite store read-only after local permission exists,
- it does not mutate Contacts,
- if permission is blocked, it reports an auth blocker.

## Safety

- Read-only.
- No Contacts mutation.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No credential read.
- API does not read macOS Contacts directly; only the local CLI can do the read-only DB search.

## Real Mayerli Learning

After Alejandro granted Contacts access, the read-only path found a likely local Contacts record for Mayerli with a phone candidate. Card Apply Preview can now include that phone as review evidence while keeping the card unwritten and still missing email.

The important design point: Contacts evidence enriches the review packet; it does not authorize an automatic merge or card write.

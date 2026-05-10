# CRM vNext Card Write / Merge Policy

Date: 2026-05-10
Status: v0 read-only policy evaluator

## Purpose

Card Write / Merge Policy decides what kind of card action is prudent after identity stitching and evidence review.

It answers:

```text
Should Mantis propose create, enrich, merge, defer, or ask for more identity?
```

It does **not** write cards.

## Surfaces

- API: `POST /api/crm-vnext/card-write-merge-policy`
- CLI:

```bash
npm run crm:vnext:card-write-merge-policy -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:card-write-merge-policy -- --include-expanded-sources --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:card-write-merge-policy -- --evidence-file ./gmail-contact-evidence.json --text "CRM: @mayuyis2626 es Mayerli."
```

## Inputs

The policy combines:

- local person cards,
- local MailerLite bridge rows,
- Identity Stitching Research,
- Deep Local Stitching,
- Multi-Service Card Proposal,
- supplied connected evidence packets from Gmail, contacts, MailerLite exports, Google Drive/Sheets, or local tables.

## Decisions

Each clue receives one recommended write action:

- `enrich_existing_card_after_review`
- `create_new_card_after_review`
- `merge_or_create_from_mailer_candidate_after_review`
- `defer_write_prepare_review_packet`
- `ask_for_more_identity`

Each decision also declares:

- evidence score and grade,
- source signals,
- blockers,
- required approvals,
- apply preconditions,
- next evidence actions,
- merge rules.

When Deep Local Stitching reports missing contact fields, the decision's next evidence actions now call that out explicitly. For example, a person can be identity-enriched but still contact-incomplete:

```text
fullName: Gladys Mayerli Garcia Ortegon
instagramHandle: mayuyis2626
missingContactFields: email, phone
nextEvidenceAction: contact-field hunt
```

The contact-field hunt should search MailerLite read-only export/UI, macOS Contacts, Google Drive/Sheets retreat tables, Zoom registration or participant reports, and downloaded CSV/XLSX files before asking Alejandro to manually remember the data.

## Evidence-Derived Targets

When Alejandro reports a person without email, phone, or Instagram handle, but connected/read-only evidence finds exactly one compatible stable identifier, the policy can now create a review-only target.

Example:

```text
Alejandro says: Amalia de Bedud
Drive/Gmail evidence says: Amalia De Bedout <amaliadbg@hotmail.com>
Policy target: email:amaliadbg@hotmail.com
Action: defer_write_prepare_review_packet
```

This is not a write approval. It only moves the person from "ask Alejandro for more identity" to "review this evidence-derived candidate". Evidence Review Packet must still ask for ownership/identity confirmation before any future write path can apply it.

## Weak Candidate Replacement

When the old candidate matcher returns a weak or name-mismatched card, but connected/read-only evidence finds a stronger compatible email, the policy can replace the target with the stronger evidence-derived candidate for review.

Example:

```text
Old candidate: Natalia Prato <nataliaprato@gmail.com>
Drive/Gmail evidence: Natalia Cardenas De Bedout <natis1000@hotmail.com>
Policy target: email:natis1000@hotmail.com
Action: defer_write_prepare_review_packet
```

This replacement is still only a review target. It does not merge, write, or mark the email as owned by the subject. The Evidence Review Packet must ask Alejandro whether the replacement email belongs to the reported person before any future write path can use it.

The replacement path emits:

```text
evidence_derived_identity_candidate
evidence_replaces_weak_identity_candidate
```

Those signals allow downstream approval packets to distinguish "evidence improved the candidate" from "we already know this is the canonical card".

## Gmail Route

Two Gmail evidence routes are accepted:

1. `gmail_evidence_helper`
   - planned query + supplied result conversion,
   - emits redacted `gmail_export` evidence packets,
   - does not call live Gmail from the CRM API.

2. `mantis_chrome_gmail_browser`
   - viable alternate when Mantis already has an authenticated Chrome/Gmail browser session,
   - read-only only,
   - no send, label, archive, delete, or modify,
   - selected snippets must be redacted and converted into `gmail_export` evidence packets.

If Chrome/Gmail asks for login, MFA, Keychain, or permission changes, stop and alert Alejandro.

## MailerLite Route

MailerLite is a first-class consultation source before final card creation or merge.

Current policy:

- use the local MailerLite bridge first,
- use `mailerlite_evidence_helper` to convert supplied MailerLite subscriber/API/export results into `mailerlite_export` packets,
- the optional local CLI route may call the existing MailerLite CLI read-only; if it returns `401`, preserve the blocker and ask for connector refresh or Mantis-supplied results,
- consult MailerLite tags/groups/campaign/subscriber history before final writes when email or segment evidence matters,
- read-only UI review or explicit export is acceptable,
- do not modify subscribers, tags, groups, campaigns, automations, or credentials,
- if auth/API tokens/permissions are needed, stop and alert Alejandro.

## Google Drive / Sheets Route

Google Drive/Docs/Sheets is a first-class consultation source for retreat and program evidence.

Current policy:

- use `google_drive_evidence_helper` to convert supplied Drive/Sheets rows into `google_drive_export` or `retreat_table` packets,
- search read-only tables for retreat attendance, family context, phone, email, city/country, and program interest rows,
- do not call live Drive from the CRM API,
- do not create, edit, move, share, or delete Drive files,
- when a row email may belong to a family member or companion, mark it review-only and do not assign it as the subject primary email.

Mayerli/Ariana is the model case: the row emails are useful clues, not confirmed ownership.

## Merge Policy

Merge may be proposed only when:

- exact stable identifiers match,
- or Alejandro explicitly confirms the identity,
- and MailerLite/Gmail/contacts/retreat evidence do not conflict,
- and all service relationships are preserved.

Do not merge when:

- only a first name or weak token matches,
- stable identifiers conflict,
- restricted service context would become broadly visible,
- the next move would trigger outbound communication.

## Restricted Services

Psychology/therapy may be represented as a legitimate service/client relationship when Alejandro reports it.

The policy still requires privacy review for restricted service context:

- no clinical details in cards,
- no outbound action driven by therapy context without human review,
- no team visibility expansion without approval.

## Safety

- Read-only.
- No automatic writes.
- No automatic merges.
- No Fact Store write.
- No outbound messages.
- No credential reads or refreshes.
- No live Gmail/MailerLite API calls from this API.
- Local paths remain redacted.

## Operator Rule

Use this after Multi-Service Card Proposal and evidence review.

The next build hito can implement a reviewed write path only after this policy is accepted and tested on real cases.

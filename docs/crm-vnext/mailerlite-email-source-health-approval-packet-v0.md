# MailerLite / Email Source Health Approval Packet v0

Date: 2026-06-03
Status: read-only/no-live approval packet

## Purpose

This packet records the first selected CRM Core source-health verification
family and defines the exact approval boundary required before any verification
can run.

No verification is authorized by this document. This packet does not authorize
live API calls, MailerLite UI access, Gmail access, Instagram access, credential
reads, subscriber list printing, raw row printing, source mutation, CRM state
mutation, ledger writes, card writes, scoring writes, or outbound action.

## 1. Selected Source Family

Email/MailerLite.

Alejandro selected Email/MailerLite first because it is structured,
identity-rich, lower-risk than Instagram UI, and high leverage for
relationship-depth signals.

## 2. Recommended First Verification Route

Prefer local snapshot/export freshness verification if a MailerLite engagement
snapshot/export is already available or explicitly supplied.

Recommended route order:

1. Local snapshot/export metadata verification only.
2. If no usable snapshot/export exists, prepare a future no-secret MailerLite
   healthcheck as a separate approval boundary.
3. Do not use a live MailerLite API route unless Alejandro gives a fresh,
   explicit approval for that specific route.

The first route should inspect metadata and shape only. It should not print raw
rows, subscriber lists, private emails in bulk, private URLs, campaign bodies,
tokens, headers, env values, or private content.

## 3. What The Verification Would Check

A future approved verification would check:

- whether a fresh MailerLite engagement snapshot/export exists;
- snapshot/export row count and freshness;
- whether fields include opens, repeated opens, clicks, repeated clicks,
  subscriber status, suppression, bounce, complaint, campaign context, and
  identity anchors;
- whether the shape can feed `crm:vnext:mailerlite-engagement-signals`;
- whether single opens can be distinguished from repeated engagement patterns;
- whether suppression/bounce/complaint status is preserved or explicitly absent;
- whether email identity anchors are present without relying on MailerLite as
  direct card authority;
- whether the supplied artifact is safe for local dry-run adapter processing
  after a separate execution approval.

The verification should produce a source-health receipt only. It should not run
`crm:vnext:mailerlite-engagement-signals`, preview scoring, write ledgers, or
mutate CRM state unless a later task explicitly approves those separate steps.

## 4. What It Must Not Do

The verification must not:

- call a live MailerLite API unless separately approved;
- open MailerLite UI;
- open Gmail, Instagram, Shopify, or any browser/UI;
- read, print, rotate, refresh, or mutate secrets;
- print subscriber lists, bulk emails, private URLs, campaign bodies, raw rows,
  tokens, headers, env values, or private content;
- mutate subscribers, groups, tags, segments, workflows, campaigns, automations,
  sends, audiences, or source settings;
- write person cards;
- write Fact Store;
- write Signal Event Ledger;
- write Engagement Snapshot Ledger;
- write source-result ledgers;
- write scoring state;
- run outbound communication;
- treat opens, clicks, or subscriber status as permission to contact.

## 5. Output Artifact

Future execution should produce:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_source_health_verification_2026-06-03.md
/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_source_health_verification_2026-06-03.json
```

The artifact should include:

- `source_family`: `email_mailerlite`
- `verification_route`: `local_snapshot_export_metadata`
- `source_health_state`: `healthy`, `stale`, `blocked`, or `unknown`
- `checked_at`
- `checked_by`
- `approval_reference`
- snapshot/export path label, if supplied, without exposing private local data
- snapshot/export freshness
- redacted row count
- available field families
- repeated-engagement coverage
- suppression/bounce/complaint coverage
- identity-anchor coverage
- blockers
- unknowns remaining
- allowed next local step
- still forbidden after green
- closed gates

The Markdown artifact should be safe to summarize in chat without exposing
secrets, subscriber lists, raw rows, private content, or outbound implications.

## 6. Exact Approval Phrase

To authorize only this verification later, Alejandro can paste:

```text
I approve the CRM Core Email/MailerLite source-health verification using local snapshot/export metadata only. Do not call live APIs, open UI, print subscriber lists, mutate MailerLite, or write CRM state.
```

That phrase authorizes only local snapshot/export metadata verification. It does
not authorize live MailerLite API calls, MailerLite UI access, raw row printing,
subscriber list dumps, source mutation, CRM writes, ledger writes, scoring, or
outbound action.

If no snapshot/export is available, a new approval phrase must be prepared for a
no-secret MailerLite healthcheck. Do not silently upgrade from local metadata
verification to live API verification.

## 7. Still Forbidden After Green

Even after a green source-health result, CRM Core still may not:

- write Signal Event Ledger;
- write Engagement Snapshot Ledger;
- write person cards;
- write Fact Store;
- write source-result ledgers;
- write scoring state;
- mutate MailerLite subscribers, groups, tags, segments, workflows, campaigns,
  automations, audiences, or sends;
- open MailerLite UI;
- call live APIs without a separate explicit approval;
- run outreach, replies, sends, DMs, workflows, or outbound communication;
- treat email engagement as permission to contact.

A green result means only that the Email/MailerLite source route can supply
safe, read-only evidence for a later local CRM Core step.

## Validation

This approval-packet action validates with:

```bash
git diff --check
```

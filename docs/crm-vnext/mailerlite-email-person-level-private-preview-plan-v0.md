# MailerLite Email Person-Level Private Preview Plan v0

Status: no-run plan

Created: 2026-06-07

Scope: CRM Core only. This plan does not authorize execution, source-system
access, private artifact row inspection, CRM writes, ledger writes, card writes,
Fact Store writes, scoring writes, MailerLite mutation, outreach, Launch OS work,
or use of `/Users/alejandrogomez/CRM`.

## 1. Purpose

The purpose is to define a private local preview that classifies
people/subscribers by historical email relationship depth without writing CRM
state or printing identities in chat.

The future preview should help CRM Core understand relationship-depth patterns
from MailerLite email engagement while keeping names, emails, subscriber ids,
subscriber-level arrays, raw rows, private URLs, campaign bodies, and private
content out of chat and standard receipts.

## 2. Inputs

The future execution boundary may use only explicitly approved inputs:

- Private MailerLite engagement source artifact.
- Redacted relationship-depth receipt.
- CRM Core standing read-only source policy.
- No raw chat output.

The private source artifact is a local processing input only. It must not be
printed, committed, pasted into chat, or stored in general Mantis memory.

## 3. Private Artifact Behavior

The person-level preview artifact must live outside the repo.

Recommended folder:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/
```

The private preview artifact may contain person-level or subscriber-level local
classification data only inside that private folder. It must never be:

- committed;
- pasted into chat;
- written into tracked repo files;
- stored in Mantis general memory;
- copied into Mantis-Reports;
- used as permission for outreach.

Any future command or script must block if the private preview artifact path is
inside the repo or outside the approved private artifact folder.

## 4. Redacted Receipt Behavior

The future execution should also write redacted JSON and Markdown receipts under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- Total records processed.
- Counts by tier.
- Counts by blocker.
- Suppression/status counts.
- Confidence categories.
- Next safe operator step.

Receipts must not include:

- Names.
- Emails.
- Subscriber IDs.
- Raw rows.
- Private artifact full contents.
- Campaign bodies.
- Private URLs.
- Tokens.
- Headers.
- Environment values.
- Credential metadata.
- Private content.

Chat output must be stricter than receipts: aggregate counts, blocker classes,
closed gates, and next safe step only.

## 5. Proposed Private Tiers

Future private local processing should classify records into these no-write tiers:

- `repeated_click_depth`: repeated click patterns indicate stronger historical
  email engagement than opens, but still not recent intent or permission to
  contact.
- `repeated_open_depth`: repeated open patterns indicate historical readership,
  weaker than click behavior.
- `broad_historical_reader`: lifetime readership exists without stronger
  repeated-click depth.
- `low_no_historical_email_engagement`: limited or absent historical email
  engagement.
- `suppression_safety_review`: suppression, unsubscribe, bounce, complaint, or
  unsafe status context overrides warmth.
- `insufficient_data_identity_review`: identity or engagement data is missing,
  ambiguous, or insufficient for a relationship-depth tier.

These tiers are preview-only. They do not authorize scoring, card updates,
ledger events, Fact Store writes, outreach, or MailerLite mutations.

## 6. Important Caveats

- Lifetime engagement is not recent heat.
- Opens are weaker than clicks.
- Suppression/status outranks warmth.
- Email engagement is not permission to contact.
- No topic affinity or campaign-specific intent can be inferred without richer
  campaign/activity data.
- Missing Instagram handles and missing person ids mean CRM identity bridge work
  remains separate from email relationship-depth classification.
- Person-level preview output must remain private and local unless a later
  approval boundary explicitly authorizes a redacted operator-facing surface.

## 7. Validation Plan

Before any future execution is approved, CRM Core should add or run focused
validation proving:

- Terminal output excludes names, emails, subscriber IDs, raw rows, private URLs,
  campaign bodies, tokens, headers, environment values, credential metadata, and
  private content.
- JSON and Markdown receipts exclude names, emails, subscriber IDs, raw rows,
  private URLs, campaign bodies, tokens, headers, environment values, credential
  metadata, and private content.
- The private preview artifact path is outside the repo.
- The private preview artifact path is under
  `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`.
- No CRM writes occur.
- No Signal Event Ledger writes occur.
- No Engagement Snapshot Ledger writes occur.
- No card writes occur.
- No Fact Store writes occur.
- No scoring writes occur.
- No MailerLite, Gmail, Instagram, Shopify, source-system, API, connector, or UI
  mutation occurs.

Suggested validation command boundary for a future implementation hito:

```sh
git diff --check
```

If a future script is created, add focused tests before running it against any
private artifact.

## 8. Required Approval Before Execution

Execution requires a separate explicit approval after any implementation or
command boundary is reviewed.

Exact future approval phrase:

```text
I approve the CRM Core MailerLite person-level private relationship-depth preview using the private local artifact only. Do not print names, emails, subscriber IDs, raw rows, private URLs, campaign bodies, secrets, or write CRM state.
```

This approval would authorize only the private local preview execution described
in this plan. It would not authorize CRM writes, ledgers, card writes, scoring,
Fact Store writes, source mutations, outreach, or Launch OS work.

## 9. Still Forbidden After Green

Even after a green private person-level preview, CRM Core still may not:

- Write CRM state.
- Write scoring.
- Write Signal Event Ledger.
- Write Engagement Snapshot Ledger.
- Write source-result ledgers.
- Write person cards.
- Write Fact Store.
- Send outreach.
- Mutate MailerLite.
- Mutate Shopify, Gmail, Instagram, workflows, subscribers, groups, audiences,
  campaigns, sends, or outbound channels.
- Touch Launch OS docs.
- Use `/Users/alejandrogomez/CRM`.

Any later step that needs person-level operator review, scoring, writes, or
outreach requires its own approval packet.

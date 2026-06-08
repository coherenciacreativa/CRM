# MailerLite Email Private Review Queue Design v0

Status: no-run design

Created: 2026-06-08

Scope: CRM Core only. This design does not authorize queue execution, private
artifact row inspection, source-system access, CRM writes, card writes, ledger
writes, Fact Store writes, scoring writes, outreach, MailerLite mutation, Launch
OS work, or use of `/Users/alejandrogomez/CRM`.

## 1. Purpose

The purpose is to define a private local review queue that lets
Alejandro/Mantis inspect selected MailerLite relationship-depth cohorts safely,
without exposing identities in chat and without writing CRM state.

The queue is a future private review surface. It is not a scoring system, a CRM
write path, an outreach permission model, a Launch OS workflow, or a public
operator report.

## 2. Inputs

Future queue generation may use only explicitly approved inputs:

- Private person-level preview artifact.
- Redacted operator brief.
- CRM Core standing read-only source policy.
- Suppression/status summary.

The queue design must preserve the current split:

- private artifacts stay under the approved private source-artifact folder;
- redacted receipts stay under Mantis-Reports;
- chat output stays aggregate-only.

## 3. Private Queue Artifact Behavior

The private queue artifact must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/
```

The private queue artifact may contain person/subscriber-level entries internally
only inside that private folder. It must never be:

- committed;
- pasted into chat;
- stored in tracked docs;
- written into Mantis general memory;
- copied into Mantis-Reports;
- used as permission for outreach;
- treated as a CRM state write.

Any future command or script must block if the queue artifact path is inside the
repo or outside the approved private MailerLite artifact folder.

## 4. Redacted Queue Receipt Behavior

Future queue execution should write redacted JSON and Markdown receipts under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- Total queue candidates.
- Counts by tier.
- Counts by review status.
- Suppression/safety counts.
- Blocker counts.
- Next safe operator step.

Receipts must not include:

- Names.
- Emails.
- Subscriber IDs.
- Raw rows.
- Private artifact contents.
- Campaign bodies.
- Private URLs.
- Tokens.
- Headers.
- Environment values.
- Credential metadata.
- Private content.

Chat output must be stricter than receipts: aggregate counts, closed gates,
blocker classes, and next safe operator step only.

## 5. Candidate Selection Rules

Future queue selection should follow these rules:

- `repeated_click_depth` is the highest priority for future private review.
- `repeated_open_depth` is useful but weaker than click behavior.
- `broad_historical_reader` is lower priority.
- `suppression_safety_review` must be excluded from warmth/action queues or
  routed to safety review.
- `low_no_historical_email_engagement` is not a priority queue.
- Historical depth is not recent heat.

The queue should not treat any cohort as outreach-ready. It should also avoid
topic or campaign-interest conclusions unless richer, separately approved data is
available.

## 6. Review States

Future private queue entries may use these review states:

- `pending_private_review`
- `reviewed_relevant`
- `reviewed_not_relevant`
- `needs_identity_bridge`
- `suppression_blocked`
- `needs_recent_signal`
- `not_for_outreach`
- `candidate_for_future_brief`

These states are private-review labels only. They do not write cards, ledgers,
Fact Store, scoring, source-result ledgers, or source systems.

## 7. Gates

The queue must not authorize:

- Outreach.
- Scoring.
- Card writes.
- Signal Event Ledger writes.
- Engagement Snapshot Ledger writes.
- Fact Store writes.
- Source-result ledger writes.
- MailerLite mutations.
- Launch OS actions.

Any future conversion from private queue output into CRM writes, scoring, or
operator-visible person-level surfaces requires a separate approval packet.

## 8. Mantis Behavior

Mantis may reference the queue only under these boundaries:

- Mantis can state aggregate counts and ask Alejandro whether to inspect the
  private queue.
- Mantis must not reveal identities in general chat.
- Mantis must not store queue entries in general memory.
- Mantis may use a private review surface or artifact path label, not raw data.
- Mantis must keep suppression/safety cohorts framed as safety review, not
  relationship warmth.
- Mantis must keep historical depth separate from recent intent.

## 9. Future Execution Approval

Generating or opening the private review queue requires a separate explicit
approval after any implementation or command boundary is reviewed.

Exact future approval phrase:

```text
I approve the CRM Core MailerLite private review queue generation using the private local relationship-depth preview only. Do not print names, emails, subscriber IDs, raw rows, private URLs, campaign bodies, secrets, or write CRM state.
```

This approval would authorize only private local queue generation or opening as
described in this design. It would not authorize CRM writes, scoring, ledgers,
card writes, Fact Store writes, outreach, source mutations, Launch OS work, or
general-memory storage of queue entries.

## 10. Still Unknown

The queue design does not resolve:

- Recent heat.
- Topic affinity.
- Campaign-specific intent.
- Outreach readiness.
- Instagram bridge.

Those areas need separate source-health, identity, or review gates before they
can be used for CRM decisions.

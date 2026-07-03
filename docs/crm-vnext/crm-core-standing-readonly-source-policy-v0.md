# CRM Core Standing Read-Only Source Policy v0

Date: 2026-06-03
Status: standing CRM Core read-only source authorization

## Purpose

This policy records Alejandro's standing authorization for CRM Core to perform
selected read-only source-health and metadata checks without requesting a fresh
approval phrase every time.

This policy does not authorize source mutation, CRM state mutation, private
content export, UI browsing, Instagram private inspection, scoring writes,
ledger writes, card writes, Fact Store writes, or outbound action.

## Allowed Autonomously

CRM Core may autonomously perform the following within the redaction and
no-mutation limits below:

- MailerLite/email read-only source-health checks.
- MailerLite/email engagement and status metadata checks.
- Gmail/newsletter reply metadata-only discovery.
- Redacted source-health receipts.
- Local dry-run adapters and previews after source metadata is available.
- No-write CRM Core reports.

Autonomous checks must stay read-only and must produce compact, redacted
operator-facing receipts. They may summarize aggregate source-health state,
freshness, field availability, blocker classes, and safe next steps.

Configured read-only connectors or scripts may use existing stored credentials
internally under this policy only if all of the following are true:

- Codex does not print, inspect, refresh, rotate, modify, export, or expose
  credentials;
- the command is documented or verified as read-only;
- the command does not mutate source systems or CRM state;
- the output is redacted aggregate/metadata only;
- any ambiguity about read-only behavior causes a stop.

## Required Redaction

All outputs must avoid sensitive or private content:

- no subscriber list dumps;
- no raw rows;
- no full email bodies;
- no private URLs;
- no campaign bodies;
- no tokens, headers, cookies, env values, or secrets;
- only aggregate counts, field availability, freshness, source-health state, and
  redacted examples if strictly needed.

If a check cannot provide useful output without exposing private content, stop
and report the blocker instead of widening output.

## Still Approval-Gated

The following still require explicit Alejandro approval:

- full email body reads;
- private thread inspection;
- Instagram UI, DM, or story-view inspection;
- broad exports;
- live UI browsing;
- any source mutation;
- any CRM write;
- any scoring, card, ledger, or Fact Store write;
- any outreach, send, reply, archive, label, or delete action.

Instagram private inspection remains approval-gated for now, including UI,
DM/thread, story-view, and private-context review.

## Always Forbidden Without Explicit Approval

The following remain forbidden unless Alejandro gives a fresh explicit approval
for the exact action:

- MailerLite subscriber, group, tag, segment, workflow, campaign, or send
  mutation;
- Gmail send, reply, archive, label, delete, or settings mutation;
- Instagram reply, react, follow, DM, or action;
- Signal Event Ledger writes;
- Engagement Snapshot Ledger writes;
- person card writes;
- Fact Store writes;
- scoring writes;
- outbound actions.

## Output Rules

Allowed source/operator receipts should be written as local reports, preferably
under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports
```

Receipts should include:

- source family;
- checked route;
- checked time;
- checked by;
- source-health state;
- aggregate counts only;
- freshness;
- field availability;
- blocker classes;
- redaction policy;
- unknowns remaining;
- allowed next local step;
- still-forbidden boundaries.

Receipts must not imply permission to contact, score, write CRM state, mutate
source systems, or advance Launch OS.

Mantis-Reports remains appropriate for redacted source-health receipts and
operator/source receipts intended for future Mantis or CRM operation. It should
not be used for consultant-relay development telemetry going forward.

Consultant-relay development telemetry should use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Mantis general memory must not store CRM development logs, source private
artifacts, queue entries, raw identities, or consultant-relay receipts.

For the full storage taxonomy and Mantis operator boundary, see:

```text
docs/crm-vnext/crm-core-storage-and-mantis-operator-boundary-policy-v0.md
```

## Relationship To CRM Core Lanes

This policy applies only to CRM Core work from:

```text
/Users/alejandrogomez/CRM-core
```

It does not authorize work in `/Users/alejandrogomez/CRM`, Launch OS docs, or
Launch OS functionality. It also does not weaken strict secret mode, exact
redaction requirements, write gates, or outbound gates.

## Current Practical Meaning

CRM Core can now move from approval-packet preparation to controlled read-only
execution for:

- Email/MailerLite source-health and engagement metadata.
- Gmail/newsletter reply metadata-only discovery.

CRM Core must still stop before:

- private content inspection;
- broad exports;
- Instagram UI or private-source inspection;
- live UI browsing;
- any source or CRM mutation;
- any write/scoring/outbound boundary.

## Validation

Policy updates validate with:

```bash
git diff --check
```

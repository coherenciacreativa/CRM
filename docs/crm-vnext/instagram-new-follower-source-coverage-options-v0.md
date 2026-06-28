# Instagram New Follower Source Coverage Options v0

Date: 2026-06-24
Status: no-run CRM Core design

## Purpose

Define source-coverage options after the first new-follower detection-only pilot
proved the Instagram notifications route is healthy but produced zero candidate
evidence.

This design does not authorize Instagram execution, follower profile opening,
DMs, welcome audio, candidate queue generation, CRM/source writes, source
mutation, scoring, or outreach.

## Baseline Result

The first bounded detection-only pilot recorded:

- notifications source surface reached;
- visible new-follower groups: `0`;
- private follower anchors captured: `0`;
- signal class: `source_health_only`;
- candidate queue generated: `false`;
- welcome audio sent: `false`;
- DMs opened: `false`;
- Instagram actions: `0`;
- CRM writes: `0`.

Interpretation:

- notifications route is healthy;
- notifications route did not produce candidate evidence in this run;
- no queue or welcome audio step is justified from this pilot.

## Source Coverage Options

### Option A: Repeat Notifications-Surface Detection Later

Purpose:

- low-risk periodic health/signal check.

Pros:

- already proven healthy;
- low private-surface risk;
- no new route complexity.

Cons:

- may keep returning zero if notifications do not show old/new follower signals;
- cannot produce a welcome queue without visible private anchors or candidate
  evidence.

Recommended use:

- cheap recurring check only after a time gap or known follower activity.

### Option B: Bounded Follower-Source Route

Purpose:

- design a future exact route that can capture private follower anchors when
  notifications do not surface them.

Possible surfaces:

- follower list surface;
- profile follower surface;
- approved manual evidence packet;
- future API/webhook source-health route.

Rules:

- future execution requires exact approval;
- no follower profiles opened by default;
- no DMs;
- no welcome audio;
- no Instagram action;
- no CRM writes;
- no full-list exhaustion unless separately approved;
- private anchors only inside private artifacts;
- redacted aggregate receipts only.

Risks:

- profile/follower surfaces are more person-level than notifications;
- full-list traversal can become broad private collection;
- route must be bounded and stop on ambiguity.

### Option C: Manual Evidence Packet From Alejandro

Purpose:

- Alejandro supplies compact evidence when he sees new follower activity.

Rules:

- no handles in chat unless specifically approved;
- use private artifact route if person-level;
- redacted receipt only.

Pros:

- fast, low automation risk.

Cons:

- relies on human observation;
- not autonomous enough for standing operation.

### Option D: Future API/Webhook Investigation

Purpose:

- determine whether official source access can produce new-follower events, DM
  replies, and send/action capabilities.

Rules:

- separate source-health lane;
- no secrets printed;
- no implementation in this task;
- no assumption that API access is currently available.

Pros:

- may become the most robust future route.

Cons:

- likely setup, account-type, app-review, permissions, and verification
  complexity;
- not a short-term blocker for v0 planning.

## Decision Rubric

- If the goal is low-cost monitoring: repeat notifications detection later.
- If the goal is candidate-producing evidence: design a bounded follower-source
  route.
- If the goal is immediate operating-system leverage: design the full
  Instagram-to-MailerLite welcome architecture next.
- If no private follower anchors or approved candidate evidence exists, do not
  generate a candidate queue.
- If candidate queue is not generated, welcome audio send remains closed.

## Proposed Next Route

Recommended route:

```text
crm_core_instagram_to_mailerlite_welcome_system_architecture_v0
```

Purpose:

- unify new-follower source coverage, welcome-history dedupe, DM/audio send
  boundaries, reply monitoring, email handoff, MailerLite onboarding, and CRM
  write packets into one operating architecture.

## Closed Gates

- no Instagram execution;
- no UI, Computer Use, or `@Chrome`;
- no follower profile opening;
- no DMs;
- no welcome audio;
- no candidate queue generation;
- no source mutation;
- no CRM writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no card writes;
- no Fact Store writes;
- no scoring;
- no outreach;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

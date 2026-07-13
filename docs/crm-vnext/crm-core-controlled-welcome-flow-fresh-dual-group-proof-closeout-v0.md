# CRM Core Controlled Welcome Flow - Fresh Dual-Group Proof Closeout v0

Date: 2026-07-12
Status: verified product proof; not production-generalized

## Outcome

The fresh controlled MailerLite proof succeeded.

One new controlled `+tag` subscriber was created through one API upsert carrying
the two group memberships required by the live onboarding path. The subscriber
was verified active with both memberships immediately after the upsert. Gmail
later confirmed the first automatic onboarding email at the exact controlled
recipient, approximately 73 seconds after the mutation. A later MailerLite
read-only recheck confirmed a positive sent counter and one
`automation_email_sent` event.

This supersedes the current product conclusion that first-email delivery was
unverified. It does not rewrite or reopen Mission Contract 2026-07-11.v2: that
mission's bounded evidence result remains historically accurate for its own
attempt and budgets.

## What Was Proven

- A fresh controlled subscriber can be created successfully by API.
- The live onboarding path requires the configured two-group membership set,
  not only the active trigger membership in isolation.
- One single upsert can establish the required memberships.
- The live automation can send its first onboarding email to the exact
  controlled `+tag` recipient.
- Gmail `+tag` delivery to the authenticated base mailbox works for this proof.
- The first automatic email may become visible after the initial short
  MailerLite observation window; verification must allow bounded telemetry lag.
- The later MailerLite activity state corroborates the Gmail delivery evidence.

## Evidence

Redacted evidence:

- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow/fresh-dual-group-upsert-2026-07-12/receipt_redacted.md`
- `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow/fresh-dual-group-upsert-2026-07-12/delivery_reconciliation_redacted.md`

Private target, subscriber, group, automation, mailbox, and activity evidence
remains owner-only outside the repository.

## Safety And Effect Accounting

- Fresh controlled target count: `1`.
- MailerLite mutation call count: `1`.
- Retry count: `0`.
- Delete count: `0`.
- Resend count: `0`.
- Retrigger count: `0`.
- Prior contacts modified: `false`.
- Automation or campaign configuration changed: `false`.
- CRM writes: `0`.
- Instagram source actions: `0`.
- Campaign launched: `false`.
- Raw private values stored in repository: `false`.

## Correction To The Initial Observation

The initial post-upsert observation reported no automation entry or email. That
was premature. The message arrived after the first bounded observation window,
and the first Gmail query mishandled the `+` recipient syntax. A broader recent
inbox check recovered the exact controlled-recipient match. The later
MailerLite recheck confirmed the send event.

The authoritative proof outcome is therefore:

`fresh_dual_group_upsert_triggered_first_automatic_onboarding_email`

## Production Readiness Boundary

This proof closes the MailerLite first-email milestone. It does not by itself
authorize or prove standing autonomous operation under paid traffic.

Before a campaign pilot, CRM Core still needs one compact operational pilot
mission that binds the already-proven components into one standing route:

`Instagram follower detection -> dedupe -> welcome audio -> reply cadence -> email/data extraction -> approved dual-group MailerLite upsert -> bounded delivery verification -> redacted receipt`

The pilot mission must define operator cadence, capacity, dedupe, one-time send
history, manual fallback, stop rules, telemetry-lag handling, campaign cap, and
the exact recurring automation boundary. It must not reopen the successful
MailerLite proof or introduce a broad production launch.

## Chief Architect Follow-Through

The CRM Core Chief Architect has reviewed this redacted closeout and recommends
one bounded hardening pilot, not normal operation or campaign launch. The exact
contract is now registered at:

`docs/crm-vnext/crm-core-limited-operational-pilot-mission-contract-2026-07-13-v0.md`

Mission-level CEO approval was received by direct reference on 2026-07-13. The
next step is the approved central docs-only integration followed by the bounded
operator, without per-candidate or routine CEO handoffs, and one redacted final
brief. Campaign launch remains outside that contract.

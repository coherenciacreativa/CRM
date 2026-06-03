# Launch OS Standing Delegation Policy

Purpose:

This policy records narrow standing delegations from Alejandro to Codex for
routine Launch OS operations. It reduces repeated exact-phrase friction without
turning Launch OS into an unsupervised live-send or live-mutation system.

Standing delegation is not blanket approval. It is revocable, scoped, and
conditioned on fresh preflight, QA and local receipts.

## Standing Delegation: Seed Test Emails

Alejandro delegated this operation on 2026-06-02:

> Codex puede enviar test emails a seed recipients previamente aprobados cuando
> el draft está en Null Audience, el grupo activo es 0, no hay
> placeholders/tokens pendientes, no hay audience send, no hay
> publish/schedule/workflow, y se genera receipt local. Si cualquier QA falla,
> se detiene.

Alejandro clarified this route on 2026-06-03:

> Codex should not block the Launch OS goal on repeated approvals for routine
> MailerLite seed/test emails to approved seed recipients. When the draft and
> Null Audience QA are green, test-email sending is delegated; the operator
> should execute it autonomously and stop only on QA failure, scope expansion or
> a real safety uncertainty.

### Allowed

Codex may send MailerLite test emails to previously approved seed recipients
without requesting a new exact approval phrase each time, only when all of these
conditions are true:

- A fresh preflight/QA confirms the draft is still in draft/test state.
- The draft is assigned only to the safety Null Audience group.
- The safety Null Audience group has `active_count=0`.
- The operation sends only to the approved seed recipient(s), not to an
  audience, segment, group or subscriber list.
- No unresolved placeholders, redacted tokens, raw URLs or visible fallback
  tokens remain in the email body.
- No publish, schedule, automation, workflow, audience send or subscriber
  mutation is involved.
- No extra groups or segments are created or assigned.
- No Shopify, CRM, Signal Ledger, card, scoring or Fact Store mutation is
  involved.
- A local execution receipt is generated.
- The UI-control route stays inside the same delegated test-send operation.
  Codex does not need a separate approval merely because MailerLite requires a
  short UI fallback to operate the visible `Send a test` flow.

### Approved Seed Recipients

Current approved seed recipient:

- `saludoalsol+seedmail@gmail.com`

Additional seed recipients must be explicitly added to this policy or to a
current local receipt before use.

### Required Route

- Use the MailerLite API only for read-only preflight, draft/group safety QA and
  receipts.
- Use the configured UI route for actual test-email sends, normally Computer
  Use semantic UI controls in Safari for Codex-native operation.
- If Computer Use semantic controls do not expose a visible MailerLite test-send
  control, Codex may use a minimal Computer Use visual/coordinate-click fallback
  for the same visible control without asking Alejandro again, only after the
  reset/timebox protocol in the Codex Profile and only while every seed-test
  condition in this policy remains true.
- Fallback use must be narrow: it may click visible MailerLite controls and type
  the approved seed recipient into the `Send a test` modal, but it must not
  broaden the recipient, audience, campaign, workflow, publish/schedule,
  subscriber, Shopify, CRM, ledger, card, scoring or Fact Store scope.
- Browser/Playwright, DOM injection, AppleScript injection or system-level
  automation remain outside the default route unless explicitly authorized or
  later added to this policy.

### Stop Conditions

Stop before sending if any condition is unclear or false:

- The draft is not in draft/test state.
- The draft is not exclusively tied to the Null Audience safety group.
- The Null Audience safety group has active subscribers.
- The seed recipient is not allowlisted.
- The operation would send to an audience, group, segment or non-seed
  subscriber.
- Placeholders, redacted tokens, visible raw URLs or stale asset references are
  found.
- The campaign is published, scheduled, workflow-attached or no longer inert.
- The UI route would require a fallback that cannot be kept inside the narrow
  Computer Use visible-control test-send operation, or could broaden scope.
- Fresh QA or local receipt generation fails.

### Explicitly Not Delegated

This standing delegation does not authorize:

- Public or audience sends.
- Assigning audiences, groups or segments.
- Creating or mutating subscribers.
- Creating, enabling or changing workflows/automations.
- Publishing or scheduling MailerLite campaigns.
- Shopify live publish, navigation, theme, checkout, product or SEO changes.
- CRM live writes, Signal Ledger appends, cards, scoring or Fact Store writes.
- Reading or printing secrets, tokens, raw private URLs, raw campaign IDs or
  broad recipient lists.
- Requiring Alejandro to re-approve the same routine seed/test email send only
  because MailerLite's UI did not expose the visible `Send a test` control
  semantically.

## Relationship To Exact Approvals

Exact approvals remain one-shot by default. Standing delegation is the narrow
exception for operations explicitly listed in this file.

If a task does not fit every condition in the relevant standing delegation,
Codex must treat it as a normal approval boundary and request a fresh explicit
approval phrase.

## Receipts

Every delegated action must leave a local receipt that records:

- The standing delegation used.
- The seed recipient class used, without broad recipient disclosure.
- The fresh preflight/QA result.
- The number of test emails sent.
- The UI route used, including whether a Computer Use visual/coordinate fallback
  was needed.
- The exact stop conditions checked.
- Confirmation that no public/audience send, publish, schedule, workflow,
  subscriber, Shopify, CRM, ledger, card, scoring or Fact Store mutation
  occurred.

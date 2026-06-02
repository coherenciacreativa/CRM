# Launch OS Human Boundary Notification Policy

Purpose:

This policy defines when a Launch OS Goal/play run may notify Alejandro that
human action is required, and how to do it without spamming, leaking secrets or
turning a notification into approval.

It does not send notifications by itself. It is a routing and safety contract
for future operators, scripts or handoff packets.

## Approved Notification Channels

- Primary: the main Telegram group with Mantis.
- Backup/escalation: Alejandro's personal email.

Channel approval only authorizes using these channels for human-boundary
notifications. It does not authorize any live MailerLite, Shopify, CRM,
subscriber, group, workflow, send, ledger, card, scoring or Fact Store action.

## Notify When

Notify only when the active Goal is blocked by a real human boundary:

- An exact approval phrase is required before a live-adjacent action.
- A CEO/product decision is required before the next useful milestone.
- Brand, Web/Shopify, CRM or another department final response is missing.
- Authentication, login, UI access or local permission is required.
- Evidence is contradictory or stale and a human choice is required.
- A blocker has been ready for Alejandro for a meaningful interval and the Goal
  should pause instead of building around the missing input.

## Do Not Notify For

- Routine local-only report refreshes.
- Successful commits, pushes or validation runs unless Alejandro asked for
  those alerts.
- A blocker that was already notified and has not materially changed.
- Non-actionable status narration.
- Broad architecture ideas that are not blocking the current next action.

## Deduplication

Each notification-ready blocker should have a stable `human_boundary_id`.

Construct the id from:

- `next_action_id`
- source checkpoint
- boundary type
- required decision or approval phrase packet

Send one primary notification per `human_boundary_id`. Send a reminder only if
the blocker is still active after a meaningful interval, the evidence changed,
or Alejandro explicitly asked for reminders.

## Message Shape

Every notification should be short and actionable:

- `need`: what Alejandro must decide or provide.
- `why_now`: why this is the next useful blocker.
- `blocked_until`: what cannot continue without the input.
- `not_authorized`: what the operator will not do.
- `approval_or_decision_needed`: exact phrase or concise choice, if applicable.
- `evidence`: authoritative local receipt/checkpoint paths, redacted where
  needed.
- `next_step_after_response`: what resumes after Alejandro answers.

Do not include secrets, tokens, raw private URLs, raw recipient lists, raw
campaign ids, env values or confidential snippets in notifications.

## Channel Routing

Use Telegram first for normal actionable blockers.

Use personal email only when:

- Telegram is unavailable or insufficient.
- The blocker is important and stale.
- The decision requires a longer written record.
- Alejandro explicitly asks for email notification.

If neither channel is available, leave a local handoff and report that the
notification could not be sent.

## Relation To Launch OS Artifacts

- `docs/crm-vnext/launch-os-codex-profile.md` decides when this policy is in
  scope.
- `docs/crm-vnext/launch-os-next-action.md` declares the active blocker and
  should name the `human_boundary_id` when status is `blocked`.
- `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md` records the durable
  checkpoint after the boundary is resolved or explicitly deferred.
- Approval queue, blocked-gate handoff and validation receipts may feed a
  notification, but they are not approval and they do not send anything by
  themselves.
- Mantis digest should remember only the strategic decision or unresolved human
  blocker, not raw notification logs.

## Stop Conditions

Stop before sending a notification if:

- The channel would expose secrets or sensitive raw identifiers.
- The current evidence is stale or missing.
- The same `human_boundary_id` was already notified and nothing changed.
- The requested notification would imply approval for a live action.
- A newer user instruction supersedes the boundary.

# Launch OS Codex Profile

Purpose:

This profile routes Codex context for Launch OS Goals/play work. It keeps the
Launch OS interdepartmental scope intact while preventing each resume from
rehydrating the whole OpenClaw/Mantis universe when the active next action only
needs a narrow operating lane.

This file does not replace the Control Room, Active Next Action Contract,
operator runbook, approval queue, current-state refresh, validation receipt or
Mantis memory. It is the context filter Codex should apply before choosing what
to read next.

## Default Resume Sources

After this profile has been selected for Launch OS work, normal resumes should
read in this order:

1. `docs/crm-vnext/launch-os-next-action.md`
2. The latest relevant checkpoint in
   `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
3. `git status --short --branch`
4. Files and local reports named by the active `next_action_id`

Use this light hydration by default for microfixes, local report generation,
checkpoint updates, draft/test preflights, and continuation after a normal
Goal/play resume.

If `git status` shows changes from another lane or thread, do not mix them into
the current patch. Keep side-conversation process work and main Goal
implementation work separately staged and committed.

## Do Not Deep-Read By Default

For routine Launch OS development, do not deep-read these unless a stop/change
condition requires it:

- OpenClaw/Mantis soul, identity, persona or broad assistant boot documents.
- Long global memory files unrelated to the current `next_action_id`.
- Whole repositories outside the active authority lane.
- Historical reports not named by the current checkpoint or active contract.
- Side conversations, except for an explicit handoff that names changed state.

This is a routing rule, not a ban. Codex may escalate when the work genuinely
needs broader context.

## Deep Hydration Triggers

Escalate to deeper context only when at least one trigger is present:

- New strategic goal wording or phase change.
- Live-adjacent gate or exact approval boundary.
- Contradictory, stale or missing evidence.
- Failed validation, failed QA or unexpected git state.
- Multi-repo change crossing CRM, Brand Hub, Shopify/Web, MailerLite or
  OpenClaw/Mantis.
- A user explicitly asks for architecture review, methodology, memory, routing
  or operating-process discussion.
- Several commits have landed without a current Control Room checkpoint.

When escalating, say briefly why deeper hydration is needed before doing broad
reads.

## Authority Map

- Active next action: `docs/crm-vnext/launch-os-next-action.md`
- Macro state, checkpoints and gates:
  `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
- Operational evidence: `/Users/alejandrogomez/Documents/Mantis-Reports`
- Human-boundary notifications:
  `docs/crm-vnext/launch-os-human-boundary-notification-policy.md`
- Standing delegations:
  `docs/crm-vnext/launch-os-standing-delegation-policy.md`
- CRM/Launch OS implementation: `/Users/alejandrogomez/CRM`
- Shopify/Web assets: `/Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite`
- Brand/voice/value canon: Brand Hub documents, only when the active next
  action calls for Brand evidence.
- Mantis/OpenClaw strategic memory: use digest-level summaries, not raw
  implementation noise, unless operating handoff requires more. Use
  `docs/crm-vnext/mantis-digest-policy.md` for what should be promoted.

## MailerLite Test Email Route

For current Launch OS MailerLite seed/test emails:

- If a seed/test send fits
  `docs/crm-vnext/launch-os-standing-delegation-policy.md`, Codex may execute
  it as a delegated routine operation after fresh preflight/QA and local
  receipt generation, without asking Alejandro for a new exact phrase each
  time.
- Resume invariant: do not convert a delegated seed/test send into a human
  approval boundary just because an older checkpoint, old approval packet,
  historical receipt or stale next-action entry used exact-approval language for
  seed sends. The Standing Delegation policy is the current authority for this
  narrow operation.
- If the policy conditions are green, proceed through the delegated route. If
  they are not green, stop and report the concrete failed condition. The default
  response should not be another request for Alejandro to approve the same seed
  test email operation.
- Do not treat the MailerLite API as the primary test-send route.
- Use the MailerLite API for draft creation, read-only preflight, fresh QA,
  group/audience safety checks and local receipts.
- Use UI for actual test email sending:
  - Codex native operator: Computer Use semantic UI actions, preferably Safari
    when browser choice matters.
  - Mantis/OpenClaw operator: Chrome relay UI route if that is the configured
    operator lane.
- Prefer Computer Use semantic UI controls as the first route. Treat MailerLite
  UI failures as browser/app state before treating them as capability failure:
  refresh the page, close duplicate MailerLite tabs, reopen MailerLite in a
  clean Safari window when practical, navigate from Campaigns/Drafts instead of
  a stale deep URL, and retry the canonical draft/test-send flow.
- Durable Safari/Computer Use recovery procedure for MailerLite test sends:
  1. Stop after the first stale MailerLite state, hidden semantic control or
     `noWindowsAvailable` symptom. Do not repeat the same coordinate click.
  2. Open a real fresh Safari window from `File > New Window`. Do not rely on
     `Cmd+N` if Safari opens another tab in the stale window.
  3. Navigate to Campaigns/Drafts in that fresh window. If Safari offers or
     performs `Switch to Tab`, bypass the stale tab by loading the Drafts route
     with a harmless fresh-window query counter such as
     `codex_fresh_window_reset=<n>`.
  4. From Drafts, select the current target draft's `Schedule` link. If
     MailerLite routes through `Details`, use the visible `Continue` button to
     reach `Schedule`.
  5. Proceed only when Computer Use exposes `Send a test` as a semantic button
     and the campaign summary shows the Null Audience safety group.
  6. In the modal, replace MailerLite's default sender email with the approved
     seed recipient, verify the field value, then click the modal `Send`
     button.
  7. Treat the UI text `Test email sent.` as the success observation for that
     label, then record the UI-assisted send through the local receipt helper.
- The fresh-window reset is the preferred recovery path because historical
  failures came from stale MailerLite tabs/windows where the button was visible
  in the page but not available to Computer Use as an operable semantic
  control. In the 2026-06-03 rehearsal, a real Safari fresh window plus the
  fresh-window query counter restored the semantic `Send a test` button and
  completed the pending sends.
- Keep MailerLite UI attempts time-boxed. Default budget: one clean browser
  reset plus at most two canonical semantic routes before changing strategy.
  Do not spend a long run repeatedly searching for the same hidden control.
- For seed/test sends covered by
  `docs/crm-vnext/launch-os-standing-delegation-policy.md`, a minimal Computer
  Use visual/coordinate-click fallback is part of the delegated operation after
  the reset/timebox protocol. It does not require a new approval when every
  seed-test condition remains green, the control is visible, and the action is
  limited to MailerLite's `Send a test` flow for the approved seed recipient.
- Screenshot/capture inspection, system-click fallbacks, AppleScript/DOM click
  injection, Browser/Playwright fallback or other non-Computer-Use browser
  control are not the default route. They may be used only as a short, explicit
  fallback when Alejandro approves that route for the exact operation and the
  fallback does not broaden the live/action scope.
- If Computer Use and the reset protocol cannot expose and operate the required
  control within the budget, use the delegated minimal Computer Use
  visual/coordinate fallback when it can remain inside the seed-test policy;
  otherwise preserve any unconsumed portion of the operation, record which
  labels were actually sent, and report the remaining UI-route blocker.
- After UI completion, record the result through the local receipt path instead
  of rediscovering API endpoint limitations. The `record-ui-sent` helper path
  uses fresh MailerLite API QA and the Standing Delegation; it must not ask for
  a fresh exact seed-send approval phrase when every delegation condition is
  green. API `--execute` remains exact-approval gated and is not the primary
  route.

This rule prevents repeated token spend on relearning that API preflight is
useful but API test-send is not the stable operating path for this system. The
goal is operational reliability: routine test emails should normally be a short
Computer Use flow with reset/fallback handling, not an hour-long UI incident.

## Side Conversation Handoff

Side conversations may help with explanation, approval wording and small
process patches. If a side conversation changes real state or consumes an exact
approval, the main Goal thread must receive a short handoff containing:

- What changed.
- Which receipt(s) are authoritative.
- Which approval was consumed.
- What must not be repeated.
- The next real boundary.

Without that handoff, the main Goal may correctly continue from its own lane but
miss side-thread state.

## Mantis Memory Posture

Mantis should remember strategic operating facts:

- Capability added.
- Strategic decision made.
- Current operating posture.
- Live gate status.
- Unresolved human/product decision.
- Next operator implication.

Avoid storing routine diffs, transient script names, temporary report paths,
resolved error loops or raw logs as long-term Mantis memory unless they change
how the system should operate later.

## Live Gate Discipline

Exact approvals are one-shot. Before repeating any approved action, verify
whether the approval was already consumed by a current receipt.

Standing delegations are narrow exceptions only when they are explicitly
recorded in `docs/crm-vnext/launch-os-standing-delegation-policy.md` and every
condition is still satisfied by fresh evidence.

Never infer that approval for one boundary authorizes the next boundary. Draft
creation, public/audience send, workflow mutation, Shopify publish, CRM write,
ledger/card/scoring update and Fact Store write remain separate gates unless
Alejandro explicitly combines them in a fresh approval. Test email sending is a
standing-delegated operation only inside the seed-recipient/Null Audience
conditions defined in the standing delegation policy.

## Human Boundary Notifications

When a Goal/play run is blocked by a real human decision or exact approval, use
`docs/crm-vnext/launch-os-human-boundary-notification-policy.md` before
notifying Alejandro. Notifications are for surfacing blockers only; they are
not approval, execution or permission to mutate live systems.

## Completion Standard

A normal Launch OS resume should close with only:

- New delta.
- New evidence.
- Next real boundary.

Do not recite old steers, old explanations or previously answered questions
unless Alejandro asks for them again.

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
- CRM/Launch OS implementation: `/Users/alejandrogomez/CRM`
- Shopify/Web assets: `/Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite`
- Brand/voice/value canon: Brand Hub documents, only when the active next
  action calls for Brand evidence.
- Mantis/OpenClaw strategic memory: use digest-level summaries, not raw
  implementation noise, unless operating handoff requires more. Use
  `docs/crm-vnext/mantis-digest-policy.md` for what should be promoted.

## MailerLite Test Email Route

For current Launch OS MailerLite seed/test emails:

- Do not treat the MailerLite API as the primary test-send route.
- Use the MailerLite API for draft creation, read-only preflight, fresh QA,
  group/audience safety checks and local receipts.
- Use UI for actual test email sending:
  - Codex native operator: Computer Use semantic UI actions, preferably Safari
    when browser choice matters.
  - Mantis/OpenClaw operator: Chrome relay UI route if that is the configured
    operator lane.
- Prefer semantic UI controls. For Codex-operated MailerLite UI work, do not
  use screenshot/capture inspection, coordinate clicks, system-click fallbacks,
  AppleScript/DOM click injection or other non-semantic browser control. If
  Computer Use cannot expose and operate the required control semantically,
  stop, preserve the approval as unconsumed when no send occurred, and report
  the UI-route blocker.
- After UI completion, record the result through the local receipt path instead
  of rediscovering API endpoint limitations.

This rule prevents repeated token spend on relearning that API preflight is
useful but API test-send is not the stable operating path for this system.

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

Never infer that approval for one boundary authorizes the next boundary. Draft
creation, test email sending, public/audience send, workflow mutation, Shopify
publish, CRM write, ledger/card/scoring update and Fact Store write remain
separate gates unless Alejandro explicitly combines them in a fresh approval.

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

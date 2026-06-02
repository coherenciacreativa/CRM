# Launch OS Mantis Digest Policy

Purpose:

This policy defines what Launch OS work should be summarized for Mantis/OpenClaw
memory after a milestone, and what should stay in operational reports or git
history. Mantis should remember the strategic operating shape of the system, not
absorb every implementation detail Codex touched while building it.

This file is a memory-routing policy. It does not authorize live MailerLite,
Shopify, CRM, subscriber, workflow, send, ledger, card, scoring or Fact Store
actions.

## When To Produce A Digest

Produce a Mantis digest when a Launch OS milestone changes at least one of:

- A durable capability Mantis may operate later.
- A strategic or CEO-facing decision.
- A live-gate posture.
- A repeatable operating route.
- A cross-department contract between Brand, Web/Shopify, MailerLite or CRM.
- A human approval boundary.
- A known failure mode that changes how the system should operate.

Do not produce a digest for every small diff, syntax check, local report refresh
or transient investigation.

## Digest Shape

A Launch OS digest should be short and use this shape:

- `capability_added`: what the system can now do.
- `strategic_decision`: what was decided and why it matters.
- `current_operating_posture`: how the system should behave now.
- `live_gate_status`: what remains closed, approved or consumed.
- `unresolved_decision`: what still requires Alejandro or department input.
- `next_operator_implication`: what Mantis/Codex should do differently next.
- `authoritative_evidence`: only stable report/control paths needed to resume.

Use plain language. Include exact paths only when they are operationally
authoritative for the next operator.

## Promote To Mantis Memory

Promote these kinds of facts:

- Launch OS is an interdepartmental market-learning operating system, not only
  MailerLite automation.
- CEO Proposal Packet and Product Value Gate are v0 lanes when they change
  readiness or decision flow.
- Exact approvals are one-shot and must be checked against receipts before
  reuse.
- MailerLite API is useful for draft creation, fresh preflight, QA and receipts;
  current seed/test email sending should route through UI/Computer Use or the
  Mantis UI relay, then be recorded locally.
- Null Audience safety group posture, when it is the current operating route.
- Brand/Web/CRM final-response posture when it changes launch readiness.
- Sidechat state changes require a handoff to the main Goal thread.

## Keep Out Of Mantis Long-Term Memory

Do not promote routine implementation noise:

- Full diffs or commit-by-commit code summaries.
- Temporary script names unless they become an operator command.
- Raw local paths for every intermediate report.
- Raw IDs, exact URLs, recipients, sender values, tokens or credential-adjacent
  material.
- Error loops that were resolved and do not change future behavior.
- Screenshots, UI coordinate details or browser state that was only tactical.
- Repeated explanations already captured by the Control Room or Next Action.

The Control Room, git history and `/Users/alejandrogomez/Documents/Mantis-Reports`
remain the right place for detailed evidence.

## Recommended Digest Example

```text
Launch OS digest:
- capability_added: MailerLite Null Audience replacement drafts can now be
  created by API after exact approval and verified by post-create QA.
- strategic_decision: Keep drafts inert on the empty safety audience until seed
  inbox QA is explicitly approved.
- current_operating_posture: API for draft/preflight/QA; UI/Computer Use for
  test sends; no public audience or workflow actions.
- live_gate_status: draft creation approval consumed; seed-test approval remains
  separate.
- unresolved_decision: wait for Alejandro approval before test emails or later
  CEO review.
- next_operator_implication: do not recreate drafts; continue from current
  receipts and active next action.
```

## Relationship To Other Launch OS Files

- `docs/crm-vnext/launch-os-codex-profile.md` decides what Codex should read by
  default during a Goal/play resume.
- `docs/crm-vnext/launch-os-next-action.md` records the active tactical next
  action.
- `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md` records checkpoints,
  evidence and macro state.
- This policy decides what should be distilled into Mantis/OpenClaw strategic
  memory after a meaningful milestone.

## Safety

Digest creation is local-only and editorial. A digest is never an approval,
never a live gate, and never a substitute for a receipt.

If a digest mentions an approval, it must state whether that approval is still
pending, already consumed, or blocked.

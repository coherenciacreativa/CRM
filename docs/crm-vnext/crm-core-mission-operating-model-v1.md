# CRM Core Mission Operating Model v1

Date: 2026-07-11
Status: proposed for central adoption

## Purpose

Operate CRM Core as outcome-led missions instead of chains of micro-gates. The
default experience is one CEO approval, autonomous bounded execution, at most
one real exception, one central integration, and one final CEO brief.

CRM Core's North Star is an autonomous community intelligence and onboarding
system. It progressively connects approved Instagram, email, manual-evidence,
and future source adapters; maintains identity, dedupe, provenance, and signal
strength; supports future heat, relationship depth, candidate/contact cards,
and next-best-action previews; and helps Alejandro understand and serve the
community without turning weak signals into unauthorized outreach.

The Controlled Welcome Flow is one vertical slice, not the North Star itself.

## Source of truth and boundaries

- Treat the Git repository, approved central integration records, and current
  branch/commit as authoritative.
- Treat project files and context packs as orientation snapshots. Refresh them
  before declaring current technical state.
- Never use `/Users/alejandrogomez/CRM`.
- Keep source, live, private, action, and write effects behind exact approval.
- Never place secrets, raw identities, private values, source payloads, private
  artifact contents, or raw target URLs in repo docs, project chats, or briefs.
- Preserve lane, source, privacy, and recipient boundaries even when the
  technical action appears mechanical.

## Roles

### Alejandro / CEO

- Choose the business outcome.
- Approve real effects and decide genuine business ambiguity.
- Receive the final outcome brief.
- Do not act as copy/paste transport between agents or tools.

### Chief Architect

- Protect the North Star and select the highest-leverage mission.
- Define architecture, mission envelope, boundaries, and success evidence once.
- Resolve cross-lane exceptions and review final outcomes or real escalations.
- Do not micromanage routine commands or manufacture giant tactical prompts by
  default.

### Codex mission worker

- Investigate, plan, implement, test, self-repair, and self-review inside the
  approved mission envelope.
- Use an executor plus an independent adversarial reviewer.
- Keep deterministic allowlists and validation evidence.
- Escalate only a defined exception.
- Integrate centrally once at mission end and return one outcome brief.

### Lane consultants

- Provide optional, high-value specialist judgment.
- Do not become mandatory routine gates.
- Do not use UI relay unless its judgment value clearly exceeds the overhead.

### Central worker

- Hold the Central Integration Lock for the final bounded integration.
- Validate source commits and file allowlists.
- Perform one central integration per mission, not a closeout after every
  microstep.

## Mission lifecycle

1. CEO approves one outcome and its exact real effects.
2. Chief Architect defines one compact Mission Contract.
3. Executor performs discovery and implementation within the envelope.
4. Executor tests and may self-repair within budget.
5. Adversarial reviewer checks outcome, safety, bureaucracy, and scope.
6. Executor applies only high-confidence reviewer corrections.
7. Central worker integrates once and synchronizes clean canonical lanes.
8. CEO receives one outcome brief and the next highest-leverage decision.

Do not insert routine CEO handoffs, central-doc edits, or consultant relays
between steps that depend on the same fresh state.

## Mission Contract

Every mission must declare:

- `mission_id`
- `business_outcome`
- `observable_success`
- `mode`: `proof` or `hardening`
- `approved_effects`
- `forbidden_scope`
- `source_private_boundaries`
- `autonomy_budget`
- `self_repair_budget`
- `manual_intervention_policy`
- `atomicity_freshness_requirements`
- `reviewer_plan`
- `escalation_conditions`
- `central_integration_plan`
- `final_ceo_brief_fields`

Use the repo template in
`docs/crm-vnext/crm-core-mission-contract-template-v1.md` or the compact skill
template in
`.agents/skills/crm-core-mission-operator/references/mission-contract-template.md`.

## Default autonomy budget

- Maximum repair cycles: `3`.
- Maximum elapsed mission time: `120 minutes`.
- New target, person, source, recipient, permission, or real effect: `0` beyond
  initial approval.
- Review pattern: executor plus independent adversarial reviewer.
- Validation: deterministic tests, explicit file/effect allowlists, and
  redacted receipts.
- CEO interruptions for safe mechanical repair: `0`.
- Central integrations: `1`.

The Mission Contract may tighten these limits. It may not silently widen
approved effects.

## Escalate only when

- A business decision is genuinely ambiguous.
- Identity is ambiguous.
- A privacy or source boundary is uncertain.
- An additional unapproved real effect is required.
- A prior mutation may have occurred and retry could duplicate it.
- Post-mutation state is unknown.
- The repair budget is exhausted.
- User-owned dirty work may be overwritten.
- An irreversible action is required without exact approval.
- Human authentication, MFA, or a security confirmation is required.
- A required UI configuration control is unavailable.

Do not escalate for a missing receipt field, formatting, a mechanical schema
mismatch, a safely repairable test, a route bug before mutation, an expected
mock failure, or a stale snapshot that can be refreshed atomically.

When escalation is required, report one concise exception containing the
observable blocker, why it is outside the envelope, the smallest CEO decision,
and what remains safely completed.

## One approval / one brief default

Target future mission UX:

- `CEO_touch_count <= 2`
- `human_copy_paste_handoffs = 0`
- `exception_escalation_count <= 1`
- `central_integration_count = 1`

The two CEO touches are the initial approval and final brief. An exception is
not a routine touch target; it is a bounded contingency.

## Freshness and atomicity

Run every freshness-coupled sequence as one uninterrupted unit:

`fresh check -> preflight -> approved real action -> immediate verification -> redacted receipt -> one closeout`

Do not put a central integration, documentation handoff, consultant relay, or
CEO copy/paste step in the middle. If freshness expires before the real action,
restart the fresh check rather than reusing stale evidence.

## Manual intervention in Proof Mode

Permit one logged manual intervention when all are true:

- It takes under 10 minutes.
- It is reversible or low-risk.
- It is privacy-safe.
- It does not broaden recipients, permissions, identity scope, or real effects.
- It does not conceal a production-critical issue.

Record:

```yaml
manual_intervention_used: true
hardening_candidate: true | false
reason: <redacted bounded reason>
```

Do not build a general guard for a one-off anomaly unless the leverage filter
passes.

## Leverage filter

Before creating a new artifact, guard, abstraction, or automation, require at
least one:

- It unlocks the current milestone.
- It is expected to be reused at least three times.
- It removes recurring CEO or operator labor.
- It prevents material harm.
- It is required for autonomous operation.

If none applies, use a bounded manual workaround in Proof Mode, log it, and
place hardening in backlog.

## Proof and Hardening modes

### Proof Mode

Optimize for time to learning, time to visible value, the smallest safe proof,
explicit manual interventions, and no unnecessary architecture. A controlled
technical path is evidence, not proof of production generalization.

### Hardening Mode

Enter after value is proven or material operational risk requires it. Optimize
for repeatability, concurrency, resilience, generalization, elimination of
recurring manual steps, observability, and production safety.

Use `docs/crm-vnext/crm-core-proof-vs-hardening-mode-v1.md` for the decision
test and transition evidence.

## Adversarial review

The reviewer must not approve its own first draft. It must check:

- Does this deliver an observable business outcome instead of artifact volume?
- Does any rule recreate CEO copy/paste loops or routine consultant gates?
- Are source, live, private, action, and write effects still exactly gated?
- Is a bounded manual intervention available in Proof Mode?
- Are escalation conditions narrow, observable, and outside repair budget?
- Is there exactly one final central integration?
- Is autonomy bounded without weakening privacy or identity safety?

Apply only high-confidence fixes. Log disputed or non-blocking suggestions as
backlog rather than expanding mission scope.

## Central integration

- Acquire the Central Integration Lock once.
- Require an independent redacted integration record with packet ID, current
  central HEAD and active-next-action freshness, every approved source SHA, the
  exact changed-file allowlist, required checks, and
  `green_to_self_integrate`. Never fabricate the verdict.
- Acquire one Central Integration Lock and hold it for the complete approved
  multi-source integration.
- Revalidate central hygiene, source commits, and the exact changed-file
  allowlist.
- Reject unrelated lane diffs and private artifacts.
- Run the mission's deterministic tests and redaction checks.
- Integrate all approved mission artifacts in one final central commit.
- Fast-forward only clean canonical lanes that can move without overwriting
  user work.
- Release the lock and record the final central commit.

## Mission metrics

Record:

- `time_to_verified_outcome`
- `CEO_touch_count`
- `human_copy_paste_handoffs`
- `exception_escalation_count`
- `repair_cycle_count`
- `manual_intervention_count`
- `source_action_count`
- `real_effect_count`
- `central_integration_count`
- `leverage_filter_result`

Metrics describe the mission; they do not replace observable product evidence.

## Final CEO brief

Return one concise brief with:

- mission and business outcome;
- observable success and evidence status;
- technical progress versus product outcome;
- approved real effects actually executed;
- source/private boundary confirmation;
- repair cycles, manual interventions, exceptions, and CEO touches;
- all ten mission metrics, including time to verified outcome, copy/paste
  handoffs, source actions, real effects, integration count, and leverage
  result;
- final central commit and synchronized lanes;
- remaining risk or blocker;
- next highest-leverage decision.

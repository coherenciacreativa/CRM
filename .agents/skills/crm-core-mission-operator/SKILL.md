---
name: crm-core-mission-operator
description: Prepare, review, or operate bounded CRM Core outcome missions with a compact Mission Contract, Proof or Hardening mode, explicit source and privacy gates, executor plus adversarial review, limited self-repair, one central integration when repo changes are approved, and one CEO brief. Use for CRM Core mission planning, approved implementation, repair, review, or integration work that must avoid routine CEO copy-paste handoffs and preserve exact effect boundaries.
---

# CRM Core Mission Operator

## Protect the North Star

Treat CRM Core as an autonomous community intelligence and onboarding system
that progressively connects approved community signals, email engagement,
manual evidence, and future adapters while preserving identity, dedupe,
provenance, signal strength, and outreach policy. Treat the Controlled Welcome
Flow as one vertical slice, never as the whole product.

## Establish authority

1. Work only in the explicitly approved CRM Core repo or lane.
2. Never use `/Users/alejandrogomez/CRM`.
3. Read current Git branch, commit, status, central records, and active next
   action before relying on an orientation snapshot.
4. Treat repo and central integration records as source of truth. Treat project
   files as redacted, potentially stale orientation only.
5. Keep secrets, raw identities, private values, source payloads, private
   artifact contents, and raw target URLs out of output and tracked files.

## Define one mission

Read `references/mission-contract-template.md` and complete every field. Reject
an execution envelope that omits observable success, exact effects, forbidden
scope, source/private boundaries, repair limits, or escalation conditions.

Before any source, live, private-read, action, write, send, mutation,
permission, or irreversible effect, verify that the current user request
explicitly approves the completed contract version, exact effects, targets,
sources, private reads, stop rules, and freshness sequence. If approval is
missing or narrower than the contract, present one compact approval request and
stop before effects. Approval of planning, investigation, or preflight is not
execution approval.

## Prove the problem before engineering

Hydrate `docs/crm-vnext/crm-core-problem-reality-gate-v1.md` before designing a
new mission or making a tracked write in response to a blocker. Complete the
`problem_reality_gate` nested under `approval_gate` in the Mission Contract.

Evidence levels are closed:

- `codex_claimed`
- `repo_verified`
- `reproduced_no_effect`
- `runtime_empirical`
- `product_observed`

Diagnosis verdicts are closed:

- `verified_problem`
- `existing_solution_or_route`
- `insufficient_evidence`

Treat `codex_claimed` as HOLD. A repo contradiction may use `repo_verified` for
one bounded repo repair. Runtime, browser, source, and tool claims require
`reproduced_no_effect` or `runtime_empirical`. Any proposed new backend,
runtime, source family, capability family, or authority requires
`runtime_empirical`, a tested and rejected no-build option, a causal link,
indispensability, and a Chief Architect ruling. Product-readiness claims require
`product_observed`.

Search the canonical repo and current routes before concluding that something
is missing. If an existing component is found but was not loaded or invoked,
return `existing_solution_or_route`; repair hydration or the entrypoint before
considering new architecture. Review diagnosis before artifact quality. A
technically correct fix for an unverified problem remains HOLD.

Default to:

- maximum `3` repair cycles;
- maximum `120 minutes`;
- executor plus independent adversarial reviewer;
- zero new target, person, source, recipient, permission, or real effect;
- deterministic tests and allowlists;
- zero routine CEO copy/paste handoffs;
- one final central integration and one final CEO brief.

## Choose the mode

- Choose `proof` for the smallest safe test of value or learning. Permit a
  logged sub-10-minute, reversible, privacy-safe manual intervention that does
  not widen permissions, recipients, identity scope, or real effects.
- Choose `hardening` only after value is proven or material operational risk
  requires repeatability, resilience, concurrency, or generalization.

Before building reusable machinery, require that it unlock the current
milestone, will likely be reused three times, removes recurring human labor,
prevents material harm, or is required for autonomous operation. Otherwise use
a bounded Proof Mode workaround and backlog the hardening.

## Plan, execute, and repair

For planning, review, or output-only work, produce the requested artifact and
stop without repo writes, lock acquisition, integration, or other real effects.
The remaining steps apply only when the contract already authorizes execution.

1. Investigate within the approved file, repo, source, and privacy boundaries.
2. Implement the smallest change that can achieve observable success.
3. Run deterministic validation and redaction checks.
4. Repair safe mechanical failures within budget without CEO interruption.
5. Ask an independent reviewer to challenge bureaucracy, ambiguity,
   overbuilding, unsafe autonomy, hidden real effects, and copy/paste loops.
6. Apply only high-confidence reviewer fixes.

Keep freshness-coupled work atomic:

`fresh check -> preflight -> approved action -> immediate verification -> redacted receipt -> one closeout`

Do not place central docs, consultant relays, or human handoffs inside that
sequence.

## Escalate narrowly

Escalate only for genuine business ambiguity, ambiguous identity, uncertain
privacy or source boundaries, a required unapproved real effect,
duplicate-mutation risk, unknown post-mutation state, exhausted repair budget,
risk to user-owned dirty work, an unapproved irreversible action, required
human authentication/security confirmation, or absence of a required UI
control.

Continue autonomously for formatting, missing receipt fields, mechanical schema
repairs, safe test repairs, pre-mutation route bugs, expected mock failures, and
atomically refreshable snapshots.

## Integrate and brief once

For an approved mission that produced repo changes, require an independent
reviewer to issue a redacted integration record containing a packet ID, current
central HEAD and active-next-action freshness, every source SHA, the exact file
allowlist, required checks, and `green_to_self_integrate`. Hold one Central
Integration Lock across the whole multi-source integration, integrate once,
run relevant tests, fast-forward only clean canonical lanes, release the lock,
and report the final central commit. Never fabricate the green verdict.

Return one CEO brief that separates technical progress, controlled proof,
product outcome, and production readiness. Include executed effects, evidence,
metrics, boundary confirmation, remaining risk, and the next highest-leverage
decision.

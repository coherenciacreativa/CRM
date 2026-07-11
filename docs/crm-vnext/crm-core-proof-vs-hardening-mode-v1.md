# CRM Core Proof vs Hardening Mode v1

Date: 2026-07-11
Status: operating policy

## Decision rule

Choose Proof Mode by default until an observable product outcome demonstrates
value. Choose Hardening Mode only when value is proven or a material safety or
operational risk requires it now.

Do not confuse a completed technical milestone, one controlled path, or one
clean receipt with production-ready generalization.

## Proof Mode

Optimize for:

- time to learning;
- time to visible value;
- smallest safe proof;
- one business outcome;
- explicit manual interventions;
- minimal architecture and artifact count.

Allowed:

- a bounded manual workaround when the leverage filter does not justify new
  engineering;
- mock-tested or controlled-path validation;
- a logged sub-10-minute intervention that is reversible or low-risk,
  privacy-safe, does not expand recipients or permissions, and does not hide a
  production-critical issue.

Required manual-intervention record:

```yaml
manual_intervention_used: true
hardening_candidate: true | false
duration_minutes: <integer under 10>
reason: <redacted bounded reason>
```

Exit Proof Mode when the intended product outcome has observable evidence and
the remaining problem is repeatability, scale, resilience, or material risk.

## Hardening Mode

Optimize for:

- repeatability and deterministic behavior;
- concurrency and conflict safety;
- resilience and recovery;
- generalized inputs and source adapters;
- elimination of recurring manual labor;
- production observability and privacy safety.

Hardening is justified when at least one is true:

- proven value will be reused repeatedly;
- the same manual intervention recurs;
- concurrency or retries can cause duplicate effects;
- a failure can create material privacy, identity, recipient, or source harm;
- autonomous operation requires the guard;
- the current mission cannot safely complete without it.

Hardening is not justified merely because a comprehensive abstraction is
possible.

## Leverage filter

Before building a reusable guard, service, schema, dashboard, queue, adapter, or
automation, require at least one:

1. It unlocks the current milestone.
2. Expected reuse is at least three times.
3. It removes recurring CEO or operator labor.
4. It prevents material harm.
5. It is required for autonomous operation.

If none applies, keep the mission in Proof Mode, use a bounded workaround, log
the intervention, and move hardening to backlog.

## Mode-change record

```yaml
from_mode: proof | hardening
to_mode: proof | hardening
observable_value_evidence: <redacted reference>
material_risk_or_reuse_trigger: <reason>
leverage_filter_result: <criterion>
new_budget_or_scope: <explicit delta>
CEO_approval_required: true | false
```

A mode change never grants a new real effect. Any new source, recipient,
permission, write, send, mutation, or irreversible action requires explicit
approval in the Mission Contract.

## CRM Core examples

- One controlled welcome path can prove integration value while official source
  generalization, active-trigger correctness, and delivery observability remain
  unproven. That remains Proof Mode.
- A one-off lookup-route bug before mutation should be repaired and tested
  within budget, not escalated into a new CEO gate.
- Repeated source drift, duplicate-mutation risk, or a recurring manual route
can justify Hardening Mode when the leverage filter passes.

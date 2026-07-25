# CRM Core Problem Reality Gate v1

Date: 2026-07-25
Status: mandatory governance contract

## Purpose

Prevent CRM Core from building around narrated, stale, misdiagnosed, or already
solved blockers. The gate requires Codex to prove the problem, its first
divergence, and the causal need for a proposed fix before tracked engineering
or a blocker-driven Chief Architect packet.

This contract introduces no source, private-read, browser, model-routing,
backend, runtime, capability, integration, or live authority.

## Applicability

Set `applicability: required` before:

- any tracked write responding to a blocker;
- any new artifact, abstraction, adapter, runtime, backend, source family,
  capability family, or authority;
- any Chief Architect packet requesting new engineering because something is
  allegedly missing or broken.

Use `not_applicable` only when the work does not respond to a blocker and does
not propose new engineering. State the reason. `not_applicable` cannot be used
to bypass a required gate.

## Required Evidence Block

Keep this block nested under `approval_gate` in the Mission Contract:

```yaml
problem_reality_gate:
  applicability: required | not_applicable
  claimed_blocker: <redacted blocker label or none>
  evidence_level: codex_claimed | repo_verified | reproduced_no_effect | runtime_empirical | product_observed
  canonical_state_verified: false
  expected_behavior: <redacted expected behavior>
  observed_behavior: <redacted observed behavior>
  first_divergence: <first verified divergence or unknown>
  existing_solution_search: <paths and aggregate search state>
  existing_component_loaded_and_invoked: false
  alternative_explanations_tested: []
  minimal_reproduction: <redacted no-effect reproduction or not_run>
  causal_link_to_proposed_fix: <verified link or unproven>
  no_build_option: <tested route and result>
  new_engineering_indispensable: false
  remaining_uncertainty: <redacted uncertainty>
  diagnosis_verdict: verified_problem | existing_solution_or_route | insufficient_evidence
```

Every field is required when `applicability: required`. Evidence uses path
labels, aggregate states, and redacted reproduction results. Never include raw
private data, identities, source payloads, URLs, screenshots, clipboard
contents, credentials, or giant logs.

## Evidence Levels

### `codex_claimed`

The blocker is narrated or inferred but not verified against current canonical
state. Result: no build and HOLD.

### `repo_verified`

The exact current branch/SHA and relevant files demonstrate a documentation,
test, template, or contract contradiction. It may permit one bounded repair of
that exact repo contradiction. It does not prove a runtime, browser, source, or
product defect.

### `reproduced_no_effect`

The claimed runtime, browser, source, or tool failure was reproduced through an
approved zero-effect route with redacted results. It can prove the failure but
does not by itself prove a proposed architecture is necessary.

### `runtime_empirical`

Current environment evidence demonstrates the defect and its first divergence.
New backend, runtime, source-family, capability-family, or authority work also
requires rejection of a tested no-build route, causal proof, indispensability,
and a Chief Architect ruling.

### `product_observed`

Fresh product observation proves the user-visible outcome. Synthetic tests,
repo evidence, and runtime health cannot substitute for this level when claiming
product readiness.

## Diagnosis Verdicts

- `verified_problem`: the evidence threshold matches the claim, the first
  divergence is known, and the causal link is established for the bounded
  proposal.
- `existing_solution_or_route`: canonical search found an existing component or
  route, especially when it was not loaded or invoked. Repair hydration,
  entrypoint selection, or invocation before considering replacement.
- `insufficient_evidence`: the threshold is not met, causal proof is missing, or
  material uncertainty remains. HOLD with no tracked engineering.

Failure to find a component is not proof of nonexistence.

## Threshold Matrix

| Claim | Minimum evidence | Additional requirements | Allowed outcome |
| --- | --- | --- | --- |
| Narrated blocker | `codex_claimed` | none | HOLD / no build |
| Exact docs, test, template, or contract contradiction | `repo_verified` | exact current SHA and bounded diff | one bounded repo repair |
| Runtime, browser, source, or tool defect | `reproduced_no_effect` or `runtime_empirical` | first divergence and redacted reproduction | bounded diagnosis or repair |
| New backend, runtime, source family, capability family, or authority | `runtime_empirical` | rejected no-build route, causal proof, indispensability, Chief Architect ruling | separately authorized bounded mission |
| Product readiness | `product_observed` | fresh user-visible evidence | readiness claim within its observed scope |

## Required Sequence

1. Verify branch, SHA, upstream, worktree, and active contract.
2. State expected and observed behavior without private output.
3. Identify the first divergence.
4. Search canonical docs, skills, scripts, tests, entrypoints, and current routes.
5. Load and invoke an existing component when safely possible.
6. Test alternative explanations.
7. Run the smallest allowed reproduction at the required evidence level.
8. Test a no-build route.
9. Establish or reject the causal link and indispensability.
10. Issue one diagnosis verdict.

Stop before tracked writes unless the verdict is `verified_problem` and the
proposal is within the evidence threshold and approved mission. If the verdict
is `existing_solution_or_route`, use or repair that route. If it is
`insufficient_evidence`, HOLD.

## Reviewer Order

1. An independent reviewer assesses diagnosis, evidence threshold, existing
   solution search, alternative explanations, reproduction, causal link,
   no-build route, and indispensability.
2. Only after diagnosis is verified may the reviewer assess artifact quality.

A technically correct fix for an unverified problem remains HOLD.

## Synthetic Acceptance Cases

1. A “missing component” claim where repo search finds an existing entrypoint
   that was not invoked returns `existing_solution_or_route` and no build.
2. An exact documentation contradiction at the current SHA with
   `repo_verified` evidence is eligible only for one bounded repo repair.
3. A narrated runtime blocker without reproduction returns
   `insufficient_evidence` and HOLD.

## Fail-Closed Boundary

This gate grants no permission to read private artifacts, open a browser, call a
source, mutate a repository, add model routing, create architecture, integrate,
or produce a live effect. Those actions require their own exact mission
authority after this gate is green.

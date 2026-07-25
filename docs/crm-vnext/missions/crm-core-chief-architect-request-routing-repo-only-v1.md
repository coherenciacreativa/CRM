# CRM Core Chief Architect Request Routing — Repo-only Mission v1

Mission id:
`crm_core_chief_architect_request_routing_repo_only_v1_20260725`

Mode: hardening, repo-only, no source, no live effects.

## Business outcome

Convert the already documented four-part Chief Architect chat structure into a
deterministic routing contract enforced by the existing relay lock. Wrong-role
or cross-mission packets must stop before Send while the existing 00
integration and registered mission routes remain compatible.

## Approval gate

```yaml
approval_gate:
  problem_reality_gate:
    applicability: required
    claimed_blocker: >-
      The project bootstrap defines separate operating-model,
      architecture-exception, and mission chats, but the executable relay
      recognizes only the existing 00 standing target and mission target
      pattern.
    evidence_level: repo_verified
    canonical_state_verified: true
    expected_behavior: >-
      Each request class is admitted only to its canonical registered chat.
    observed_behavior: >-
      The bootstrap defines 00, 01, 02 and mission chats, while the current
      relay has no standing role for 01 or 02 and no request-class-to-target
      enforcement.
    first_divergence: >-
      The consultant relay target-kind and preflight rules do not encode the
      standing 01 and 02 roles or reject a valid packet sent to the wrong
      project chat.
    existing_solution_search: >-
      Reuse the existing target registry, route fingerprints, relay lock,
      dynamic preflight, mission-target pattern and packet validation.
      No parallel router or registry exists or is needed.
    existing_component_loaded_and_invoked: true
    existing_component_invocation_evidence: >-
      The baseline relay entrypoint and its synthetic no-effect suite were
      invoked before implementation; they accepted 00 and Mission target
      families but exposed no standing 01 or 02 target class.
    alternative_explanations_tested:
      - using 00 for every request preserves transport but defeats chat separation
      - mission target support exists but does not cover operating-model or architecture-exception requests
    minimal_reproduction: >-
      Repo-only inspection shows the bootstrap chat roles and the narrower
      current executable target validation.
    causal_link_to_proposed_fix: >-
      Extending the existing relay role table and request-class validation
      directly closes the routing mismatch without changing transport.
    no_build_option: >-
      Continuing to use 00 for every request was rejected because one universal
      target cannot satisfy the repo-defined expectation that each request
      class is admitted only to its canonical registered role.
    new_engineering_indispensable: true
    remaining_uncertainty: >-
      Private registry entries and ChatGPT UI cutover remain a later bounded
      configuration step after this code is integrated.
    diagnosis_verdict: verified_problem
```

No new backend, runtime, source family, capability family, or authority is
created.

## Exact implementation boundary

Maximum nine tracked paths:

1. `AGENTS.md`
2. `scripts/crm-vnext-consultant-relay-lock.mjs`
3. `__tests__/crm-vnext-consultant-relay-lock.spec.ts`
4. `docs/crm-vnext/crm-core-chief-architect-project-bootstrap-v1.md`
5. `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
6. `docs/crm-vnext/crm-core-codex-profile.md`
7. `.agents/skills/crm-core-mission-operator/SKILL.md`
8. `docs/crm-vnext/crm-core-chief-architect-request-routing-v1.md`
9. `docs/crm-vnext/missions/crm-core-chief-architect-request-routing-repo-only-v1.md`

The implementation may extend only the existing target recognition,
registration, static/dynamic preflight, redacted output metadata, documentation
hydration, and synthetic tests. Existing private registry and lock formats
remain the sole infrastructure.

## Observable success

- one closed class-to-role matrix is canonical and documented;
- all allowed classes pass only on their assigned target;
- every explicit cross-role combination fails before lock creation;
- unknown target/class, missing declarations, label drift, and cross-mission
  target drift fail closed;
- existing 00 integration and registered mission packets remain green;
- registration of 01/02 reuses the current owner-only registry/receipt path and
  preserves 00;
- tests use only secret-free temporary fixtures;
- exact allowlist, syntax, focused tests, diff check, redaction scan, and
  no-positive-authority scan are green;
- independent diagnosis review precedes independent artifact review.

## Forbidden

- ChatGPT project or chat mutation during implementation;
- private target-registry or receipt reads/writes;
- browser, Instagram, source, profile, thread, picker, audio, Send, MailerLite,
  CRM, campaign, Ads, proxy, or other effect;
- new registry, router service, lock, transport, backend, runtime, emitter,
  bridge, source family, capability family, or authority;
- edits outside the nine-path allowlist;
- product-readiness or source-readiness claims based on synthetic tests.

## Integration boundary

An isolated checkpoint may be committed and pushed only after deterministic
validation is green. Central integration requires a commit-bound independent
diagnosis and artifact review from the canonical Chief Architect, including
`green_to_self_integrate`, `safe_to_self_integrate_now=true`, and
`ceo_decision_needed=false`. One Central Integration Lock, one fast-forward
integration, one validation pass, and one push are the maximum.

## Deferred UI cutover packet

If central integration succeeds, return a compact, non-executed packet for a
later explicit operation that:

1. registers 01 and 02 in the existing owner-only registry;
2. registers one fresh Mission target without replacing 00;
3. refreshes the project orientation pack;
4. verifies accepted and rejected routing cases with secret-free packets.

That packet grants no UI, registry, or relay authority by itself.

# CRM Core Chief Architect Request Routing v1

Status: repo-only routing contract. It grants no source, browser, registry,
ChatGPT UI, integration, or live authority.

## Outcome

Make the existing private project chat structure executable and fail closed.
Every explicit Chief Architect request is classified before Send, bound to one
registered target, and rejected before relay-lock acquisition when its class,
target id, or exact chat label does not match.

## Closed target matrix

| Target id or family | Exact chat role | Allowed `request_class` |
| --- | --- | --- |
| `chief-architect-integration` | `00 — North Star & Portfolio` | `portfolio_decision`, `next_mission_selection`, `integration_review`, `final_ceo_brief` |
| `chief-architect-operating-model` | `01 — Operating Model & Mission Templates` | `operating_model_change`, `mission_template_change`, `governance_policy_change`, `process_retrospective`, `CEO_overhead_review` |
| `chief-architect-architecture-exceptions` | `02 — Architecture Exceptions` | `architecture_exception`, `privacy_boundary_exception`, `identity_ambiguity_exception`, `irreversible_effect_exception`, `repeated_same_cause_exception`, `cross_lane_conflict` |
| `chief-architect-mission-contract-YYYY-MM-DD-<slug>` | `Mission — <outcome> — YYYY-MM-DD` | `mission_contract`, `mission_artifact_review`, `mission_exception_within_envelope`, `mission_closeout` |

The mission target id date and chat-label date must match. Every non-00 target
must have its own owner-only registry entry and route receipt, and its project
fingerprint must equal the canonical 00 anchor. A mission packet may target
only its exact mission chat.

## Relay binding

An explicit packet provides all three flags:

```text
--request-class <closed value>
--request-target-id <registered exact target id>
--request-target-chat-label <exact role label>
```

The `--consultant-id`, request target id, registered target id, and visible
chat must describe the same target. Validation happens during static/dynamic
route preflight and before lock creation. Unknown class, unknown target,
missing metadata, wrong role, wrong label, cross-mission substitution, route
drift, stale observation, or missing owner-only receipt is HOLD before Send.

## Compatibility

To avoid breaking already approved integrations:

- a legacy packet to `chief-architect-integration` without a request class is
  narrowly treated as `integration_review`;
- a legacy packet to an already registered mission target without a request
  class is narrowly treated as `mission_contract`.

New 01 and 02 packets have no default. Any explicit packet uses the full
three-field binding. These defaults are compatibility shims, not universal
routing and not new authority.

## Registration and cutover boundary

This contract reuses the current private target registry, canonical project
gate, route receipts, Consultant Relay Lock, transport, Copy-response capture,
packet validation, and sentinel validation. It creates no router service,
registry, lock, backend, transport, source family, capability family, or
authority.

Repository integration does not configure ChatGPT or write private registry
state. A later separately approved UI cutover may register the 01 and 02
targets and a fresh mission target through the existing owner-only
registration command, then run synthetic routing checks. Until that cutover is
green, those targets remain unavailable and fail closed.

## Invariants

- strict secret mode remains mandatory;
- raw target URLs, private chat text, clipboard contents, registry contents,
  and route receipts never enter tracked files or command output;
- the relay packet carries no source or live authority;
- routing success does not authorize implementation, integration, Send, or
  any other effect;
- diagnosis review precedes artifact review when the Problem Reality Gate
  applies;
- 00 remains compatible for integration but is never a catch-all.

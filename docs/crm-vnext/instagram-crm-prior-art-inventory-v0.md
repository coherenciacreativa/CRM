# Instagram CRM Prior-Art Inventory v0

Status: no-run, no-secret, repo-local evidence inventory

## Scope

This inventory reviews tracked local CRM Core repo docs only. It does not use
APIs, network calls, UI, Computer Use, `@Chrome`, Instagram, Meta Business Suite,
MailerLite, Gmail, private artifacts, dashboards, browser profiles, source
systems, scripts, tests, or external services.

No `/Users/alejandrogomez/CRM` worktree was entered, inspected, edited, or used.
No CRM/source state was written, no candidate queue was generated, no DMs were
opened, no welcome audio was generated or sent, and no Launch OS docs were
edited.

## Evidence Table

| Local artifact | Relevant topic | Short summary | Local references | Affects |
| --- | --- | --- | --- | --- |
| `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md` | Meta/Instagram API source-health | Prior official-docs spike found no official follower event/list/delta route in consulted docs, but did note follower counts/account metrics are separate from candidate-producing identities/deltas. | `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md:44-48`, `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md:100-108` | Instagram API readiness; follower-source fallback; candidate queues |
| `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md` | Messaging, replies, webhooks, audio/file feasibility | Messaging/conversations and `messages` webhook subscriptions appear relevant for eligible professional accounts; audio/file send is described as possible but needs setup proof, review, dedupe, and send approval. | `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md:49-56`, `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md:102-107`, `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md:117-123` | DMs/replies; welcome audio; API readiness |
| `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md` | Secrets and setup safety | The spike names later secret classes and requires no-secret setup-readiness inventory before API calls, app setup changes, webhook setup, token handling, or source mutation. | `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md:85-94` | API readiness; CRM/source-write gates |
| `docs/crm-vnext/instagram-meta-api-setup-readiness-inventory-v0.md` | No-secret inventory model | Setup inventory design asks only yes/no/unknown or redacted facts; tokens, app secrets, authorization codes, cookies, headers, env values, credentials, raw payloads, dashboard screenshots, and private DMs remain closed. | `docs/crm-vnext/instagram-meta-api-setup-readiness-inventory-v0.md:36-44`, `docs/crm-vnext/instagram-meta-api-setup-readiness-inventory-v0.md:56-89` | API readiness; source-of-truth constraints |
| `docs/crm-vnext/crm-core-next-action.md` | Collected no-secret setup facts | Prior collected setup facts confirm professional account, Page connection, messaging enabled, and same intended account; app existence, products, permissions, webhook readiness, App Review, Advanced Access, controlled-business status, and blockers remain unknown or incomplete. | `docs/crm-vnext/crm-core-next-action.md:2583-2608` | API readiness; source-truth constraints |
| `docs/crm-vnext/instagram-new-follower-source-coverage-options-v0.md` | Notifications route and fallback | Detection-only pilot reached notifications but captured zero visible follower groups and zero private follower anchors; no queue or welcome audio step was justified. | `docs/crm-vnext/instagram-new-follower-source-coverage-options-v0.md:16-34` | Follower-source fallback; candidate queues; welcome audio |
| `docs/crm-vnext/instagram-new-follower-source-coverage-options-v0.md` | Follower-source fallback options | Candidate-producing evidence can come from a bounded follower-source route, approved manual evidence packet, or later API/webhook investigation; future execution requires exact approval and private anchors remain private. | `docs/crm-vnext/instagram-new-follower-source-coverage-options-v0.md:60-90`, `docs/crm-vnext/instagram-new-follower-source-coverage-options-v0.md:92-125` | Follower-source fallback; API readiness |
| `docs/crm-vnext/instagram-bounded-follower-source-route-design-v0.md` | Bounded follower-source route | Bounded route design exists for future private follower anchors when notifications and official API/docs do not provide candidate-producing evidence. It explicitly forbids execution, profile opening, DMs, welcome audio, candidate queue generation, CRM writes, scoring, or outreach. | `docs/crm-vnext/instagram-bounded-follower-source-route-design-v0.md:6-16`, `docs/crm-vnext/instagram-bounded-follower-source-route-design-v0.md:18-28`, `docs/crm-vnext/instagram-bounded-follower-source-route-design-v0.md:69-90` | Follower-source fallback; candidate queues |
| `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md` | Target welcome system architecture | Architecture defines source, private evidence, decision, and action layers. APIs/webhooks are preferred where safe; UI is fallback; queues are not CRM state, scoring, or action permission. | `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md:27-44`, `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md:68-93` | MailerLite parallel path; candidate queues; CRM/source-write gates |
| `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md` | State and action gates | No state transition may skip dedupe; no send without already-welcomed check; no MailerLite onboarding without email evidence; no CRM write without explicit approval. | `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md:117-124`, `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md:195-213`, `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md:223-233` | Candidate queues; DMs/replies; welcome audio; CRM/source-write gates |
| `docs/crm-vnext/instagram-new-follower-welcome-audio-lane-design-v0.md` | Welcome audio lane gates | The welcome lane is no-run; follower identity capture, DMs/audio send, candidate queue generation, and send approval are separate boundaries. Candidate queue is not CRM state, scoring, or send permission. | `docs/crm-vnext/instagram-new-follower-welcome-audio-lane-design-v0.md:6-13`, `docs/crm-vnext/instagram-new-follower-welcome-audio-lane-design-v0.md:25-30`, `docs/crm-vnext/instagram-new-follower-welcome-audio-lane-design-v0.md:124-175` | Welcome audio; candidate queues; DMs |
| `docs/crm-vnext/mailerlite-onboarding-api-no-write-design-v0.md` | MailerLite parallel path | MailerLite onboarding design is no-run, requires approved email handoff evidence, preserves idempotency, and requires exact approval before any MailerLite mutation. Instagram detection and welcome audio do not trigger MailerLite onboarding. | `docs/crm-vnext/mailerlite-onboarding-api-no-write-design-v0.md:6-23`, `docs/crm-vnext/mailerlite-onboarding-api-no-write-design-v0.md:25-53`, `docs/crm-vnext/mailerlite-onboarding-api-no-write-design-v0.md:329-356` | MailerLite parallel path; CRM/source-write gates |
| `docs/crm-vnext/crm-core-parallel-development-protocol-v0.md` | Integration boundary | Parallel lane protocol forbids lane-independent API calls, UI/Computer Use, Instagram actions, MailerLite mutations, Gmail access, DMs, welcome audio, candidate queue generation, CRM writes, scoring, ledgers/cards/Fact Store, Launch OS touch, or `/Users/alejandrogomez/CRM`. | `docs/crm-vnext/crm-core-parallel-development-protocol-v0.md:13-17`, `docs/crm-vnext/crm-core-parallel-development-protocol-v0.md:174-189` | Source-of-truth constraints; CRM/source-write gates |
| `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md` | Current lane decision packet | Current packet now distinguishes unsupported/not-found CRM-usable new-follower sources from possible aggregate analytics/insights, and keeps messaging/replies/webhooks/audio/file send setup-dependent and unapproved. | `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md:29-42`, `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md:99-117`, `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md:216-229` | API readiness; follower-source fallback; DMs/replies; welcome audio |

## Reusable Prior Work

- The Instagram API readiness lane can reuse the source-health spike as the
  main capability map, but should preserve the updated distinction between
  candidate-producing follower identity sources and aggregate counts/insights.
- The setup-readiness inventory and collected facts provide the no-secret
  setup baseline: professional account and Page connection are known, while app,
  products, permissions, App Review, Advanced Access, and webhook readiness are
  unknown or incomplete.
- The follower-source coverage and bounded route designs provide fallback
  routes for candidate-producing follower anchors when API/webhook evidence does
  not support them.
- The Instagram-to-MailerLite architecture gives the operating model for private
  anchors, dedupe, welcome history, candidate queues, send approval, reply
  monitoring, MailerLite onboarding, and CRM write packets.
- The MailerLite onboarding design can proceed in parallel only as a no-run,
  no-write design lane until approved private email-handoff evidence exists.

## Conflicts Or Contradictions

| Item | Classification | Notes |
| --- | --- | --- |
| Older docs state broad shorthand such as "no official new-follower or follower-delta support" or "official docs did not show follower deltas." | stale/unclear | These should be read through the tighter source-truth distinction: reviewed docs did not show a new-follower webhook, per-follower identity stream, or CRM-usable follower-delta candidate source. Aggregate analytics/insights, if available, are not candidate-generation support unless separately verified and approved. |
| Source-health spike says profile/account insights exist but are not person-level follower candidates. | confirmed local prior-art | This supports the setup decision packet's distinction between aggregate/account metrics and candidate-producing identity streams. |
| Messaging/replies/webhooks and audio/file send are described as supported/plausible in official-docs research. | confirmed local prior-art | This does not mean ready or approved. Setup, permissions, App Review/Advanced Access, verification, source-health checks, dedupe, and explicit action approvals remain required. |
| Business Verification, Advanced Access, App Review, permissions, product configuration, Meta app status, and webhook readiness are incomplete or unknown. | confirmed local prior-art | No API healthcheck should run until Alejandro approves a future no-secret plan/live boundary and secret handling stays closed. |
| Whether to prioritize Meta setup review, MailerLite setup, or manual follower evidence. | needs CEO/Alejandro decision | Current decision packet recommends setup decision packet review by default; this inventory adds enough context that Alejandro may want to review prior art first. |
| Repairing follower-source UI route. | out of lane scope | Follower-source UI repair is parked and not part of the Instagram API readiness lane unless separately approved. |

## Source-Truth Implications

- Unsupported/not found in reviewed docs:
  - new-follower webhook;
  - per-follower identity stream;
  - CRM-usable follower-delta candidate source.
- Plausible/setup-dependent:
  - messaging;
  - replies;
  - webhooks;
  - audio/file attachment send.
- Unknown/incomplete:
  - app setup;
  - product configuration;
  - permissions;
  - App Review;
  - Advanced Access;
  - Business Verification;
  - webhook readiness.
- Forbidden/not authorized:
  - API calls;
  - UI, Computer Use, or `@Chrome`;
  - secrets, tokens, webhook secrets, cookies, headers, env values, credentials,
    authorization codes, or access tokens;
  - DMs;
  - welcome audio;
  - candidate queues;
  - CRM/source writes;
  - webhook setup or app configuration;
  - source-system writes;
  - Launch OS docs;
  - `/Users/alejandrogomez/CRM`.

## Recommended Next Lane Step

Recommended next lane step:

```text
crm_core_instagram_prior_art_inventory_review_awaiting_approval_v0
```

Rationale:

This inventory adds meaningful prior-art context and identifies stale/unclear
follower-delta shorthand that Alejandro should review before choosing between
Meta setup decision review, no-secret API healthcheck planning, manual follower
evidence design, or MailerLite parallel continuation.

The prior default remains available after review:

```text
crm_core_instagram_meta_app_setup_decision_packet_review_awaiting_approval_v0
```

## Closed Gates

- no API calls;
- no network calls;
- no UI, Computer Use, or `@Chrome`;
- no Meta Business Suite;
- no Instagram;
- no MailerLite or Gmail;
- no private artifact/dashboard/browser/profile/session inspection;
- no webhook setup;
- no app configuration;
- no DMs;
- no welcome audio;
- no candidate queue generation;
- no CRM/source writes;
- no source-system writes;
- no Launch OS docs;
- no `/Users/alejandrogomez/CRM`.

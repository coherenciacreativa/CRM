# Instagram Meta API Prior-Art Review Packet v0

Date: 2026-07-03
Status: no-run, no-secret CEO/architect review packet

## Purpose

Turn the repo-local Instagram CRM prior-art inventory into a concise decision
surface for Alejandro and CRM Core architecture review.

This packet helps decide the next safe Instagram API readiness action without
running APIs, opening Meta Business Suite, opening Instagram, inspecting private
artifacts, creating candidate queues, or writing CRM/source state.

## Relationship To Existing Instagram API Readiness Artifacts

This packet summarizes and routes from:

- `docs/crm-vnext/instagram-crm-prior-art-inventory-v0.md`
- `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md`
- `docs/crm-vnext/instagram-meta-api-source-health-spike-v0.md`
- `docs/crm-vnext/instagram-meta-api-setup-readiness-inventory-v0.md`
- `docs/crm-vnext/instagram-to-mailerlite-welcome-system-architecture-v0.md`

It is not a replacement for those artifacts. It is a review layer that makes
the safe next decision easier.

## Current Known Facts

- The docs reviewed for this lane did not show a new-follower webhook,
  per-follower identity stream, or CRM-usable follower-delta candidate source.
- Aggregate analytics or insights, if available, must not be treated as
  new-follower webhook support, follower identity access, or candidate
  generation unless separately verified and approved.
- Messaging, replies, webhooks, comments, mentions, and audio/file attachment
  send appear plausible or setup-dependent for eligible professional Instagram
  accounts, but none are approved or ready.
- Business Verification was reported incomplete in prior no-secret setup facts.
- Advanced Access was reported not enabled in prior no-secret setup facts.
- Meta app existence, product configuration, permissions, App Review, webhook
  endpoint readiness, and business control remain unknown or incomplete.
- Notifications-surface detection previously reached source health but returned
  zero visible new-follower groups and zero private follower anchors.
- Candidate queue generation remains unapproved and unjustified until private
  follower anchors or approved candidate evidence exist.
- Welcome audio send remains separately unapproved.
- MailerLite onboarding can continue in parallel only as a no-run or explicitly
  no-write design lane until approved email handoff evidence exists.

## Unknowns And Blockers

- Whether a Meta app already exists for the intended business.
- Whether the app has Instagram, Webhooks, or messaging products configured.
- Whether permissions are not requested, development-only, standard, advanced,
  approved, denied, or unknown.
- Whether App Review can be completed for required Instagram permissions.
- Whether Business Verification or business control can be completed.
- Whether webhook endpoint readiness exists without exposing secrets.
- Whether future API/webhook payloads can supply CRM-usable private anchors for
  DMs, replies, comments, mentions, or onboarding evidence.
- Whether any future follower-related aggregate metric can help source health
  without being misread as candidate-producing follower identity evidence.

## Stale Or Ambiguous Assumptions To Retire

- Avoid broad shorthand such as "no follower-delta support" without context.
- Use the narrower distinction: reviewed docs did not show a new-follower
  webhook, per-follower identity stream, or CRM-usable follower-delta candidate
  source.
- Treat aggregate follower counts or insights as source-health or analytics
  evidence only, not as candidate-generation support.
- Do not treat messaging or audio/file feasibility as approval for DMs, welcome
  audio, live sends, or action automation.

## Reusable Components

- The setup-readiness inventory model: yes/no/unknown facts and redacted labels
  only.
- The setup decision packet: decision matrix for Meta app readiness, no-secret
  healthcheck planning, follower-source fallback, and MailerLite parallel work.
- The welcome system architecture: private anchors, dedupe, welcome history,
  send approval, reply monitoring, MailerLite onboarding, and CRM write packets.
- The prior-art inventory: local evidence map and source-truth correction for
  follower-delta language.

## Decision Rules

If Alejandro wants durable API/webhook capability:

- review the Meta app setup decision packet first;
- resolve no-secret setup facts before any healthcheck;
- do not call APIs until a later exact approval boundary.

If setup facts become plausible enough for a future behavior/status check:

- design a no-secret API healthcheck plan;
- define secret handling, redacted receipts, stop conditions, and no-print
  payload rules before live calls.

If CRM Core needs new-follower candidate evidence soon:

- do not depend on the current Meta/Instagram API lane for follower identity
  capture;
- use approved manual evidence or bounded follower-source fallback only under a
  separate boundary.

If CEO speed matters more than Meta setup completion:

- continue MailerLite onboarding readiness in parallel as no-run or no-write
  design;
- keep Instagram API/source execution closed.

No queue may be generated from detection-only or source-health-only evidence.

## Redacted Receipt Behavior

Future review receipts may include:

- reviewed artifact names;
- selected decision route;
- known setup facts by yes/no/unknown status;
- blocker counts or blocker classes;
- closed gates;
- recommended next safe step.

Receipts must not include:

- raw target URLs;
- app IDs if considered sensitive;
- app secrets;
- access tokens;
- webhook secrets;
- cookies;
- headers;
- env values;
- credentials;
- authorization codes;
- raw webhook payloads;
- dashboard screenshots;
- private account content;
- DMs;
- handles;
- emails;
- names;
- private anchors.

## Future Approval Phrases

Setup decision review:

```text
I approve CRM Core to review the Meta/Instagram setup decision packet using non-secret setup facts only. Do not call APIs, open Meta Business Suite, request or record secrets, configure apps, create webhooks, inspect private artifacts, or write CRM/source state.
```

No-secret API healthcheck plan:

```text
I approve CRM Core to design a no-secret Meta/Instagram API healthcheck plan only. Do not run live API calls, request or record secrets, configure apps, create webhooks, inspect private payloads, or write CRM/source state.
```

Future live API source-health check:

```text
I approve one CRM Core Meta/Instagram live API source-health check using approved secret handling and redacted receipts only. Do not print tokens, headers, cookies, env values, credentials, authorization codes, access tokens, webhook secrets, raw payloads, private content, or mutate Instagram, MailerLite, Gmail, CRM, or source state.
```

## Stop Conditions

Stop if any next step would require:

- API calls without exact live approval;
- Meta Business Suite access;
- Instagram UI or source browsing;
- app configuration;
- webhook setup;
- token or secret handling;
- raw payload inspection;
- private artifact inspection;
- DMs;
- welcome audio;
- candidate queue generation;
- MailerLite or Gmail access;
- CRM/source writes;
- Launch OS work;
- `/Users/alejandrogomez/CRM`.

## Closed Gates

- no API calls;
- no UI, Computer Use, or `@Chrome`;
- no Instagram;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no token handling;
- no secrets;
- no DMs;
- no welcome audio;
- no candidate queue generation;
- no MailerLite;
- no Gmail;
- no private artifact inspection;
- no CRM/source writes;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

Integrate
`docs/crm-vnext/instagram-meta-api-prior-art-review-packet-v0.md` as a
lane-owned, no-run Instagram API readiness review artifact. The packet converts
the local prior-art inventory into a CEO/architect decision surface, tightens
follower-delta language, preserves the distinction between aggregate
analytics/insights and CRM-usable candidate sources, and recommends setup
decision review as the default next API readiness action. No API calls, UI,
Meta Business Suite access, app configuration, webhook setup, secrets, DMs,
welcome audio, candidate queue generation, CRM/source writes, central
coordination edits, Launch OS work, or `/Users/alejandrogomez/CRM` use are
authorized.

## Next Safe Step

Default next lane step:

```text
crm_core_instagram_meta_app_setup_decision_packet_review_awaiting_approval_v0
```

Parallel CEO-speed option:

```text
crm_core_mailerlite_onboarding_setup_inventory_awaiting_approval_v0
```

Only use the parallel option as a separate lane decision. It is not an Instagram
API execution step.

## Completion Boundary

Complete when CRM Core has a no-run review packet that identifies reusable
prior art, stale assumptions, known setup facts, unknowns, decision rules,
closed gates, and the recommended next safe Instagram API readiness action
without authorizing any live source action.

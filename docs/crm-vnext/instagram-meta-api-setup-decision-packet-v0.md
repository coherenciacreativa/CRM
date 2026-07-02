# Instagram Meta API Setup Decision Packet v0

Date: 2026-06-29
Status: no-run, no-secret decision packet design

## Purpose

Define the decision packet CRM Core needs after the Meta/Instagram
setup-readiness inventory showed the API path is partial or unknown.

This packet should help Alejandro decide whether to pursue:

- Meta app setup;
- Business Verification;
- App Review / Advanced Access;
- no-secret API healthcheck plan;
- bounded follower-source UI/manual fallback;
- MailerLite lane in parallel.

This design does not authorize API calls, UI access, Meta Business Suite access,
app configuration, webhook setup, token handling, DMs, welcome audio, candidate
queue generation, MailerLite/Gmail access, CRM/source writes, source mutation,
Launch OS work, or use of `/Users/alejandrogomez/CRM`.

## Baseline Facts

From prior CRM Core docs only:

- Official docs reviewed for this lane did not show a new-follower webhook,
  per-new-follower identity stream, or CRM-usable follower-delta source for
  candidate generation.
- Aggregate analytics/insights, if available, must not be treated as
  new-follower webhook support, follower identity access, or a
  candidate-generation source unless separately verified and approved.
- Messaging, replies, and webhooks look plausible and setup-dependent for
  eligible professional Instagram accounts; they are not approved or ready.
- Audio or file attachment send is only a setup-dependent feasibility question;
  it is not authorization for welcome audio or live DM execution.
- Business Verification is not complete based on the prior no-secret inventory.
- Advanced Access is not enabled based on the prior no-secret inventory.
- Meta app, permissions, App Review, product configuration, and webhook
  readiness remain unknown.
- No API calls have been approved.
- Notifications route is healthy but produced zero new-follower candidate
  evidence in the prior detection pilot.
- Bounded follower-source UI/manual evidence remains a fallback because the
  docs reviewed did not show a CRM-usable new-follower identity or follower
  candidate-generation source.

## Decision Options

### Option A — Meta App / Setup Readiness

Purpose:

- prepare Meta app, business, and permissions for future messaging/reply/webhook
  source-health.

No execution is authorized in this design.

Non-secret setup categories:

- professional Instagram account subtype confirmation;
- Facebook Page connection;
- Meta Business portfolio;
- Meta app existence;
- product configuration;
- Webhooks product;
- messaging product;
- callback environment readiness;
- Business Verification;
- App Review / Advanced Access.

Useful when Alejandro wants a durable API/webhook path and is willing to resolve
setup, verification, and permission prerequisites before any live healthcheck.

### Option B — No-Secret API Healthcheck Plan

Purpose:

- design a future healthcheck that validates configuration readiness without
  exposing secrets or private payloads.

Clarifications:

- no live API calls are authorized in this task;
- future healthcheck requires exact approval;
- no tokens, app secrets, webhook secrets, cookies, headers, env values,
  credentials, authorization codes, access tokens, raw payloads, or private
  content may be printed in chat, written to the repo, or written to standard
  receipts.

Useful when the setup facts become plausible enough to plan behavior/status
checks while preserving strict secret boundaries.

### Option C — Follower-Source Fallback

Purpose:

- keep bounded follower-source/manual evidence as fallback because official docs
  reviewed for this lane did not show a new-follower webhook,
  per-new-follower identity stream, or CRM-usable follower-delta source for
  candidate generation.

Clarifications:

- follower-source UI is parked/unstable for v0 unless separately repaired;
- aggregate analytics/insights, if available, must not be treated as
  new-follower webhook support, follower identity access, or a candidate source
  without separate verification and approval;
- manual evidence packet remains acceptable;
- notifications repeat later remains a low-risk health/signal check;
- no follower profile opening, full-list traversal, DMs, welcome audio, or
  candidate queue generation is authorized by this packet.

Useful when CRM Core needs candidate-producing follower evidence before an
approved Meta API evidence packet proves a CRM-usable candidate source.

### Option D — Defer Meta Setup And Prioritize MailerLite

Purpose:

- move downstream onboarding readiness while Meta setup remains unresolved.

This option keeps Instagram source work no-run and allows the MailerLite lane to
prepare no-secret setup inventory, field/group mapping, idempotency, and future
no-write onboarding design in parallel.

Useful when the CEO wants operating-system progress now without waiting for Meta
app review, permissions, webhook setup, or follower-source route repair.

## Decision Matrix

| Option | Speed | Reliability | Setup burden | Risk | Recommended when |
| --- | --- | --- | --- | --- | --- |
| A — Meta app/setup readiness | Medium | High if completed | High | Medium | Alejandro wants durable API/webhook capability and can resolve verification, app, product, and permission prerequisites. |
| B — No-secret API healthcheck plan | Medium | Medium-high after setup facts improve | Medium | Low-medium | Setup looks plausible enough to plan a no-secret behavior/status healthcheck, but live calls are not yet approved. |
| C — Follower-source fallback | Fast for manual, slower for UI repair | Medium-low until route is proven | Low-medium | Medium | Candidate-producing follower evidence is needed before an approved API evidence packet proves a CRM-usable candidate source. |
| D — Defer Meta setup and prioritize MailerLite | Fast | High for onboarding design, not source detection | Low | Low | CEO wants speed now and accepts that Instagram API/source setup remains unresolved. |

## Recommended Next Step

Default recommendation:

```text
crm_core_instagram_meta_app_setup_decision_packet_review_awaiting_approval_v0
```

If CEO wants speed now:

- continue MailerLite setup in parallel;
- review this Meta app/setup decision packet, not live API calls;
- do not rely on follower-source UI until the parked route is separately
  repaired or an approved manual evidence packet exists.

Potential route outcomes after review:

- `crm_core_instagram_meta_api_no_secret_healthcheck_plan_v0`
- `crm_core_instagram_manual_follower_evidence_packet_design_v0`
- `crm_core_mailerlite_onboarding_setup_inventory_awaiting_approval_v0`

## Approval Boundaries

These phrases define future boundaries only. They do not authorize any live
action now.

### No-Secret Setup Decision Review

Exact future approval phrase:

```text
I approve CRM Core to review the Meta/Instagram setup decision packet using non-secret setup facts only. Do not call APIs, open Meta Business Suite, request or record secrets, configure apps, create webhooks, inspect private artifacts, or write CRM/source state.
```

Scope:

- review setup categories and decision options;
- use yes/no/unknown setup facts and redacted labels only;
- no APIs;
- no Meta Business Suite;
- no secrets.

### No-Secret API Healthcheck Plan

Exact future approval phrase:

```text
I approve CRM Core to design a no-secret Meta/Instagram API healthcheck plan only. Do not run live API calls, request or record secrets, configure apps, create webhooks, inspect private payloads, or write CRM/source state.
```

Scope:

- plan expected healthcheck steps and redacted receipt fields;
- define behavior/status checks;
- no live calls yet;
- no tokens/secrets in chat, repo, or receipts.

### Future Live API Healthcheck

Exact future approval phrase:

```text
I approve one CRM Core Meta/Instagram live API source-health check using approved secret handling and redacted receipts only. Do not print tokens, headers, cookies, env values, credentials, authorization codes, access tokens, webhook secrets, raw payloads, private content, or mutate Instagram, MailerLite, Gmail, CRM, or source state.
```

Scope:

- requires exact approval at the time of execution;
- requires explicit no-secret handling;
- requires redacted receipts;
- must stop on auth ambiguity, secret exposure risk, raw payload risk, or any
  mutation risk.

This packet does not authorize the live healthcheck.

## Closed Gates

- no API calls;
- no Meta Business Suite;
- no Instagram UI;
- no app configuration;
- no webhook setup;
- no tokens/secrets;
- no DMs;
- no welcome audio;
- no candidate queue;
- no CRM/source writes;
- no MailerLite/Gmail;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

Complete when CRM Core has a no-run, no-secret decision packet that separates
Meta app/setup readiness, no-secret healthcheck planning, follower-source/manual
fallback, and MailerLite parallel progress without authorizing live source
actions.

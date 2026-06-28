# Instagram Meta API Setup Readiness Inventory v0

Date: 2026-06-28
Status: no-run, no-secret inventory design

## Purpose

Define the non-secret facts CRM Core needs before any Meta/Instagram API or
webhook healthcheck for the Instagram-to-MailerLite welcome system.

This inventory helps decide whether to pursue:

- API/webhook source-health checks for DMs/replies/messages;
- API/webhook send capability;
- webhook setup planning;
- bounded follower-source UI route fallback;
- MailerLite onboarding design.

It does not authorize API calls, UI access, token handling, app configuration,
webhook setup, DMs, welcome audio, candidate queue generation, or CRM/source
writes.

## Findings From Prior Spike

- No official new-follower or follower-delta support was found in the official
  Meta developer docs consulted.
- Messaging and webhooks appear plausible for eligible Instagram professional
  accounts with required setup and permissions.
- Audio/attachment sending may be available through messaging routes, but the
  welcome-audio workflow still needs setup verification.
- App Review, Advanced Access, and Business Verification may be required for
  production capabilities.
- Secrets, tokens, webhook secrets, headers, raw webhook payloads, dashboard
  screenshots, and private content remain strictly closed.

## No-Secret Inventory Questions

Alejandro can answer this checklist manually with non-secret facts only. Use
`yes`, `no`, `unknown`, or a redacted label where requested.

Do not provide tokens, app secrets, client secrets, webhook secrets, access
tokens, authorization codes, cookies, headers, env values, credentials, raw
dashboard screenshots, raw webhook payloads, private DMs, or app IDs if they are
considered sensitive.

### Instagram account facts

- Is the Instagram account a professional account?
- Is it Business or Creator?
- Is it connected to a Facebook Page?
- Is it connected to a Meta Business portfolio/account?
- Is the intended account the same account CRM Core has used in browser routes?
- Is messaging currently enabled for the account?
- Are DMs/replies visible in Instagram app/web normally?

### Meta app facts

- Does a Meta app already exist for this business?
- If yes, record a redacted app label only, not an app ID or secret.
- Is the app in Development or Live mode?
- Is the Instagram product added?
- Is Webhooks product added?
- Is Messenger/Instagram messaging product added, if relevant?
- Is a webhook callback endpoint already owned by Alejandro/Mantis?
- Is there an approved environment for webhook testing without exposing secrets?

### Permissions / access facts

Record status only for each permission. Do not provide tokens, app IDs, secrets,
headers, screenshots, or private dashboard content.

Allowed status values:

- `not_requested`
- `development_only`
- `standard_access`
- `advanced_access`
- `approved`
- `denied`
- `unknown`

Permissions to check:

- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`
- `pages_show_list`
- any other messaging/webhook permission identified by official docs, as a
  redacted permission label only.

### Review / verification facts

- Is Business Verification complete?
- Is App Review complete for any Instagram permissions?
- Is Advanced Access enabled for required permissions?
- Is the account/app under a business that Alejandro controls?
- Are there known policy or compliance blockers?

### Capability priority

Rank these capabilities using non-secret labels only:

1. DM/reply monitoring.
2. Welcome audio send.
3. Text welcome send.
4. Comment/mention monitoring.
5. New follower detection.
6. MailerLite onboarding.

### Operational preference

- Prefer API/webhook route where possible?
- Keep UI as fallback only?
- Is a manual evidence fallback acceptable for new-follower detection until API
  support exists?
- Should follower-source UI route be designed in parallel because official docs
  did not show follower deltas?

## Inventory Output Model

A future redacted inventory receipt may include only non-secret setup facts and
redacted labels supplied by Alejandro.

Fields:

- `inventoryStatus`
- `answeredBy`
- `answeredAt`
- `instagramAccountType`
- `facebookPageConnectionStatus`
- `metaBusinessPortfolioStatus`
- `metaAppExists`
- `metaAppMode`
- `productsConfigured`
- `webhookEndpointReadiness`
- `permissionStatusSummary`
- `businessVerificationStatus`
- `appReviewStatusSummary`
- `capabilityPriority`
- `apiPathReadiness`
- `boundedFollowerSourceFallbackNeeded`
- `blockers`
- `recommendedNextStep`

Receipts must not include:

- app IDs;
- app secrets;
- tokens;
- webhook secrets;
- callback secrets;
- cookies;
- headers;
- env values;
- dashboard screenshots;
- raw webhook payloads;
- private DMs;
- account handles unless explicitly approved.

## Decision Rules

If account is not professional:

- API messaging/webhook path is likely blocked;
- recommend account setup decision or UI/manual fallback design.

If no Meta app exists:

- recommend Meta app setup planning, not API calls.

If app exists but permissions are development-only:

- recommend App Review/Advanced Access readiness, not production healthcheck.

If messaging permissions are ready:

- recommend a future no-secret API/webhook healthcheck approval boundary.

If follower detection is still unsupported:

- recommend bounded follower-source UI/manual route design for
  candidate-producing follower anchors.

If MailerLite onboarding is high priority:

- recommend `crm_core_mailerlite_onboarding_api_no_write_design_v0` as a
  parallel next design.

## Recommended Next Actions

The inventory should route to one of:

1. `crm_core_instagram_meta_api_no_secret_healthcheck_plan_v0`
   - If setup looks plausible and only a no-call healthcheck plan is needed.
2. `crm_core_instagram_bounded_follower_source_route_design_v0`
   - If follower detection remains unsupported by API but candidate evidence is
     needed.
3. `crm_core_mailerlite_onboarding_api_no_write_design_v0`
   - If MailerLite onboarding should move in parallel.
4. `crm_core_instagram_meta_app_setup_decision_packet_v0`
   - If app/account setup is missing and Alejandro needs a setup decision.

## Closed Gates

- no API calls;
- no tokens/secrets;
- no app IDs if sensitive;
- no app configuration;
- no webhook setup;
- no UI;
- no DMs;
- no welcome audio;
- no candidate queue;
- no MailerLite mutation;
- no CRM/source writes;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

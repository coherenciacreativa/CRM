# Instagram Meta API Source Health Spike v0

Date: 2026-06-28
Status: no-run official-docs research spike

## Purpose

Determine whether official Meta/Instagram APIs/webhooks can support the
Instagram-to-MailerLite welcome system better than UI routes.

This is research/design only. It does not authorize API calls, app setup, token
use, webhook setup, messaging, DMs, follower reads, source mutation, CRM writes,
MailerLite mutation, scoring, or outreach.

## Official Docs Consulted

- Instagram Platform Overview:
  `https://developers.facebook.com/docs/instagram-platform/overview/`
- Instagram API with Instagram Login - Get Started:
  `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started/`
- Instagram API with Instagram Login - Messaging API:
  `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api`
- Instagram API with Instagram Login - Conversations API:
  `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/conversations-api/`
- Instagram Platform Webhooks:
  `https://developers.facebook.com/docs/instagram-platform/webhooks/`
- Instagram Platform Webhook Notification Examples:
  `https://developers.facebook.com/docs/instagram-platform/webhooks/examples/`
- Graph API Webhooks Reference - Instagram:
  `https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram/`
- Permissions Reference:
  `https://developers.facebook.com/docs/permissions/`
- Instagram Platform App Review:
  `https://developers.facebook.com/docs/instagram-platform/app-review/`
- Business Verification:
  `https://developers.facebook.com/docs/development/release/business-verification/`
- IG User Reference:
  `https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/`
- Business Discovery:
  `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery`

## Questions To Answer

1. Can official APIs expose new follower events or follower-list deltas for the
   relevant Instagram account type?
   - Finding: no official follower event, follower list, or follower delta route
     was found in the consulted docs. Official docs expose follower counts and
     account metrics, but not candidate-producing follower identities/deltas.
2. Can official APIs or webhooks expose Instagram DMs/replies/messages?
   - Finding: yes, the Instagram Messaging/Conversations APIs and `messages`
     webhook subscriptions appear to support message/reply receipt for eligible
     professional accounts.
3. Can official APIs send messages or audio/attachments to Instagram users?
   - Finding: text messaging is supported. Official docs also describe sending
     audio, video, or file messages through the Instagram messaging endpoint, but
     the welcome-audio asset workflow still needs setup verification.
4. What account type is required?
   - Finding: Instagram professional account, Business or Creator. The Facebook
     Login path may require the account to be connected to a Facebook Page.
5. What permissions are required?
   - Finding: message routes center on basic Instagram business access and
     message-management permissions. Comments/mentions require comment-related
     permissions and webhook fields.
6. Which capabilities require app review?
   - Finding: permissions/features used beyond app roles or development mode
     require App Review/Advanced Access according to Meta docs.
7. Which capabilities require business verification?
   - Finding: business verification may be required depending on Meta access,
     app, business, permission, or production configuration. This must be
     confirmed in a no-secret setup-readiness inventory.
8. What are the rate limits, conversation window limits, or platform
   restrictions relevant to welcome messages?
   - Finding: Instagram messaging uses a 24-hour response window. Human-agent
     style extensions may exist for human responses. Private replies and other
     endpoints have their own limits. This needs route-specific confirmation
     before any send design.
9. What webhook objects/topics are relevant?
   - Finding: `messages`, messaging-related events, `comments`, `mentions`, and
     possibly `story_insights` are relevant. Follower events were not found.
10. What data is unavailable through official APIs and still needs UI/manual
    fallback?
    - Finding: new-follower identities/deltas remain unavailable in the
      consulted official docs. Bounded follower-source UI/manual evidence remains
      a fallback if candidate-producing evidence is needed.
11. What secrets/tokens/webhook secrets would exist later and how must they be
    protected?
    - Finding: app IDs/secrets, access tokens, page tokens, Instagram user
      tokens, webhook verify tokens, webhook signing secrets, refresh tokens,
      request/response headers, and raw private webhook payloads must never be
      printed or stored in tracked docs or standard receipts.
12. What is the recommended next safe proof step without exposing secrets?
    - Finding: collect a redacted no-secret setup-readiness inventory before any
      API call, app setup change, webhook setup, token handling, or source
      mutation.

## Capability Matrix

| Capability | Official route? | Required account/setup | Required permissions | App review / verification | Current confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| New follower detection | No direct route found | Instagram professional account, if any future route exists | Unknown | Unknown | `not_supported_by_official_docs` | Follower count exists, but no follower event/list/delta route found. |
| Follower list / follower deltas | No direct route found | Instagram professional account, if any future route exists | Unknown | Unknown | `not_supported_by_official_docs` | UI/manual fallback remains relevant for candidate-producing evidence. |
| DM/reply receive | Yes | Instagram Business/Creator account; app setup; likely Page connection for Facebook Login path | Basic Instagram business access plus message-management permission | Likely App Review/Advanced Access for production use | `supported_by_official_docs` | Conversations/messages routes appear relevant. |
| DM send text | Yes | Same as messaging receive; recipient scoped ID from allowed conversation context | Message-management permission | Likely App Review/Advanced Access; conversation policy applies | `supported_by_official_docs` | Still requires CRM Core send approval and duplicate checks. |
| DM send audio/attachment | Yes, but route needs proof | Same as messaging send plus approved media asset handling | Message-management permission | Likely App Review/Advanced Access; conversation policy applies | `possibly_supported_needs_verification` | Official docs describe audio/video/file sends, but welcome-audio workflow needs no-secret setup proof. |
| Story reply receive | Possibly via messages/webhooks | Instagram professional messaging setup | Message-management permission; messages webhook | Likely App Review/Advanced Access | `possibly_supported_needs_verification` | Story replies may arrive as messages; exact payload coverage must be verified later without private payload output. |
| Comment/mention receive | Yes | Public/professional Instagram account and webhook subscription | Comment/mention-related permissions and webhook fields | Likely App Review/Advanced Access | `supported_by_official_docs` | Useful for comments/mentions, not new-follower detection. |
| Webhook event delivery | Yes | Meta app, webhook endpoint, subscribed fields | Depends on subscribed fields | App Review/Advanced Access for production permissions | `supported_by_official_docs` | Follower webhook field was not found. |
| Profile/account insights | Yes | Instagram professional account | Basic/insights permissions depending route | Likely App Review/Advanced Access outside app roles | `supported_by_official_docs` | Counts/insights are not person-level follower candidates. |

## Fit For CRM Core Welcome System

- detection-only: APIs can support source health for account/profile counts and
  webhooks, but official docs do not show candidate-producing new-follower
  identities/deltas.
- candidate queue generation: not supported from follower APIs alone unless
  private anchors come from another approved route.
- welcome send: messaging send appears plausible, including text and
  audio/attachments, but only after setup proof, dedupe, approved asset, exact
  send approval, and platform conversation-window checks.
- reply monitoring: messaging webhooks/conversations appear plausible for
  eligible accounts.
- email handoff: possible only after approved private DM/reply review; no raw
  private content may enter chat or standard receipts.
- MailerLite onboarding trigger: possible only after approved email evidence and
  a separate MailerLite no-write/design boundary.
- CRM write packet preparation: possible only after private anchors, provenance,
  suppression/safety checks, and explicit CRM write packet approval.

Even if an API route exists, CRM Core still requires:

- private anchors;
- dedupe;
- already-welcomed safeguards;
- exact audio asset approval;
- send approval;
- redacted receipts;
- idempotency;
- CRM write approval.

## UI Fallback Implications

Because official docs do not show reliable new-follower identity/delta delivery,
these UI/manual routes remain relevant but not authorized here:

- notifications-surface detection;
- bounded follower-source route;
- manual evidence packet;
- approved DM send route;
- reply monitoring by approved source.

Do not treat this fallback list as approval to execute any route.

## Secrets And Security Boundary

Future secrets that must never be printed:

- app ID/secret;
- access tokens;
- page tokens;
- Instagram user tokens;
- webhook verify token;
- webhook signing secret;
- refresh tokens;
- raw webhook payloads containing private content;
- request/response headers.

Storage and receipt rules:

- no secrets in repo;
- no secrets in chat;
- no secrets in Mantis-Reports;
- no raw private webhook payloads in standard receipts;
- only redacted source-health receipts.

## Recommended Next Safe Step

Recommended next step:

```text
crm_core_instagram_meta_api_setup_readiness_inventory_awaiting_approval_v0
```

Purpose:

- collect a redacted no-secret setup-readiness inventory for Meta/Instagram
  API/webhook use before any API call, app setup change, token handling, webhook
  setup, DM access, or source action.

The inventory should ask only for non-secret facts such as account type, whether
the account is Business or Creator, whether it is connected to a Facebook Page,
whether a Meta app exists, whether business verification is already completed,
and which capabilities Alejandro wants to prioritize.

Do not recommend live API calls until a separate approval boundary exists.

## Closed Gates

- no API calls;
- no tokens/secrets;
- no app configuration changes;
- no webhook setup;
- no UI;
- no DMs;
- no welcome audio;
- no Instagram actions;
- no candidate queue;
- no MailerLite mutation;
- no CRM/source writes;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

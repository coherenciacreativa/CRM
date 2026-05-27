# CRM vNext Instagram Signal OS v0

Date: 2026-05-27
Status: implemented architecture + read-only local prototype

## Purpose

Instagram is the primary live social pulse for CRM vNext. This document defines how Instagram observations should enter CRM without creating a second CRM, without mutating Instagram, and without confusing identity stitching with engagement scoring.

Target path:

```text
Instagram API / UI / ManyChat / proxy observation
  -> compact read-only packet
  -> crm:vnext:instagram-signal-events
  -> crm:vnext:signal-event-pipeline
  -> Engagement Preview
  -> Movement Queue / Decision Brief
```

This OS is a signal layer, not an outbound agent. A warm score means "review internally", never "send a DM".

## Board Decision

Use a hybrid Instagram strategy:

- API/webhooks for stable, auditable future capture.
- Safari/Computer Use UI for high-value read-only backfill and gaps that Meta does not expose cleanly.
- ManyChat/proxy/MailerLite traces as official-flow identity evidence when a person gave email/phone in the onboarding flow.

The main daily value is not watching every possible source. It is detecting real movement from the channel where the community is alive now.

## API vs UI Capability Map

| Signal | CRM value | API viability | UI viability | v0 route |
| --- | --- | --- | --- | --- |
| New inbound DM / reply | high relationship signal; often contains email, city, product interest | possible through Conversations API / webhooks with `instagram_business_manage_messages`; API can list conversations/messages, but recent-message/history limits apply | strong for exact-anchor search and compact thread readback | API future; UI backfill now |
| Story reply | high, because it is an inbound DM with context | possible as messaging/story-reply webhook shape; treat as DM signal | strong if visible in thread | normalize to `instagram_dm` with `instagram_surface:story_reply` |
| Message reaction | medium; lightweight relational signal | webhook payload exists for reactions | visible in thread sometimes | normalize to `instagram_dm` with `instagram_surface:message_reaction` |
| Comment on owned media | high, especially retreat/product comments | possible through comment webhooks and `GET /comments`; webhooks preferred to reduce rate pressure | visible manually, but less efficient | normalize to `instagram_comment` |
| Mention | medium/high if public and relevant | possible in some Instagram API surfaces, but product-specific and permission-dependent | visible manually | normalize as comment-like signal with `instagram_surface:mention` when identity anchor is strong |
| Like on owned media | low/medium; useful in aggregate or repeated pattern | direct per-person like lists are not treated as reliable v0 API surface; media insights expose aggregate metrics | visible but expensive and fragile | use sparingly; prefer repeated UI/API snapshot over one-off |
| Story view by person | medium if repeated; very relevant to Alejandro's community feel | not treated as stable public person-level API surface in v0; insights are aggregate | visible while story analytics are available; fragile/time-limited | UI/manual snapshot -> `instagram_story_view` |
| New follower | useful as onboarding trigger | not treated as stable documented webhook in v0; use existing official-flow traces | visible in UI; often followed by DM onboarding | source recovery/onboarding lane, not scoring alone |
| Media/account insights | useful for content strategy, not person-card heat unless tied to a person | API supports aggregate media/account insights with `instagram_business_manage_insights` | UI analytics can be read manually | store as aggregate event/snapshot; no direct person outreach |
| Email/phone/city inside DM | identity/card enrichment, not heat by itself | API possible for recent accessible messages; older history can be limited | highest-value exact-anchor backfill | `instagram-dm-ui-evidence`, then card approval |

Primary sources checked:

- [Meta/Postman Instagram Conversations API](https://www.postman.com/meta/instagram/folder/23987686-6a91368f-1fa8-4614-9ed6-7d1e08c21e62): conversations, message lists/details, permissions, and recent/history limits.
- [Meta/Postman Get message information](https://www.postman.com/meta/instagram/request/xduwnzm/get-information-about-a-message): message fields and the last-20-message detail limit.
- [Meta/Postman Get Comments](https://www.postman.com/meta/instagram/request/23987686-c91bedd7-ac95-43c9-af29-8570fe293ace): comment read path and recommendation to prefer webhooks.
- [Meta/Postman Comment Webhook](https://www.postman.com/meta/instagram/request/gg841ub/comment-webhook): comment webhook payload shape.
- [Meta/Postman Insights](https://www.postman.com/meta/instagram/folder/w5jo9vk/insights): aggregate media/account metrics and limitations.
- [Meta/Postman Webhook payload reference](https://www.postman.com/meta/instagram/folder/23987686-5049585f-09b2-4775-a11a-debe5956e09a): messaging, reactions, seen, story reply, referral, and comment examples.

## Event Contract

All Instagram observations should be compact and source-labeled:

```json
{
  "sourceKind": "instagram_messages_ui",
  "eventKind": "story_reply",
  "instagramHandle": "cielo_gom_g",
  "observedAt": "2026-05-27T06:45:00.000Z",
  "quantity": 1,
  "confidence": "strong",
  "summary": "Story reply observed in existing thread; no full conversation exported.",
  "tags": ["topic:retiro"]
}
```

Required for person-level scoring:

- one trusted identity anchor: `personId`, `email`, `instagramHandle`, or `phone`;
- `eventKind`;
- `observedAt`;
- compact `summary` without full private conversation export.

Accepted v0 event families:

- `dm`, `message`, `direct_message`, `story_reply`, `message_reaction` -> `instagram_dm`;
- `comment`, `live_comment`, `mention` -> `instagram_comment`;
- `like` -> `instagram_like`;
- `story_view` -> `instagram_story_view`;
- `follow` -> `instagram_follow`;
- `engagement_snapshot`, `media_insight`, `account_insight`, `story_insight`, `profile_visit`, `save`, `share` -> `instagram_engagement_snapshot`.

Current scoring projection uses these person-level fields:

- `inboundDm30d`;
- `comments30d`;
- `likes30d`;
- `storyViews30d`;
- `follows`;
- `lastInteractionAt`.

Aggregate metrics such as `reach30d`, `profileVisits30d`, `saves30d`, and `shares30d` are preserved in the event metrics for future strategy, but they should not create person-level outreach tasks unless a person identity anchor exists and the scoring policy explicitly supports them.

## UI Operator Protocol

Use UI only when it adds real leverage:

1. Prefer exact anchors: email, phone, known handle, ManyChat ID, or trusted source trace.
2. Open an Instagram thread read-only only after a plausible exact-anchor result.
3. Capture compact facts only: bridge, explicit location, product interest, onboarding/source context, tone/preference, and next-step cue.
4. Do not export whole conversations.
5. If login/checkpoint/Relay/CAPTCHA appears, stop and request human unblock instead of silently skipping the source.
6. Name-only search results remain `weak_name_only_hit` or discarded unless another source confirms them.

Safari/Computer Use is currently preferred for Codex-led fast backfill. Chrome/OpenClaw can remain available for Mantis, but the protocol is agent-neutral: any agent must emit the same packet shape.

## Governance With Mailer/Brand

CRM owns:

- person cards;
- identity stitching;
- signal event ledger;
- scoring and movement queues;
- no-send decision brief.

MailerLite Launch OS owns:

- onboarding groups;
- content receipts;
- workflows;
- test sends and mini-launch sending infrastructure.

Brand Hub owns:

- semantic canon;
- naming/tone;
- public communication constraints.

MailerLite and Instagram can both emit events into CRM, but CRM does not create MailerLite groups/workflows or Instagram outbound actions from heat alone.

## Cadence

Daily quiet pulse:

- source health;
- packet inbox;
- control room;
- no broad questions if there is no new packet.

Delta-triggered:

- run Instagram signal adapter when a new Instagram observation packet exists;
- run signal-event pipeline dry-run;
- store event/snapshot only after explicit approval;
- read movement queue only if something actually moved.

Recommended first production-ish loop:

```text
3x/day or event-triggered scout
  -> gather compact IG API/UI observations
  -> write read-only packet in Mantis-Reports
  -> pipeline dry-run
  -> alert only if queue crosses threshold or auth is blocked
```

## Safety

Always prohibited without explicit Alejandro approval:

- sending DMs;
- reacting/liking/following/unfollowing;
- editing comments;
- changing Instagram settings;
- mutating ManyChat LIVE;
- mutating MailerLite audience/workflows;
- writing CRM cards from a signal packet;
- treating heat as consent to contact.

Local writes remain limited to reports unless explicit `--write-events`, `--write-snapshot`, and `--approved-by` are provided to the shared pipeline.

# CRM vNext Next Best Action Policy v0

Date: 2026-05-21
Status: Implemented as shared read-only policy

## Purpose

CRM vNext now separates two decisions:

1. What changed in the score?
2. What kind of operator action does that change actually deserve?

This prevents the CRM from treating every warm signal as a sales trigger.

## Contract

Code:

- `lib/crm/community-next-best-action-policy.ts`

The policy returns:

- `code`
- `label`
- `category`
- `reviewRequired`
- `outboundApprovalRequired`
- `reason`
- `signalPolicyIds`
- `allowedWithoutApproval`
- `blockedUntilApproval`

Every decision keeps `outboundApprovalRequired=true`.

## Action Categories

| Code | Meaning |
| --- | --- |
| `stitch_identity` | A signal exists, but the person is not safely matched to a local vNext card. |
| `complete_profile` | The person exists, but identity/profile data is too thin for stronger interpretation. |
| `respect_suppression` | Email suppression or risk signal blocks normal outreach framing. |
| `restricted_human_review` | Sensitive/restricted service context requires human-only review. |
| `review_reply_context` | A human email reply should be interpreted before enrichment or follow-up planning. |
| `care_or_retention` | Participation points to care, continuity, attendance, delivery, or gratitude. |
| `review_social_context` | Instagram DMs/comments need compact context review before any next move. |
| `review_warm_contact` | Commercial warmth or client/purchase history deserves internal human review. |
| `invite_to_community_space` | Community depth suggests low-pressure community invitation planning. |
| `keep_observing_email` | Passive reading/light social attention is visible but not actionable yet. |
| `inspect_cooling` | Score moved down; inspect whether it is real cooling or stale/partial data. |
| `keep_observing` | No stronger action yet. |

## Core Rules

### Identity Before Action

If a signal cannot be matched to a stable vNext card, route to `stitch_identity` before interpreting warmth.

### Suppression And Restricted Context First

Suppression, risk, or restricted service context always overrides normal warmth interpretation.

### Replies Beat Passive Opens

A thoughtful newsletter/Gmail reply routes to `review_reply_context`.

Passive MailerLite opens usually route to `keep_observing_email`.

### ClassBot Means Care First

ClassBot/yoga participation routes to `care_or_retention` unless there is separate explicit commercial intent such as:

- reply context,
- click/product intent,
- purchase/client signal,
- high commercial warmth.

This is the concrete policy answer to Alejandro's concern: active yoga students can be deep and important without being treated as automatically "hotter" for an offer.

### Instagram Is Context, Not Social Action

Instagram DMs/comments route to `review_social_context`.

Likes/story views without stronger signals usually remain observation.

Instagram UI/API evidence never authorizes:

- messages,
- likes/reactions,
- follows/unfollows,
- permission changes,
- credential changes.

### Purchase/Client History Needs Review

Purchase, active-client, or very high commercial warmth routes to `review_warm_contact`, which means internal review only.

## Current Integration

`engagement-movement-queue` now uses this shared policy instead of a local hard-coded `actionFor` function.

Flow:

```text
Signal Event Ledger
  -> Signal Event Projection
  -> Engagement Signal Preview
  -> Engagement Snapshot Ledger
  -> Engagement Movement Queue
  -> Next Best Action Policy
  -> Decision Brief / Resolution Loop
```

## Safety

This policy is read-only:

- no card writes,
- no Fact Store writes,
- no score mutation,
- no live source calls,
- no credential reads,
- no outbound.

`nextAction` and operator action are planning signals, never permission to contact someone.

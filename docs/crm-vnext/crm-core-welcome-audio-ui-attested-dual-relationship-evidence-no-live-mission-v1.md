# CRM Core Welcome Audio UI-Attested Dual Relationship Evidence — No-Live Mission v1

Date: 2026-07-17

Status: CEO-authorized compact repo-only repair; no source or live authority

## Objective

Remove one empirically false prerequisite from the existing UI-attested
welcome-audio family: a current visible `follows-owner` profile badge is not
required when Instagram exposes an exact recent-follow event but does not expose
that badge consistently on desktop.

The repair stays inside the existing adapter -> source preflight -> operation
guard path. It creates no source family, authority family, browser route,
builder, scheduler, worker, or effect path.

## Exact Relationship Evidence Modes

The existing stronger mode remains valid:

- `follows_owner=confirmed`
- `follows_owner_evidence=explicit_visible_follows_owner_signal`

One bounded alternative is added:

- `follows_owner=recent_follow_event_no_explicit_contradiction`
- `follows_owner_evidence=exact_recent_follow_notification_profile_binding_visible_3_to_7_day_pilot_bucket`

The alternative is valid only when the existing closed projection also proves:

- one exact visible `started_following_owner` event;
- one preserved visible 3-to-7-day relative-time label matching the complete
  closed pilot grammar, without modifiers, negations, signs, decimals, ranges,
  or any claim of an exact timestamp or maximum elapsed age;
- exact notification-to-profile identity;
- exact profile-to-thread and owner binding;
- fresh clear dedupe with no prior welcome, audio, claim, attempt, ambiguous
  result, or terminal no-retry state; and
- no explicit contradictory relationship evidence.

The alternative never claims current follower-list membership. An absent badge
is not a contradiction. A visible explicit contradiction, unknown identity,
ambiguous binding, stale evidence, unsupported bucket, or inferred evidence
blocks.

This 3-to-7-day allowance is a bounded catch-up policy for the first real
pilot after the implementation delay. It is not the intended production
freshness policy; production activation must replace it with a separately
reviewed same-day or otherwise shorter window. The policy is inclusive over
the visible label only; actual elapsed age remains unknown because no exact
follow timestamp is claimed.

## Truthful Receipts

For the bounded alternative, ready redacted receipts keep
`follows_owner_confirmed=false`. Source and preflight readiness may still be
true because the relationship is proven by the exact event-bound mode, not by
a current badge. Private source-evidence hashing binds the selected mode.

## Write Allowlist

1. `scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs`
2. `scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs`
3. `scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs`
4. `__tests__/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.spec.ts`
5. `__tests__/crm-vnext-instagram-welcome-audio-operation-guard.spec.ts`
6. `__tests__/crm-vnext-instagram-welcome-audio-live-preflight.spec.ts`
7. `__tests__/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.spec.ts`
8. `docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-v1.md`
9. `docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md`
10. `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`
11. `docs/crm-vnext/crm-core-next-action.md`
12. this mission contract

## Mandatory Preservations

- Safari remains the only first-canary execution surface.
- Candidate inspection cap remains eight; the later live canary keeps its
  separately approved candidate, claim, upload, Send, and retry caps.
- Exact identity, thread, owner, audio, dedupe, claim-before-effect, PENDING,
  one-click Send, strong same-thread `+1` audio confirmation, and terminal
  no-retry ambiguity remain unchanged.
- `exact_follow_timestamp_claimed=false`,
  `provider_event_id_claimed=false`, and
  `campaign_membership_claimed=false` remain fixed.
- The sealed-backlog and exact-recent source families remain unchanged.

## Forbidden Scope

Instagram or browser access, private source reads, OCR, real candidates, fixed
live roots, claims, PENDING, attachment, upload, Send, text, follow-back,
MailerLite, CRM, campaign, Ads, proxy, network, Chrome/in-app/hybrid execution,
new schemas or authority families, and every file outside the allowlist.

## Completion Gate

Focused dual-mode tests, the existing materializer and welcome-audio
compatibility boundary, syntax, diff, import-inertness, privacy, and false-live
checks must be green. One independent review must find no unresolved P0-P2.
Only then may the lane be committed and proposed for one serialized central
integration. This mission grants no live canary authority.

## Lane Result

The approved repair is complete as a repo-only lane: focused dual-mode
validation is `289/289` green, and the 13-suite welcome-audio compatibility
boundary is `675/675` green. Syntax and diff checks are green, the exact
12-file allowlist is preserved, and independent review found no unresolved
P0-P2 issue. No browser, private source, fixed live root, authority, claim,
PENDING, upload, Send, network, or external effect was invoked. Central
integration remains pending a fresh formal Chief Architect integration review
after its requested closed-grammar and truthful-age correction; no live canary
is authorized by this result.

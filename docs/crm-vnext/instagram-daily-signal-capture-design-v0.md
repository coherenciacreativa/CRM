# Instagram Daily Signal Capture Design v0

Date: 2026-06-09
Status: no-run CRM Core design

## Purpose

This design defines a daily read-only Instagram signal capture ritual for CRM
Core. Its job is to help Mantis and Alejandro understand community pulse from
Instagram without writing CRM state, mutating Instagram, or taking outbound
action.

This is a design artifact only. It does not authorize Instagram UI browsing,
Computer Use execution, API calls, webhook setup, DM inspection, story viewer
collection, welcome audio, follows, likes, reactions, comments, replies, CRM
writes, ledger writes, card writes, Fact Store writes, scoring writes, or
outreach.

## Cadence

Initial recommended cadence:

- Once daily around 5 a.m.
- Run only when the computer is not in active use by Alejandro.
- Use a quiet no-action posture: observe, classify, stop.

Possible later cadence:

- Twice daily if the once-daily ritual is stable, low-noise, and approved.
- Any increase in cadence requires a new approval boundary.

Stop immediately on:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- any prompt that could create a visible action;
- any ambiguity about whether the action is read-only;
- any sign Alejandro is using the computer.

## Source Access Modes

| Source access mode | v0 role | Current boundary |
| --- | --- | --- |
| UI / Computer Use read-only | Future possible route for observing Instagram surfaces without action. | Not authorized by this design; requires separate approval. |
| Manual evidence | Alejandro or a trusted operator supplies compact observations. | Allowed only as future supplied evidence, not collected here. |
| Export / snapshot if available | Future local source packet for offline processing. | Must be private, approved, and redacted at receipt level. |
| Future API / webhook track | Separate investigation for official Instagram or Meta access. | Must not block UI/manual v0 design and must not be implemented here. |

The API/webhook track should be investigated separately. The daily ritual v0
should not depend on API availability, and this design does not claim that
Instagram API access, story viewer access, or webhook delivery is currently
available.

## Signal Families

Daily capture should be designed around these signal families:

| Signal family | Useful meaning | v0 interpretation |
| --- | --- | --- |
| New followers | New community edge or attention entry. | Weak alone; handle-only until bridged. |
| Frequent story viewers | Repeated passive attention pattern. | Useful only by frequency, not isolated views. |
| Story replies | Stronger conversational signal than passive views. | Review-only before interpretation or write. |
| DMs | Strong private relationship/context signal. | Review-only; no thread opening without approval. |
| Email handoffs by DM | Potential Instagram-to-email identity bridge. | High-value identity candidate, not a card write. |
| Likes | Weak passive attention. | Pattern-only; never outreach permission. |
| Comments | Public engagement, stronger when repeated or content-rich. | Review-only when interpretation matters. |
| Mentions | Public/community association signal. | Review-only, especially when identity is ambiguous. |
| Profile/content insight snapshots | Aggregate attention context. | Usually not person-level. |
| Identity bridge candidates | Handle-to-email/person evidence. | Requires confidence and review before any write. |

## Story Viewer Frequency Model

Story-view signals should be classified by frequency and combinations, not by a
single isolated view.

| Signal | Meaning | Allowed v0 effect |
| --- | --- | --- |
| `story_view_single` | One passive view. | Weak review context only. |
| `story_view_repeated_7d` | Repeated attention inside a week. | Attention pattern, still no outreach permission. |
| `story_view_repeated_30d` | Sustained presence over a month. | Relationship-proximity clue, still review-only. |
| `story_view_streak` | Habitual repeated viewing across consecutive capture windows. | Stronger relationship-proximity clue, not a score. |
| `story_view_plus_dm` | Passive attention paired with direct message context. | Stronger review candidate. |
| `story_view_plus_email_handoff` | Viewer or DM context provides email bridge evidence. | Very strong identity bridge candidate. |

Story views are not outreach permission. They are not scoring writes. They must
not write cards, Signal Event Ledger, Engagement Snapshot Ledger, Fact Store, or
CRM state in this v0.

## Instagram-To-Email Bridge

CRM Core should represent an Instagram-to-email bridge as evidence, not as a
card mutation.

Proposed bridge fields:

| Field | Meaning |
| --- | --- |
| `instagramHandle` | Handle observed or supplied from Instagram context. |
| `email` | Email provided by DM or approved manual evidence. |
| `observedAt` | Date/time the bridge evidence was observed or supplied. |
| `contextLabel` | Compact label such as `dm_email_handoff`, `profile_link`, or `manual_confirmation`. |
| `consentOrReason` | Why the email appears usable as evidence, without implying outreach permission. |
| `identityConfidence` | `confirmed`, `likely`, `ambiguous`, `handle-only`, `email-only`, or `unknown`. |
| `reviewState` | Current review state before any write decision. |

No card writes are allowed yet. No identity merge is allowed yet. A bridge may
become a private review candidate, then a future write packet only after a
separate approval boundary.

## Welcome Audio DM Lane

This section is design-only. It does not authorize sending DMs or welcome audio.

Future welcome audio lane:

- Detect new followers not yet welcomed.
- Exclude accounts that are already welcomed, ambiguous, suppression/safety
  blocked, or not appropriate for outreach.
- Avoid duplicates by requiring a private local welcome history or approved
  source-of-truth receipt.
- Send exactly one approved audio/message only after separate explicit approval.
- Record a redacted receipt with aggregate counts and closed gates.

Stop conditions for that future lane:

- any login, checkpoint, CAPTCHA, or modal;
- uncertainty about whether a message was already sent;
- any risk of duplicate welcome;
- any need to open a private thread beyond the approved boundary;
- any need to improvise message/audio content;
- any private content would need to be printed;
- any ambiguity about source mutation.

Welcome audio is outbound/source action. It requires separate explicit approval
before execution.

## Private Artifact Behavior

Future Instagram private source artifacts should live outside the repo,
preferably:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may contain handles or context internally only if approved for
that exact capture boundary. They must not be committed, pasted into chat,
written to tracked docs, or stored in Mantis general memory.

Path labels may be used in chat and redacted receipts. Full private contents,
story viewer lists, DM text, screenshots, names/emails tied to handles, and raw
source rows must not be printed.

## Redacted Receipt Behavior

Redacted receipts should be written under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate counts;
- blocker counts;
- signal family counts;
- identity bridge counts;
- review-state counts;
- source access mode used;
- closed gates;
- next safe operator step.

Receipts must not include:

- full DM text;
- private thread content;
- story viewer lists;
- raw screenshots;
- names or emails tied to handles;
- private URLs;
- message bodies;
- handles tied to private identities;
- private content.

## Review States

Use review states that keep identity and action decisions separate:

| Review state | Meaning |
| --- | --- |
| `pending_private_review` | Captured privately but not interpreted in chat. |
| `handle_only` | Instagram handle exists without safe email/person bridge. |
| `email_handoff_candidate` | Email appears in approved DM/manual context. |
| `identity_bridge_candidate` | Handle/email/person bridge needs evidence review. |
| `repeated_story_viewer` | Frequency pattern exists, still no action permission. |
| `needs_context_review` | Human/operator interpretation is needed. |
| `welcome_audio_candidate` | Possible future welcome candidate, not approved to send. |
| `already_welcomed` | Exclude from future welcome sends. |
| `not_for_outreach` | Should not become an outreach candidate. |
| `blocked_by_ui_or_auth` | Capture stopped by UI/auth ambiguity. |

## Stop Conditions

Stop the ritual or future execution if any of the following occurs:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- risk of visible action;
- need to open private thread beyond the approved boundary;
- need to send, reply, react, follow, like, comment, archive, label, or mutate;
- request to print private content;
- need to print story viewer lists, DMs, names/emails tied to handles, or raw
  screenshots;
- ambiguity about source mutation;
- root is not `/Users/alejandrogomez/CRM-core`;
- branch is not `codex/crm-core-reentry`.

## Future API Track

Official Instagram or Meta API/webhook access belongs in a separate
investigation lane. That lane should determine:

- whether the relevant account type and app setup are available;
- which permissions are required;
- whether app review or business verification is needed;
- which endpoints or webhooks can provide comments, mentions, insights, DMs, or
  story-related signals;
- what data is account-level versus person-level;
- how redacted receipts would prove source health without printing secrets or
  private content.

Do not implement API/webhook access in this design. Do not treat future API
availability as current source health.

## Closed Gates

The following gates remain closed:

- no CRM writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no card writes;
- no Fact Store writes;
- no scoring writes;
- no DMs sent;
- no welcome audio sent;
- no Instagram action;
- no story viewer collection;
- no private thread opening;
- no API/webhook execution;
- no Launch OS touch.

## Completion Boundary

This design is complete when CRM Core has a no-run Instagram daily signal
capture plan with private artifact behavior, redacted receipt behavior, review
states, stop conditions, story-view frequency rules, Instagram-to-email bridge
fields, welcome-audio future lane, and closed gates.

Any execution must wait for a separate explicit approval boundary.

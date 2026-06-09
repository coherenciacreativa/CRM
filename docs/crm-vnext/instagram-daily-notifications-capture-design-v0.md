# Instagram Daily Notifications Capture Design v0

Date: 2026-06-10
Status: no-run CRM Core design

## Purpose

This design defines the first minimal daily read-only Instagram notifications
capture route for CRM Core. The route lets CRM Core observe Instagram community
pulse from the notifications surface without opening private threads, collecting
full story viewer lists, sending DMs, sending welcome audio, or writing CRM
state.

This is a design artifact only. It does not authorize Instagram UI browsing,
Computer Use execution, API calls, webhook setup, DM inspection, story viewer
collection, welcome audio, follows, likes, reactions, comments, replies, CRM
writes, ledger writes, card writes, Fact Store writes, scoring writes, or
outreach.

## Source Surface

The future capture route is limited to the Instagram notifications surface.

Allowed source-health observations for a future approved execution:

- new follower notification groups;
- story-related notification groups;
- notification time buckets;
- optional messages entrypoint visibility as source-health only.

The messages entrypoint may be classified as visible or not visible, but this
route must not read DMs, open private threads, export message snippets, or infer
email handoffs from private content.

## Future Capturable Fields

A future execution may capture only aggregate and redacted notification-surface
metadata:

- source health state;
- aggregate count of visible new follower notifications;
- aggregate count of visible story-related notification groups;
- aggregate count of visible notification time buckets;
- whether the messages entrypoint is visible;
- blocker classes;
- closed gates;
- next safe step.

No private content is approved for standard receipts or chat.

## Forbidden Capture

This route must not capture or print:

- full handles in chat;
- handles tied to private identities;
- story viewer lists;
- DM text;
- message snippets;
- screenshots;
- names or emails tied to handles;
- private thread content;
- exact private identities in standard receipts;
- private URLs;
- message bodies;
- tokens, headers, env values, credential metadata, or secrets.

## Dedupe And Already-Seen Handling

Future repeated daily captures should avoid double-counting visible notification
groups. The capture should record enough private metadata to identify repeated
surface observations without exposing identities in chat or standard receipts.

Recommended dedupe fields:

- capture timestamp;
- notification time bucket;
- redacted event class such as `new_follower_notification` or
  `story_related_notification_group`;
- optional private hash or anchor inside the private artifact only;
- source route label;
- run identifier.

Private anchors or hashes must never be printed in chat, standard redacted
receipts, tracked docs, or Mantis general memory. If dedupe is ambiguous, the
receipt should classify the count as viewport-level observed groups rather than
unique people or unique events.

## Read-State Ambiguity

Instagram notifications may have read/unread or seen-state behavior that is not
fully transparent from the UI. This route treats any read-state uncertainty as a
source-health risk.

Rules for a future execution:

- do not click into notification items;
- prefer viewport-level aggregate observation;
- do not mark, archive, follow, like, react, comment, reply, or open profiles;
- stop if a click could mark something read or trigger visible behavior;
- stop if Instagram displays a modal, confirmation, permissions prompt, login,
  checkpoint, CAPTCHA, or other source-health ambiguity.

If merely opening the notifications surface appears to change read state, record
that as a blocker and stop.

## Story Viewer Frequency

This notifications route cannot capture full story viewer frequency directly.
It can only observe story-related notification groups visible from the
notifications surface.

Story viewer frequency requires a separate boundary:

- repeated daily redacted captures that can compare private anchors over time;
- a story viewer surface pilot;
- or an approved private artifact route.

Until one of those boundaries is approved, story-related notification groups are
only community-pulse indicators, not story viewer frequency, not recent intent,
and not outreach permission.

## Private Artifact Behavior

Future private artifacts for this route must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include internal redacted anchors or hashes needed for
dedupe, source-health classification, and repeated-capture comparison. They must
not be committed, pasted into chat, stored in tracked docs, or stored in Mantis
general memory.

Chat and standard receipts may reference only a private artifact path label, not
private artifact contents or exact private identity values.

## Redacted Receipt Behavior

Redacted receipts must be written under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- source health state;
- total notification groups visible;
- visible new follower notification count;
- visible story-related notification group count;
- visible notification time bucket count;
- messages entrypoint visibility;
- blocker classes;
- closed gates;
- next safe step.

Receipts must not include:

- handles tied to private identities;
- full notification text;
- story viewer lists;
- DMs;
- screenshots;
- names or emails;
- private URLs;
- message bodies;
- private content;
- tokens, headers, env values, credential metadata, or secrets.

## Stop Conditions

Stop a future execution immediately on:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- active computer use;
- any need to click a notification;
- any need to open a private thread;
- any risk of visible action;
- any need to print private content;
- any ambiguity about source mutation;
- any request to follow, like, react, comment, reply, archive, label, mark, send,
  or mutate;
- root is not `/Users/alejandrogomez/CRM-core`;
- branch is not `codex/crm-core-reentry`.

## Future Welcome Audio Lane

Welcome audio remains a separate outbound/source-action lane. This notifications
capture route may later help identify possible welcome candidates, but it does
not authorize sending audio, DMs, replies, reactions, follows, comments, or any
other Instagram action.

Any welcome-audio route requires a separate explicit approval boundary, private
dedupe/welcome-history safeguards, approved content, and redacted receipts.

## Closed Gates

The following gates remain closed:

- no Instagram action;
- no DM sent;
- no welcome audio;
- no story viewer collection;
- no private thread opening;
- no CRM writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no card writes;
- no Fact Store writes;
- no source-result ledger writes;
- no scoring writes;
- no outreach;
- no source mutation;
- no Launch OS touch;
- no `/Users/alejandrogomez/CRM` use.

## Completion Boundary

This design is complete when CRM Core has a no-run route for daily Instagram
notifications capture that defines the allowed notifications surface, aggregate
capture fields, forbidden private content, dedupe/read-state safeguards,
private artifact behavior, redacted receipt behavior, stop conditions, welcome
audio separation, and closed gates.

Any execution must wait for a separate explicit approval boundary.

# Instagram Welcome Audio Send Boundary v0

Date: 2026-07-01
Status: no-run CRM Core design

## Purpose

This document defines the future welcome audio send boundary for CRM Core.

It covers:

- business eligibility for confirmed new followers;
- approved audio asset registry;
- already-welcomed history;
- send history;
- duplicate prevention;
- candidate set requirements;
- send approval packet;
- exact future approval phrase;
- final dedupe check;
- redacted receipts;
- stop conditions;
- separation from reply monitoring, MailerLite/Gmail onboarding, CRM writes,
  and source actions;
- closed gates.

This design does not authorize DM opening, audio send, Instagram action,
candidate queue generation, private artifact inspection, CRM writes,
MailerLite or Gmail access, or outreach.

## Business Eligibility Rule

Every confirmed new Instagram follower is in-scope for welcome audio
eligibility. The lane does not add discretionary scoring, warmth, story-view,
email-engagement, or commercial filtering before eligibility.

However, eligibility is not send permission. A confirmed new-follow signal may
identify a future candidate, but it does not authorize DM opening, welcome audio
send, Instagram action, candidate queue generation, private artifact
inspection, CRM/source writes, MailerLite/Gmail access, or outreach.

A future send still requires a bounded send approval packet naming the exact
candidate set and exact approved audio asset, plus final fail-closed duplicate
prevention immediately before send.

The only blockers are boundary/safety blockers, including duplicate risk,
already-welcomed or send-history ambiguity, identity ambiguity,
suppression/safety block, missing or unapproved asset, missing approval packet,
source/platform route instability, private artifact path problems, or any
action outside the approved send boundary.

Use this distinction:

- new follow = universal business eligibility;
- approval packet plus final dedupe = send boundary.

## Required Preconditions Before Any Future Send

A future welcome audio send requires all of the following:

- approved candidate set from a separately approved private candidate queue;
- exact candidate set label;
- exact candidate count;
- exact approved audio asset;
- bounded send approval packet;
- approval packet ID;
- reviewer/approver reference;
- already-welcomed check immediately before send;
- send-history check immediately before send;
- final dedupe check immediately before send;
- identity confidence not ambiguous;
- suppression/safety not blocked;
- source/platform route approved;
- exact send approval phrase;
- redacted receipt destination;
- stop conditions green.

Missing, stale, ambiguous, unavailable, path-nonconforming, or inconsistent
evidence blocks send.

A confirmed new-follow signal may satisfy business eligibility, but it does not
satisfy send preconditions by itself.

## Private Artifact Behavior

This design does not inspect, create, mutate, or rely on live access to private
artifacts.

Any future approved implementation must keep private Instagram welcome-audio
artifacts only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

This includes:

- already-welcomed history;
- welcome/send history;
- candidate references;
- private follower anchors;
- private duplicate-prevention inputs;
- private approval evidence that cannot be public;
- any future private send-boundary evidence artifacts.

No private Instagram welcome-audio artifact may be stored in CRM Core,
committed to the repo, copied into public docs, or treated as a CRM/source
write.

Absence from a visible document, candidate list, public report, current queue,
current source export, or detection output is not proof that a person has not
already been welcomed.

If required private already-welcomed or send-history evidence is missing,
unavailable, stale, ambiguous, path-nonconforming, unreadable under an approved
future route, or inconsistent with the approval packet, the send boundary must
stop.

## Redacted Receipt Behavior

Future redacted send-boundary receipts must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts must be redacted and must not include:

- private message content;
- raw Instagram data;
- private follower anchors;
- raw private artifacts;
- MailerLite content;
- Gmail content;
- unredacted source-system identifiers;
- private URLs;
- audio binary;
- tokens;
- secrets.

Receipts may record only boundary/audit facts such as:

- approval packet ID;
- approved audio asset ID;
- candidate set label;
- candidate count;
- redacted candidate reference or aggregate count;
- already-welcomed check result;
- send-history check result;
- final dedupe result;
- send/no-send outcome;
- stop reason, if applicable;
- timestamp;
- reviewer/approver reference.

Receipt existence is audit evidence only and does not grant send permission.

## No-Inference Send Permission Rule

None of the following grants welcome audio send permission:

- detection;
- confirmed new-follow signal;
- business eligibility;
- source health;
- story views;
- follower visibility;
- MailerLite engagement;
- Gmail engagement;
- email warmth;
- candidate existence;
- candidate queue membership;
- prior onboarding status;
- asset registry presence;
- asset availability;
- an asset-level `send_allowed` field;
- reply monitoring status;
- CRM card existence;
- scoring status;
- outreach status.

Welcome audio sending requires a separate bounded send approval packet naming
the exact candidate set and exact approved audio asset, followed by final
fail-closed dedupe immediately before send.

Detection, queue, and send are separate boundaries.

## Audio Asset Registry

The future approved audio asset registry is a no-run control surface for naming
approved audio assets before any send packet can be considered.

Future registry records should include:

- `audio_asset_id`;
- `audio_asset_label`;
- immutable asset identifier or checksum label;
- `asset_storage_location_label`;
- `registry_status`;
- `approved_by`;
- `approved_at`;
- `language`;
- `version`;
- `duration_class`;
- `content_scope`;
- `personalization_allowed`;
- `send_allowed`;
- `retired_at`;
- `blocked_at`;
- `replacement_asset_id`;
- `notes`.

Possible registry statuses:

- `registered`;
- `approved`;
- `retired`;
- `blocked`;
- `replaced`.

Rules:

- registered asset does not mean approved asset;
- approved asset does not mean send is approved;
- asset registry presence does not authorize sending;
- an asset-level `send_allowed` field does not authorize sending to any
  candidate without a bounded approval packet;
- no improvised audio;
- no generated audio unless separately approved;
- no personalization from private data unless separately approved;
- no asset substitution;
- no asset send without exact asset approval;
- no audio binary in repo unless explicitly approved by a separate central
  decision;
- no audio transcription in chat unless explicitly approved;
- retired assets must not be sent;
- blocked assets must not be sent;
- replacement assets require their own approval;
- any ambiguity about asset identity blocks send.

## Already-Welcomed History

Already-welcomed history is a future private safeguard, not an artifact
inspected by this design.

Future private already-welcomed history records should live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Future records may include:

- `private_follower_anchor`;
- `welcomed_at`;
- `welcome_send_attempt_id`;
- `audio_asset_id`;
- `send_status`;
- `source_surface`;
- `operator_approval_ref`;
- `approval_packet_id`;
- `receipt_label`;
- `dedupe_result`.

Rules:

- never send duplicate welcome audio to the same private follower anchor;
- duplicate prevention applies across asset versions unless explicitly approved
  otherwise in a future separate design;
- if history is unknown, block send;
- if prior send status is ambiguous, block send;
- if candidate identity is ambiguous, block send;
- if suppression or safety status blocks outreach, block send;
- if the private history artifact cannot be read under a future approved route,
  block send rather than guessing;
- if the history artifact path is nonconforming, block send;
- absence from a current queue or visible report is not proof of no prior
  welcome.

## Send History

Send history is distinct from already-welcomed history.

Future private send-history records should live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Future records may include:

- `welcome_send_attempt_id`;
- `approval_packet_id`;
- `private_follower_anchor`;
- `audio_asset_id`;
- `attempted_at`;
- `send_status`;
- `stopped_reason`;
- `dedupe_result`;
- `receipt_label`.

Rules:

- send history must be checked immediately before any future send;
- ambiguous attempt status blocks send;
- failed/partial/unknown attempt status does not automatically permit retry;
- retries require explicit future approval and dedupe;
- send history is private and must not be committed to the repo;
- send history is not CRM state.

## Duplicate Prevention

Duplicate prevention must fail closed.

A final dedupe check is required immediately before any future send. Final
dedupe must check both:

- already-welcomed history;
- send history.

Final dedupe must verify:

- exact candidate set;
- exact private follower anchor or approved equivalent;
- exact approval packet ID;
- exact approved audio asset ID;
- no prior completed welcome;
- no ambiguous prior send;
- no conflicting history;
- no suppression/safety block.

If either already-welcomed history or send history is missing, stale,
ambiguous, unavailable, path-nonconforming, unreadable under an approved future
route, or inconsistent with the approval packet, the boundary must stop.

The following are not valid duplicate-prevention proofs:

- not present in the current queue;
- not found in the current visible report;
- not seen in current detection output;
- not visible in public docs;
- not present in CRM;
- not present in MailerLite;
- not present in Gmail.

The final dedupe check cannot be skipped, cached, inferred, or replaced by
source health, detection confidence, follower visibility, or business
eligibility.

## Candidate Set Requirements

This document does not generate a candidate queue.

Every confirmed new Instagram follower is business-eligible, but candidate set
creation remains a separate approval boundary.

A future candidate set must be:

- separately approved;
- private;
- exact;
- bounded;
- labeled;
- countable;
- tied to approved private candidate references;
- compatible with already-welcomed and send-history dedupe;
- reviewed before any future send approval.

Candidate existence, candidate queue membership, follower visibility,
detection, confirmed new-follow signal, business eligibility, or source health
does not grant send permission.

A candidate set cannot be widened during send.

Any mismatch between candidate set label, candidate count, approval packet, and
dedupe evidence blocks send.

## Send Approval Packet

The future send approval packet is the bounded approval surface for one named
candidate set and one named audio asset.

A valid future send approval packet must include:

- `approval_packet_id`;
- reviewer/approver reference;
- `approved_at`;
- exact candidate set label;
- exact candidate count;
- candidate private artifact path label;
- exact approved `audio_asset_id`;
- audio asset registry status;
- already-welcomed check status;
- send-history check status;
- final dedupe requirement;
- duplicate check status;
- identity ambiguity count;
- suppression/safety blocked count;
- source/platform route;
- expected send count;
- stop conditions;
- exact approval phrase;
- redacted receipt destination;
- redacted receipt path.

The packet approves only one bounded send batch and creates no standing
permission.

Universal business eligibility for confirmed new followers does not remove the
need for a bounded approval packet.

The packet is an approval surface, not an execution result and not CRM state.

The packet does not authorize:

- future repeated sends;
- new candidate queues;
- queue expansion;
- reply monitoring;
- MailerLite onboarding;
- Gmail access;
- CRM writes;
- source mutation;
- outreach beyond the named candidate set and named audio asset.

Receipts must not include:

- handles;
- DMs;
- private anchors;
- audio binary;
- private message content;
- raw follower rows;
- private URLs;
- tokens;
- secrets.

## Exact Future Approval Phrase

Suggested phrase:

```text
I approve CRM Core to send the approved welcome audio asset <audio_asset_id> to the explicitly approved private candidate set <candidate_set_label> only. Check already-welcomed history and send history immediately before send, stop on any ambiguity, send no duplicates, do not improvise or personalize content, do not open unrelated DMs or profiles, do not write CRM state, do not mutate source systems, and write only redacted receipts.
```

This current design grants no send approval.

The approval phrase is packet-specific and does not authorize future repeated
sends, new candidate queues, reply monitoring, MailerLite onboarding, Gmail
access, CRM writes, source actions, or outreach beyond the named candidate set
and named audio asset.

## Reply Monitoring After Send

- Send does not authorize reply monitoring.
- Reply monitoring requires separate approval.
- Email handoff extraction requires separate private review.
- MailerLite onboarding requires separate approval.
- Gmail access requires separate approval.
- CRM writes require a separate CRM write packet.
- Any reply evidence must remain private unless a future approval explicitly
  defines a redacted or aggregate route.

## MailerLite, Gmail, CRM Write, and Source Action Separation

- MailerLite onboarding is separate from welcome audio send.
- MailerLite engagement does not authorize welcome audio send.
- Gmail/email warmth does not authorize welcome audio send.
- CRM writes are separate from welcome audio send.
- Source mutation is separate from welcome audio send.
- Instagram source actions are separate from welcome audio send.
- This design creates no permission to write to MailerLite, Gmail, Instagram,
  CRM, source systems, ledgers, cards, Fact Store, or outreach systems.

## Stop Conditions

Stop any future send on:

- missing exact audio asset;
- unapproved audio asset;
- retired or blocked audio asset;
- asset identity ambiguity;
- missing approved candidate set;
- candidate set mismatch;
- candidate count mismatch;
- missing approval packet;
- stale approval packet;
- missing exact approval phrase;
- duplicate risk;
- already-welcomed unknown;
- send-history unknown;
- ambiguous prior send;
- identity ambiguity;
- suppression/safety block;
- source/platform route instability;
- unexpected modal;
- need to open unrelated profile/thread;
- need to inspect private artifacts without separate approval;
- need to generate or widen candidate queue;
- request to personalize/improvise;
- private output exposure risk;
- CRM write temptation;
- MailerLite/Gmail access temptation;
- source mutation temptation;
- any source action outside approval.

Stop rather than attempting to repair, infer, retry, widen, personalize, or
continue a send route during execution.

## Closed Gates

The following remain closed:

- no execution;
- no API calls;
- no Instagram UI;
- no UI, Computer Use, or `@Chrome`;
- no private artifact inspection;
- no private artifact creation or mutation;
- no source mutation;
- no CRM/source writes;
- no candidate queue generation;
- no DM opening;
- no welcome audio send;
- no MailerLite access;
- no Gmail access;
- no scoring;
- no ledgers;
- no cards;
- no Fact Store;
- no outreach;
- no Launch OS execution;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

This design is complete only when CRM Core has a no-run welcome audio
send-boundary document covering:

- approved audio asset registry;
- business eligibility for confirmed new followers;
- already-welcomed history;
- send history;
- candidate set requirements;
- duplicate prevention;
- bounded send approval packet;
- exact future approval phrase;
- final fail-closed dedupe;
- redacted receipts;
- stop conditions;
- reply monitoring separation;
- MailerLite/Gmail onboarding separation;
- CRM write separation;
- source action separation;
- closed gates.

Completion of this design does not approve candidate queue generation, private
artifact inspection, DM opening, welcome audio send, Instagram action,
MailerLite/Gmail access, CRM/source writes, or outreach.

# Instagram CRM Identity Enrichment Packet Boundary v0

Date: 2026-07-05
Status: no-run CRM Core lane design

Task id: `crm_core_controlled_welcome_flow_identity_crm_enrichment_packet_boundary_v0`

## Purpose

Define the future no-write CRM identity/enrichment packet boundary for the
Controlled Welcome Flow Proof.

This artifact explains how future approved controlled welcome-flow evidence
could propose CRM enrichment without writing CRM state, cards, ledgers, Fact
Store, source-result ledgers, scoring, source systems, or outreach.

This document does not execute Instagram, open DMs, inspect private artifacts,
call APIs, use MailerLite or Gmail, generate candidate queues, send welcome
audio, write CRM/source state, touch Launch OS, write Mantis memory, inspect
OpenClaw/Mantis workspace content, or use `/Users/alejandrogomez/CRM`.

## Relationship To Controlled Welcome Flow Proof Plan

This design is the next no-run boundary after:

```text
controlled new-follower evidence
-> controlled candidate queue and sandbox send approval
-> controlled welcome audio send, if separately approved later
-> reply monitoring and email handoff, if separately approved later
-> MailerLite no-write payload preview, if separately approved later
-> CRM identity/enrichment packet preview, if separately approved later
-> card, ledger, Fact Store, scoring, or source-result writes only after
   separate explicit write approvals
```

It does not mark CRM enrichment preview, identity evidence review, card write,
ledger append, Fact Store write, source-result ledger write, scoring preview,
or next-best-action execution complete.

## Existing CRM Core Prior Art Summary

CRM Core already has the layers this packet must use:

- person cards as the durable profile surface;
- source-result memory for source-specific bridge outcomes and retry posture;
- Signal Event Ledger for observed activity-shaped events;
- Engagement Snapshot Ledger for reviewed movement history;
- Fact Store for durable reviewed business truths;
- engagement signal preview for no-write heat/review projection;
- scoring policy for internal prioritization only;
- next-best-action policy for internal review routing with outbound approval
  still required;
- Community Signal Readiness Board rules for source access, identity
  confidence, allowed effects, and write policies.

This artifact must not create a duplicate CRM architecture. It only defines a
future packet shape that can route evidence into the existing review and write
gates.

## Non-Duplication Statement

The CRM enrichment packet is not:

- a new card store;
- a second source-result ledger;
- a Fact Store replacement;
- a Signal Event Ledger replacement;
- an Engagement Snapshot Ledger replacement;
- a scoring engine;
- a next-best-action executor;
- a MailerLite payload;
- an outreach queue.

It is a no-write review packet that says what CRM Core could later update only
if Alejandro approves the relevant downstream write gate.

## No-Run Status

This task is design-only.

It does not:

- inspect private Instagram or email evidence;
- inspect private MailerLite payload preview artifacts;
- prepare a real CRM write packet;
- write cards;
- append ledgers;
- write Fact Store;
- update source-result memory;
- run scoring;
- execute next-best-action policy;
- call Instagram, MailerLite, Gmail, or Meta APIs;
- open Instagram UI, MailerLite UI, Gmail, DMs, or private threads;
- send welcome audio;
- generate candidate queues;
- perform outreach.

## CRM Enrichment Packet Boundary

A future CRM identity/enrichment packet may summarize whether approved private
evidence is sufficient to propose one or more later CRM changes.

Allowed future packet outcomes:

- `ready_for_private_identity_review`;
- `ready_for_no_write_crm_preview`;
- `blocked_missing_email_anchor`;
- `blocked_missing_instagram_anchor`;
- `blocked_identity_ambiguous`;
- `blocked_suppression_or_safety`;
- `blocked_missing_mailerlite_preview_status`;
- `blocked_missing_reply_evidence_status`;
- `blocked_human_review_required`;
- `not_allowed_unapproved_source_evidence`.

The packet may recommend a later approval boundary. It must not apply the
change itself.

## Evidence Inputs

Future packet inputs may include labels and statuses only when separately
approved:

```yaml
controlledWelcomeFlow:
  evidencePacketIdLabel: string
  welcomeSendReceiptLabel: string | null
  replyEvidenceStatus: not_started | no_reply_observed | reply_indicator_observed | private_evidence_captured | blocked | unknown
  welcomeSentStatus: not_sent | sent | blocked | unknown
identityAnchors:
  instagramPrivateAnchorLabel: present | absent | unknown
  emailPrivateAnchorLabel: present | absent | unknown
  personCardCandidateLabel: present | absent | unknown
handoffEvidence:
  emailCandidateStatus: present | absent | unknown
  nameCandidateStatus: present | absent | unknown
  cityCandidateStatus: present | absent | unknown
  countryCandidateStatus: present | absent | unknown
  phoneCandidateStatus: present | absent | unknown
mailerlite:
  noWritePayloadPreviewStatus: not_started | ready_for_review | blocked | not_allowed | unknown
  onboardingStatusLabel: not_started | preview_only | mutation_unapproved | mutation_blocked | unknown
safety:
  suppressionSafetyStatus: clear | blocked | unknown
  consentOrContextStatus: confirmed | unclear | blocked | unknown
provenance:
  sourceEvidenceClass: controlled_instagram_evidence | approved_reply_handoff_evidence | approved_manual_evidence | approved_mailerlite_preview | mixed_approved_evidence
  sourceObservedAtLabel: string
  privateArtifactPathLabel: string
  redactedReceiptPathLabel: string
review:
  identityConfidence: high | medium | low | ambiguous | unknown
  humanReviewStatus: cleared | required | unresolved
```

The packet must not include raw emails, names, handles, phone numbers, message
bodies, URLs, screenshots, private anchors, subscriber IDs, or private artifact
contents in chat, tracked docs, or redacted receipts.

## Identity Confidence Model

Suggested categories:

- `high`: approved evidence links Instagram and email/person anchors with no
  conflict, suppression is clear, and human review is cleared when required;
- `medium`: evidence is plausible but missing one corroborating source or
  requires conservative review before card write;
- `low`: one anchor exists but bridge evidence is weak or source-health is
  incomplete;
- `ambiguous`: competing identities, shared email/family context, conflicting
  anchors, or unresolved human review;
- `unknown`: required evidence has not been supplied.

Identity confidence is not warmth. A high identity-confidence packet does not
authorize outreach, scoring, card writes, or ledger writes.

## Private Anchor Model

The future packet may refer to private anchors by labels only:

- `instagramPrivateAnchorLabel`;
- `emailPrivateAnchorLabel`;
- `personCardCandidateLabel`;
- `mailerlitePreviewPacketLabel`;
- `replyEvidencePacketLabel`.

Private anchors must live only in approved private artifacts outside the repo.
They must never be committed, pasted into chat, copied into tracked docs, or
stored in Mantis general memory.

## Provenance Model

Every proposed enrichment field needs provenance:

```yaml
provenance:
  evidenceClass: controlled_instagram_evidence | approved_reply_handoff_evidence | approved_manual_evidence | approved_mailerlite_preview | approved_existing_card_review
  sourceRoute: api_webhook_source_health | instagram_ui_private_review | manual_evidence | local_snapshot | mailerlite_no_write_preview | unknown
  observedAtLabel: string
  capturedBy: Alejandro | Codex | Mantis | unknown
  redactedReceiptLabel: string
  rawPrivateEvidenceStoredOutsideRepo: true | false
  sourceResultClass: bridge_found | found_profile_no_requested_bridge | not_found_limited_search | not_found_exhaustive | blocked | not_applicable
```

Unknown or missing provenance blocks write approval and may still allow a
review-only packet.

## Suppression And Safety Model

Suppression and safety outrank enrichment.

Future packet statuses:

- `clear`;
- `blocked_unsubscribed`;
- `blocked_bounced`;
- `blocked_complained`;
- `blocked_suppressed`;
- `blocked_sensitive_context`;
- `blocked_consent_unclear`;
- `unknown_blocked`.

If suppression/safety is blocked or unknown, the packet may only recommend
review or no action. It must not propose card writes, MailerLite mutation,
outreach, or scoring movement as ready.

## MailerLite No-Write Preview Dependency

MailerLite no-write payload preview status is supporting evidence only.

It may help answer:

- whether approved private email evidence exists;
- whether field/group/setup blockers remain;
- whether suppression/status blocks onboarding;
- whether MailerLite mutation remains unapproved.

It must not become:

- a MailerLite API payload;
- a subscriber import;
- a CRM write;
- a card authority;
- a scoring trigger.

## Welcome, Reply, And Evidence Status Fields

Suggested redacted fields:

```yaml
welcomeFlowStatus:
  newFollowerEvidenceStatus: not_started | captured | blocked | unknown
  candidateQueueStatus: not_started | generated_private | blocked | unapproved
  welcomeSendStatus: not_started | sent | blocked | unapproved
  replyMonitoringStatus: not_started | no_reply_observed | reply_indicator_observed | private_evidence_captured | blocked | unapproved
  emailHandoffStatus: not_started | candidate_present | candidate_absent | blocked | unapproved
  mailerlitePreviewStatus: not_started | ready_for_review | blocked | unapproved
```

Each status is evidence context, not permission to write or contact.

## No-Write Packet Schema

Future private preview artifacts may use this schema. This task does not create
such an artifact.

```yaml
crmEnrichmentPacketId: string
schemaVersion: crm-core-crm-enrichment-packet-v0
packetMode: no_write_preview_only
packetStatus: ready_for_review | blocked | not_allowed
subject:
  personCardCandidateLabel: present | absent | unknown
  instagramPrivateAnchorPresent: true | false | unknown
  emailPrivateAnchorPresent: true | false | unknown
  identityConfidence: high | medium | low | ambiguous | unknown
evidence:
  controlledFollowerEvidenceStatus: captured | blocked | not_started | unknown
  welcomeSendStatus: sent | not_sent | blocked | unknown
  replyEvidenceStatus: private_evidence_captured | no_reply_observed | blocked | not_started | unknown
  emailHandoffStatus: candidate_present | candidate_absent | blocked | not_started | unknown
  mailerliteNoWritePreviewStatus: ready_for_review | blocked | not_started | unknown
proposedEnrichment:
  proposedCardFieldCount: number
  proposedIdentityBridgeCount: number
  proposedSourceResultMemoryCount: number
  proposedFactCandidateCount: number
  proposedSignalEventCount: number
  proposedEngagementSnapshotCount: number
  proposedScoringPreviewStatus: not_started | possible_after_ledger_review | blocked | not_allowed
  proposedNextBestActionPreviewStatus: not_started | possible_after_scoring_preview | blocked | not_allowed
safety:
  suppressionSafetyStatus: clear | blocked | unknown
  restrictedContextStatus: none | present_review_only | blocked | unknown
  consentOrContextStatus: confirmed | unclear | blocked | unknown
writeGates:
  cardWriteApprovalPresent: false
  factStoreWriteApprovalPresent: false
  signalEventLedgerWriteApprovalPresent: false
  engagementSnapshotLedgerWriteApprovalPresent: false
  sourceResultLedgerWriteApprovalPresent: false
  scoringWriteApprovalPresent: false
blockers:
  - blockerCode: string
closedGates:
  crmWritePerformed: false
  cardWritePerformed: false
  factStoreWritePerformed: false
  signalEventLedgerWritePerformed: false
  engagementSnapshotLedgerWritePerformed: false
  sourceResultLedgerWritePerformed: false
  scoringWritePerformed: false
  sourceMutationPerformed: false
nextSafeStep: string
```

## Redacted Display Rules

Redacted previews and receipts may include:

- packet id;
- packet status;
- counts by evidence status;
- counts by identity-confidence class;
- counts by proposed enrichment class;
- suppression/safety status counts;
- blocker counts;
- closed gate confirmations;
- next safe step.

They must not include:

- names;
- emails;
- phone numbers;
- Instagram handles tied to private identities;
- subscriber IDs;
- person IDs if sensitive;
- private anchors;
- raw source rows;
- private artifact contents;
- DM bodies;
- screenshots;
- private URLs;
- tokens;
- headers;
- cookies;
- env values;
- credentials;
- authorization codes;
- secrets.

## Private Artifact Rules

Future private preview artifacts, if separately approved, must live outside the
repo under the approved private artifact root named in the future approval.

Rules:

- tracked docs may contain only schemas, labels, counts, and boundary language;
- private evidence values stay outside the repo;
- raw private evidence must not be pasted into chat;
- Mantis general memory must not store private entries;
- redacted receipts must include path labels only, not artifact contents;
- if private path safety is ambiguous, stop.

## Relationship To Person Cards

The packet may propose card enrichment candidates, but it must not write cards.

Possible future card proposals:

- add or confirm a private Instagram identity label;
- add or confirm an email identity label;
- add a reviewed source-provenance note;
- flag human review required;
- mark suppression/safety review status.

Each card change requires a separate exact card-write approval packet.

## Relationship To Source-Result Memory

The packet may propose source-result memory entries such as:

- `bridge_found`;
- `found_profile_no_requested_bridge`;
- `not_found_limited_search`;
- `not_found_exhaustive`;
- `blocked`.

It must not append the source-result ledger. A future source-result write needs
separate approval and should preserve method class, retry policy, source
exhaustion, and result strength.

## Relationship To Fact Store

Durable truths, such as verified membership, consent/context, known service
relationship, or identity bridge decisions, belong in Fact Store only after
review.

This packet may classify a fact candidate but must not write Fact Store.

If evidence is activity-shaped, it should route to Signal Event Ledger review
instead of Fact Store.

## Relationship To Signal Event Ledger

Instagram follows, replies, DMs, comments, story views, welcome-send receipts,
and email engagement are event-shaped observations.

The packet may classify whether a future event is ledger-compatible. It must
not append the Signal Event Ledger.

`ledger-ready` means shape-compatible, not write-approved.

## Relationship To Engagement Snapshot Ledger

The packet may note that a later no-write engagement preview could produce
movement history. It must not write the Engagement Snapshot Ledger.

Any future snapshot write requires an explicit approval boundary after source
events and scoring/preview policy have been reviewed.

## Relationship To Scoring / Heat Preview

The packet may say whether evidence is sufficient for a later no-write
engagement or heat preview.

It must not:

- mutate score;
- treat warmth as permission to contact;
- promote passive evidence into outreach;
- bypass identity stitching;
- override suppression or restricted-context rules.

## Relationship To Next-Best-Action Policy

The packet may suggest that a future preview should route to next-best-action
review categories such as:

- `stitch_identity`;
- `complete_profile`;
- `respect_suppression`;
- `review_reply_context`;
- `review_social_context`;
- `keep_observing`;
- `restricted_human_review`.

It must not execute next-best-action policy, create tasks, send messages, or
perform outreach.

## Card-Write Approval Boundary

Card writes require a separate exact future approval after the no-write packet
is reviewed.

Minimum approval context:

- packet id;
- proposed fields/counts;
- identity confidence;
- provenance class;
- suppression/safety status;
- human review status;
- exact destination card or private card label;
- redacted receipt path;
- explicit statement that only approved fields may be written.

No card write may be bundled with MailerLite mutation, welcome audio send,
reply monitoring, source-result writes, ledger writes, Fact Store writes, or
scoring writes.

## Future Exact Approval Phrase Templates

This current design grants none of the approvals below.

### CRM Enrichment Packet Preview

```text
I approve CRM Core to prepare one no-write CRM identity/enrichment packet preview from the explicitly approved controlled welcome-flow evidence only. Do not write cards, ledgers, Fact Store, scoring, source-result ledgers, or CRM/source state, do not call Instagram, MailerLite, Gmail, or Meta APIs, and do not print private identities in chat.
```

### Private Identity Evidence Review

```text
I approve one CRM Core private identity evidence review for the approved CRM enrichment packet only. Use only the approved private artifact labels, write redacted aggregate receipts, do not print names, emails, handles, private anchors, message bodies, or private content, and do not write CRM/source state.
```

### Card-Write Approval

```text
I approve CRM Core to apply only the reviewed card field changes from the approved CRM enrichment packet to the explicitly named private card label. Do not write ledgers, Fact Store, scoring, source-result ledgers, outreach, source systems, MailerLite, Gmail, or Instagram, and write only redacted receipts.
```

### Signal / Ledger Write Approval

```text
I approve CRM Core to append only the reviewed signal/source-result ledger entries from the approved CRM enrichment packet. Do not write cards, Fact Store, scoring, outreach, source systems, MailerLite, Gmail, or Instagram, and write only redacted receipts.
```

### Scoring / Heat Preview

```text
I approve CRM Core to run one no-write scoring/heat preview from the approved CRM enrichment packet only. Do not mutate scores, cards, ledgers, Fact Store, source-result ledgers, outreach, source systems, MailerLite, Gmail, or Instagram, and do not treat preview warmth as permission to contact.
```

## Stop Conditions

Stop future preview preparation if:

- approval phrase is missing, modified, or not packet-specific;
- controlled evidence packet is missing;
- reply/email handoff evidence is missing when required;
- MailerLite no-write preview status is required but missing;
- identity confidence is ambiguous;
- human review is required and unresolved;
- suppression/safety status is blocked or unknown;
- provenance is missing or contradictory;
- a private value would need to be printed;
- a real CRM write packet would be prepared without approval;
- a card, ledger, Fact Store, source-result, or scoring write is requested;
- source execution, API calls, DMs, MailerLite, Gmail, Instagram, outreach, or
  candidate queue generation is requested.

## Closed Gates

- no execution;
- no Instagram;
- no source UI;
- no APIs;
- no DM opening;
- no reply monitoring;
- no welcome audio send;
- no candidate queue generation;
- no MailerLite API/UI/mutation;
- no Gmail;
- no private artifact inspection;
- no CRM/source writes;
- no card writes;
- no Fact Store writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no source-result ledger writes;
- no scoring writes;
- no next-best-action execution;
- no outreach;
- no source mutation;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

Integrate
`docs/crm-vnext/instagram-crm-identity-enrichment-packet-boundary-v0.md` as a
lane-owned, no-run Controlled Welcome Flow Proof artifact. It defines the
future CRM identity/enrichment packet boundary that can connect controlled
Instagram evidence, approved reply/email handoff evidence, MailerLite no-write
payload preview status, private anchors, provenance, identity confidence,
suppression/safety, and existing CRM Core card/evidence/ledger/scoring layers
without creating a duplicate CRM architecture or authorizing any write.

## Next Safe Step

Relay this artifact to the Instagram API/source-readiness consultant for
artifact review.

If accepted and committed lane-locally, request Chief Architect Integration
Consultant review before any central integration.

## Completion Boundary

This design is complete when CRM Core has a lane-local no-run boundary for a
future CRM identity/enrichment packet that defines inputs, confidence,
provenance, suppression, MailerLite preview dependency, no-write schema,
redacted displays, private artifact rules, relationships to person cards,
source-result memory, Fact Store, Signal Event Ledger, Engagement Snapshot
Ledger, scoring, and next-best-action policy, plus future approval phrases,
stop conditions, and closed gates.

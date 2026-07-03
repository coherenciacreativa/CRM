# Instagram Welcome Audio Send Approval Packet Template v0

Date: 2026-07-02
Status: no-run CRM Core design

## Purpose

This lane-local no-run design defines the future approval packet template that
would be required before any bounded Instagram welcome audio send.

The template is a decision artifact only. It creates no real send approval
packet, no real candidate set, no real send authority, no private artifact, no
operational receipt, no source-system state, and no CRM/source state.

It does not inspect private artifacts, open DMs, send audio, perform Instagram
actions, call APIs, generate a candidate queue, or write CRM/source state.

## Relationship To Existing Welcome Audio Boundary

This packet template depends on the existing Welcome Audio send boundary and
the asset registry / already-welcomed history design:

- `docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`
- `docs/crm-vnext/instagram-welcome-audio-asset-registry-and-history-packet-v0.md`

Detection, source health, candidate existence, business eligibility, asset
registry presence, and absence of known prior welcome history do not grant send
permission.

A future send approval packet must bind together:

- exact candidate set label;
- exact candidate count;
- exact approved audio asset;
- final already-welcomed check;
- final send-history check;
- final duplicate/idempotency check;
- exact expected send count;
- blocker review;
- redacted receipt paths;
- explicit send approval phrase.

## Required Future Alejandro-Supplied Facts

Before any future send approval packet can be prepared, Alejandro must provide
or approve the following non-secret facts:

- `approval_packet_id`
- exact `candidate_set_label`
- `candidate_set_source_receipt_label`
- exact `candidate_count`
- exact `expected_send_count`
- exact approved `audio_asset_id`
- `approved_audio_asset_label`
- `audio_asset_version`
- `asset_registry_status`
- `asset_approval_receipt_label`
- `reviewer_approver_ref`
- `already_welcomed_history_artifact_label`
- `send_history_artifact_label`
- `final_already_welcomed_check`
- `final_send_history_check`
- `final_duplicate_idempotency_check`
- `blocker_counts`
- `redacted_receipt_destination_path`
- `private_send_artifact_label`
- `operator_approval_ref`
- `send_window_label`, if timing matters
- whether personalization is allowed, defaulting to `false`

The packet must not include handles, names, DMs, private anchors, subscriber
data, profile URLs, private URLs, audio binary, private message content, tokens,
secrets, headers, cookies, env values, or credentials.

## Packet Template

Future approval packets should use this shape:

```yaml
approval_packet_id:
packet_type: instagram_welcome_audio_send_approval
packet_version: v0
candidate_set_label:
candidate_set_source_receipt_label:
candidate_count:
expected_send_count:
audio_asset_id:
approved_audio_asset_label:
audio_asset_version:
asset_registry_status: approved_sendable
asset_approval_receipt_label:
reviewer_approver_ref:
operator_approval_ref:
personalization_allowed: false
already_welcomed_history_artifact_label:
send_history_artifact_label:
final_already_welcomed_check:
final_send_history_check:
final_duplicate_idempotency_check:
idempotency_key_strategy:
blocker_counts:
blocked_candidate_count:
allowed_send_candidate_count:
redacted_receipt_destination_path:
private_send_artifact_label:
closed_gates:
future_send_approval_phrase:
```

Allowed `final_already_welcomed_check` values:

- `passed`
- `blocked_unknown_history`
- `blocked_duplicate_risk`
- `blocked_identity_ambiguous`
- `blocked_safety_or_suppression`
- `not_run`

Allowed `final_send_history_check` values:

- `passed`
- `blocked_unknown_send_history`
- `blocked_prior_send_found`
- `blocked_status_ambiguous`
- `not_run`

Allowed `final_duplicate_idempotency_check` values:

- `passed`
- `blocked_duplicate_found`
- `blocked_unknown_idempotency`
- `blocked_candidate_mismatch`
- `not_run`

If any final check is not `passed`, the packet must be blocked and no send may
be approved.

## Approval Preconditions

A future send packet must be blocked unless all of these are true:

- candidate set is exact and approved for send review;
- candidate count equals expected send count;
- approved audio asset exists in the registry and has
  `asset_registry_status=approved_sendable`;
- approved audio asset is not retired, superseded without approved
  replacement, blocked, or ambiguous;
- reviewer/approver reference is present;
- operator approval reference is present, if separate from reviewer/approver
  reference;
- personalization is false unless separately approved;
- final already-welcomed check passes;
- final send-history check passes;
- final duplicate/idempotency check passes;
- private artifact path labels are outside the repo;
- redacted receipt paths are outside the repo;
- no blockers remain unresolved;
- exact future send approval phrase is present.

## Future Approval Phrase

The future approval phrase must be exact and packet-specific:

```text
I approve CRM Core to send the approved Instagram welcome audio asset <audio_asset_id> to the exact candidate set <candidate_set_label>, expected send count <expected_send_count>, after final already-welcomed, send-history, and duplicate/idempotency checks pass. Do not send to anyone outside this candidate set, do not change the audio asset, do not open unrelated DMs, do not use MailerLite or Gmail, do not write CRM state, and write only private send artifacts plus redacted receipts.
```

Any missing placeholder, mismatch, broader permission, or changed candidate
scope blocks the send.

## Private Artifact Behavior

Future send approval may reference private artifact path labels only. Private
artifacts must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts must never be committed, pasted into chat, copied into
Mantis-Reports, stored in tracked docs, or stored in general memory.

This design does not create, read, inspect, validate, or mutate any private
artifact.

## Redacted Receipt Behavior

Future redacted receipts must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Allowed receipt fields:

- packet id;
- candidate set label;
- expected send count;
- approved audio asset label/id;
- final check statuses;
- aggregate blocker counts;
- aggregate send eligibility count;
- closed gates;
- next safe operator step.

Forbidden receipt fields:

- handles;
- names;
- DMs;
- private anchors;
- audio binary;
- private message content;
- raw follower rows;
- profile URLs;
- private URLs;
- tokens;
- secrets;
- headers;
- cookies;
- env values;
- credentials.

## Stop Conditions

Stop and block the future send packet if:

- candidate set label is missing or ambiguous;
- candidate count does not match expected send count;
- audio asset approval is missing, retired, superseded, blocked, or ambiguous;
- final already-welcomed check is not passed;
- final duplicate/idempotency check is not passed;
- any candidate is identity-ambiguous;
- any candidate is safety-blocked;
- private artifact path is inside the repo;
- receipt path is inside the repo;
- approval phrase is missing or not exact;
- an action would require opening unrelated DMs;
- any API, UI, Instagram action, MailerLite/Gmail access, CRM write, or source
  mutation is implied before explicit approval.

## Closed Gates

This design preserves these closed gates:

- no execution;
- no API calls;
- no UI, Computer Use, or `@Chrome`;
- no Instagram;
- no DMs;
- no welcome audio send;
- no candidate queue generation;
- no MailerLite;
- no Gmail;
- no private artifact inspection;
- no CRM writes;
- no scoring, ledgers, cards, Fact Store, outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

Welcome Audio lane now has a no-run future send approval packet template. It
defines the exact candidate-set, approved-audio, final dedupe, expected-count,
blocker, receipt, and approval-phrase requirements that must exist before any
future Instagram welcome audio send can be considered. No send, DM opening,
candidate queue generation, source action, private artifact inspection, or CRM
write is authorized.

## Next Safe Step

Relay this packet template to the Welcome Audio consultant for review. If the
consultant returns green, commit lane-locally only. Central integration remains
separate and unapproved.

## Completion Boundary

This task is complete when the lane has a reviewed no-run send approval packet
template that can be integrated later into the central CRM Core plan without
opening any execution gate.

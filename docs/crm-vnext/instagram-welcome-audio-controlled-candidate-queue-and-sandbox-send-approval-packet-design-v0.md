# Instagram Welcome Audio Controlled Candidate Queue And Sandbox Send Approval Packet Design v0

Date: 2026-07-05
Status: no-run lane-local design
Task id: crm_core_welcome_audio_controlled_candidate_queue_and_sandbox_send_approval_packet_design_v0

## Purpose

Define the no-run boundary between approved private new-follower evidence and a
future controlled welcome-audio sandbox send.

This design does not generate a candidate queue, create a send approval packet,
open DMs, send welcome audio, inspect private artifacts, call APIs, perform
Instagram actions, or write CRM/source state.

## Relationship To Controlled Welcome Flow Proof

The Controlled Welcome Flow Proof needs a narrow path from evidence to action:

1. controlled new-follower evidence;
2. controlled candidate queue boundary;
3. final already-welcomed / duplicate check;
4. approved audio asset boundary;
5. sandbox send approval packet;
6. reply monitoring and email handoff as separate future boundaries.

This artifact covers steps 2 through 5 as design only. It does not mark
candidate queue generation or sandbox send execution complete.

## Relationship To Controlled New-Follower Evidence

The controlled new-follower evidence packet is the upstream source of candidate
evidence. A future candidate queue may use only an approved private evidence
packet that has already passed its own privacy, storage, and source-read gates.

Evidence approval does not authorize queue generation. Queue generation requires
a separate future approval phrase.

## Relationship To Welcome Audio Sandbox Send Strategy

The sandbox send strategy defines how a future controlled send could be tested.
This artifact supplies the missing bridge:

- approved private evidence becomes a private candidate queue only after
  approval;
- the queue remains separate from send approval;
- the send approval packet names the candidate set, audio asset, final dedupe
  check, stop conditions, and closed gates.

## Controlling Artifacts To Reference Only

Codex may reference these artifacts for context, but must not modify them unless
separately approved:

- `docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`
- `docs/crm-vnext/instagram-welcome-audio-asset-registry-and-history-packet-v0.md`
- `docs/crm-vnext/instagram-welcome-audio-send-approval-packet-template-v0.md`
- `docs/crm-vnext/instagram-welcome-audio-sandbox-send-strategy-design-v0.md`
- `docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`

## No-Run Status

This is a no-run design artifact.

It must not create:

- a real candidate queue;
- a real candidate set;
- a real candidate;
- a real approval packet;
- a real asset approval;
- a real receipt;
- a real private artifact;
- a real already-welcomed/send-history result;
- real send state;
- CRM/source state.

## Controlled Candidate Queue Boundary

A future candidate queue is a private local artifact that may list candidate
anchors and candidate metadata needed for one bounded sandbox-send decision.

The queue must be generated only after:

- Alejandro approves candidate queue generation with the exact future phrase;
- the input evidence packet is explicitly named;
- the source of evidence is already approved;
- the queue output path is outside the repo;
- redacted receipts are limited to aggregate counts and gates;
- candidate queue generation remains separate from send approval.

Candidate queue generation does not authorize DM opening, welcome audio send,
reply monitoring, MailerLite onboarding, CRM writes, or source mutation.

## Candidate Queue Input Requirements

A future candidate queue may use only:

- an approved private new-follower evidence packet;
- private follower anchors already collected under an approved boundary;
- an approved candidate set label;
- an approved test-account/sandbox label;
- an approved audio asset label or registry reference;
- current closed-gate status;
- private already-welcomed/send-history references under a separately approved
  route.

The queue must reject:

- raw follower rows copied into chat;
- public or tracked-doc identities;
- unapproved private artifacts;
- unverified manual claims;
- source-health-only receipts with no candidate evidence;
- any evidence requiring fresh Instagram, DM, MailerLite, Gmail, or API access
  in the queue-generation step.

## Private Artifact Model

Future private candidate queue artifacts, private follower anchors,
already-welcomed history, and send-history references must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Those artifacts must never be committed, pasted into chat, copied to
CRM-Core-Reports, copied to Mantis-Reports, stored in tracked docs, or stored in
Mantis/general memory.

Future CRM Core development-private registries belong under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/
```

This task does not create any private artifact or operational state.

## Redacted Receipt Model

Future CRM Core development telemetry or consultant-relay receipts belong under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/
```

Future source/operator receipts may use:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

only under a future source/operator approval.

Redacted queue/send-boundary receipts may include:

- queue label;
- evidence packet label;
- total candidate count;
- counts by eligibility status;
- counts by blocker;
- candidate set label;
- audio asset label;
- already-welcomed/send-history check status;
- closed gates;
- next safe operator step.

Receipts must not include handles, names, DMs, private anchors, audio binary,
private message content, raw follower rows, profile URLs, private URLs, tokens,
secrets, headers, cookies, env values, credentials, or raw private artifact
contents.

This task does not create directories, receipts, private artifacts, or
operational state.

## Test Account And Candidate Set Labeling

A future sandbox send approval packet must name:

- `candidate_set_label`;
- `evidence_packet_label`;
- `test_account_label`;
- `approved_audio_asset_label`;
- `sandbox_send_scope`;
- `final_dedupe_check_label`;
- `operator_owner`.

The label may describe purpose and scope, but must not expose private handles,
names, DMs, or follower anchors in chat or tracked docs.

## Business Eligibility Carry-Forward

Every confirmed new Instagram follower is business-eligible.

Business eligibility, new-follower detection, approved private evidence,
candidate queue eligibility, source health, story views, MailerLite/Gmail
warmth, asset registry presence, and absence of known prior welcome do not grant
send permission.

Send permission requires a separate future sandbox-send approval packet and a
final fail-closed duplicate check.

## Already-Welcomed / Send-History Final Check

Absence from already-welcomed or send-history artifacts is not proof of send
safety unless checked under a future approved private route with:

- the exact candidate set;
- the exact approved asset;
- the bounded send approval packet;
- the current private already-welcomed/send-history references;
- final fail-closed dedupe immediately before send.

If the already-welcomed or send-history check is unavailable, stale, ambiguous,
or cannot be verified without exposing identities, the future send must stop.

## Approved Audio Asset Boundary

A future sandbox send approval packet must name an approved audio asset label or
asset registry reference.

An asset is not approved merely because it exists locally. Approval requires a
future boundary that records:

- asset label;
- asset source;
- intended send context;
- generic versus personalized status;
- reuse policy;
- stop conditions;
- redacted receipt behavior.

This design does not approve any audio asset.

## Sandbox Send Approval Packet Requirements

A future sandbox send approval packet must include:

- explicit send scope;
- candidate set label;
- candidate count;
- approved audio asset label;
- test account or sandbox account label;
- final already-welcomed/send-history check requirement;
- final fail-closed duplicate check requirement;
- operator confirmation that the send is approved;
- stop conditions;
- closed gates that remain closed after send;
- reply monitoring boundary;
- MailerLite boundary;
- CRM write boundary;
- redacted receipt path.

The send approval packet must not include private identities, raw private
artifacts, DMs, private URLs, tokens, credentials, or source data.

## Future Approval Phrase Templates

### Candidate Queue Generation From Approved Private Evidence

```text
I approve one CRM Core Instagram welcome-audio candidate queue generation from the approved private new-follower evidence packet only. Write the private queue only under the approved Instagram private artifact folder, write redacted aggregate receipts only, do not open DMs, do not send welcome audio, do not perform Instagram actions, and do not write CRM/source state.
```

### Sandbox Send Approval

```text
I approve one CRM Core Instagram welcome-audio sandbox send for the approved candidate set and approved audio asset only, after a final fail-closed already-welcomed/send-history check. Do not expand the candidate set, do not send to anyone outside the approved set, write redacted receipts only, and do not write CRM/source state.
```

### Final Dedupe / Already-Welcomed Check

```text
I approve one CRM Core final already-welcomed and send-history check for the approved welcome-audio sandbox candidate set only. Use only approved private history artifacts, do not print identities, fail closed on ambiguity, do not open DMs, do not send welcome audio, and do not write CRM/source state.
```

### Reply Monitoring Separately

```text
I approve one CRM Core Instagram welcome-audio reply monitoring boundary design or run only as separately specified. Do not send welcome audio, do not open unrelated DMs, do not extract email handoff data into chat, and do not write CRM/source state unless separately approved.
```

Candidate queue generation and sandbox send approval are separate future
approval phrases. Approval of one does not authorize the other.

## Stop Conditions

Stop if:

- requested action would open DMs without approval;
- requested action would send welcome audio without approval;
- requested action would generate a candidate queue without approval;
- private identities would need to be printed;
- already-welcomed/send-history data is missing, stale, or ambiguous;
- the candidate set is not exact;
- the audio asset is not approved;
- source-health evidence is mistaken for candidate evidence;
- Instagram, API, MailerLite, Gmail, or CRM writes would be required;
- private artifact storage path is not approved;
- redacted receipt rules cannot be met;
- any source or outbound action becomes ambiguous.

## Closed Gates

- no execution;
- no source UI;
- no Instagram;
- no APIs;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DM opening;
- no welcome audio send;
- no candidate queue generation;
- no private artifact inspection;
- no MailerLite;
- no Gmail;
- no CRM/source writes;
- no ledgers;
- no cards;
- no Fact Store;
- no scoring;
- no outreach;
- no source mutation;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Reply Monitoring Separation

Reply monitoring begins only after a separate future approval. A send approval
packet does not authorize reply monitoring, DM reading, email extraction, or
message content processing.

## Email Handoff Separation

Email handoff requires separate approval and a private review boundary. A reply
containing email-like evidence must not be moved into MailerLite, CRM cards, or
chat without a future approved route.

## MailerLite Separation

MailerLite onboarding remains a separate no-write or write-gated lane. Candidate
queue generation and welcome-audio send approval do not authorize MailerLite
API calls, UI use, subscriber mutations, group changes, automation enrollment,
or source-result ledger writes.

## CRM Card Enrichment Separation

CRM enrichment requires a separate write packet. Candidate queues, send approval,
reply monitoring, or MailerLite readiness do not authorize CRM card writes,
Fact Store writes, Signal Event Ledger writes, Engagement Snapshot Ledger
writes, scoring writes, or source-result ledger writes.

## Mantis / Operator Boundary

Mantis may later operate approved CRM Core protocols or read redacted operator
briefs. Mantis must not store candidate queue entries, private identities,
target URLs, relay transcripts, raw private artifacts, DMs, or CRM development
history in general memory.

CRM Core development telemetry belongs in CRM-Core-Reports. Source/operator
receipts may use Mantis-Reports only when a future source/operator boundary
explicitly approves that path.

## Proposed Integration Note

Welcome Audio lane produced a no-run Controlled Candidate Queue And Sandbox Send
Approval Packet Design for the Controlled Welcome Flow Proof. The artifact
connects approved private new-follower evidence to a private candidate queue
boundary, final already-welcomed/send-history check, approved audio asset
boundary, and sandbox send approval packet boundary without generating a queue,
opening DMs, sending audio, using source systems, inspecting private artifacts,
or writing CRM/source state.

## Next Safe Step

Ask the Welcome Audio consultant to review this artifact. If green, commit the
lane-local doc and workstream update. Candidate queue generation, final dedupe
checks, and sandbox send approval remain future separately approved actions.

## Completion Boundary

Complete when CRM Core has a no-run design that explains how approved private
new-follower evidence can later become a controlled candidate queue and sandbox
send approval packet while preserving all source, privacy, duplicate-prevention,
storage, Mantis/operator, MailerLite, and CRM write gates.

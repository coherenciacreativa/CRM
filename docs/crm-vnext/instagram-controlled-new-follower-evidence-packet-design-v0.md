# Instagram Controlled New-Follower Evidence Packet Design v0

Date: 2026-07-05
Status: no-run CRM Core lane design

## Purpose

Define the future evidence packet boundary for proving that an
Alejandro-owned or controlled test Instagram account followed the intended
Instagram account.

This design is lane-local, no-run, and docs-only. It does not execute
Instagram, inspect private artifacts, open DMs, generate a candidate queue, send
welcome audio, call APIs, use MailerLite or Gmail, write CRM/source state, touch
Launch OS, write Mantis memory, inspect OpenClaw/Mantis workspace content, or
use `/Users/alejandrogomez/CRM`.

## Relationship To Controlled Welcome Flow Proof Plan

This design supports Track A from:

- `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`

It prepares the first proof input for the controlled welcome flow:

```text
controlled new-follower evidence
-> approved welcome audio asset
-> already-welcomed / duplicate check
-> sandbox send approval
-> reply/email handoff boundary
-> MailerLite onboarding preview path
-> CRM card enrichment packet boundary
-> operator/receipt surface
```

The evidence packet proves only source/evidence readiness for a controlled test
follow. It does not authorize candidate queue generation, DM opening, welcome
audio sending, reply monitoring, MailerLite onboarding, CRM card enrichment,
ledgers, Fact Store writes, scoring, outreach, or source mutation.

## Relationship To Welcome Audio Sandbox Send Strategy

The prior welcome-audio sandbox send strategy requires a controlled candidate
set and exact send approval before any future audio send can be considered.

This design supplies the upstream evidence packet model that a later controlled
candidate set may depend on. Evidence alone is not a candidate queue and is not
send permission.

Use this separation:

- controlled follow evidence = possible proof input;
- candidate queue = separate future approval boundary;
- approved audio asset = separate future approval boundary;
- send approval packet = separate future approval boundary;
- final duplicate/idempotency check = mandatory future pre-send gate.

## Evidence Packet Scope

The future evidence packet should answer one narrow question:

Did a labeled, Alejandro-owned or controlled test account follow the intended
Instagram account under an approved evidence route?

The packet may record only redacted labels and aggregate/source-health facts in
standard receipts. Person-level handles, private anchors, screenshots, raw
source data, DMs, private URLs, tokens, cookies, headers, env values,
credentials, and private content must remain out of chat, tracked docs, and
standard receipts.

## Current Non-Execution Status

This artifact does not collect the future facts.

It does not create:

- a test account record;
- a follower source artifact;
- a candidate queue;
- a welcome-audio candidate set;
- a welcome/send history artifact;
- a MailerLite payload;
- a CRM write packet;
- a source ledger event;
- a Mantis memory entry.

Consultant UI relay used to review this design is development process only. It
is not Instagram source access and not source execution.

## Future Alejandro-Provided Facts

The following future facts are required before any controlled evidence packet
can be produced. They are not collected, inferred, searched for, or validated in
this design task.

Suggested fields:

```yaml
evidence_packet_id:
test_account_label:
test_account_control_status: alejandro_owned_or_controlled | unknown
intended_account_label:
intended_account_confirmed: true | false | unknown
evidence_route: manual_evidence | notifications_route | bounded_follower_source | api_webhook_source_health
evidence_window_label:
follow_timing_label:
source_receipt_label:
private_artifact_label:
redacted_receipt_label:
new_follower_claim_basis:
newly_seen_claim_basis:
identity_confidence: controlled_label_only | private_anchor_present | ambiguous | unknown
candidate_queue_authorized: false
welcome_audio_authorized: false
crm_write_authorized: false
```

Missing, ambiguous, stale, path-nonconforming, or conflicting future facts block
the evidence packet.

## Test Account And Intended Account Labels

Future materials should use redacted labels, not public handles, names, emails,
or private identity values.

Suggested labels:

- `test_account_label`: label for the Alejandro-owned or controlled test
  account.
- `test_account_control_status`: whether Alejandro confirms control.
- `intended_account_label`: label for the intended CRM Core Instagram account.
- `intended_account_confirmed`: whether the intended account was confirmed under
  the approved route.

Rules:

- no raw handles in tracked docs;
- no handles in chat unless separately approved;
- no private anchors in chat;
- no private identity values in standard receipts;
- no candidate queue from labels alone;
- no send from labels alone.

## Manual Evidence Route

Manual evidence is the fastest controlled proof route when Alejandro can provide
a compact, approved, non-secret evidence packet.

Future manual evidence may include:

- redacted test account label;
- intended account label;
- source/timing label;
- private artifact path label if person-level evidence is involved;
- redacted receipt label;
- confirmation that raw evidence remains outside chat and outside the repo.

Manual evidence must not include raw handles, screenshots, DMs, private message
content, private URLs, tokens, cookies, headers, env values, credentials, or
private dashboard content in chat or tracked docs.

## Notifications Route

The notifications route may be used later only under a separate exact approval
for a controlled evidence check.

Future notifications evidence should record:

- source surface label;
- source-health state;
- visible new-follower group count;
- whether a controlled test follower group was visible;
- private anchor count, if any, stored only in private artifacts;
- blocker classes;
- read-state ambiguity status;
- redacted receipt path label.

The notifications route must not click notification items, open follower
profiles, open DMs, collect unrelated private content, send welcome audio, or
perform Instagram actions.

## Bounded Follower-Source Route

The bounded follower-source route may be used later only if exact approval
allows a small private follower-source baseline or controlled check.

Future follower-source evidence should:

- use the approved bounded route only;
- capture only the approved visible window or approved cap;
- store private anchors only in private source artifacts;
- report only aggregate counts and path labels in receipts;
- distinguish `newly_seen` from `new_follower`;
- avoid follower profile opening;
- avoid scrolling/full-list traversal unless separately approved.

Follower-source visibility alone does not prove a new follow. It may establish
that an anchor was newly seen relative to a prior private baseline, but a
new-follower claim requires route-specific timing evidence or approved manual
evidence.

## API/Webhook Route

The API/webhook route remains future source-health only unless a later approved
setup/evidence packet proves otherwise.

Official docs reviewed for this lane did not show a new-follower webhook,
per-new-follower identity stream, or CRM-usable follower-delta source for
candidate generation. Aggregate analytics or insights, if available, must not
be treated as new-follower webhook support, follower identity access, or a
candidate-generation source unless separately verified and approved.

Messaging, replies, and webhooks may be plausible for eligible professional
accounts, but they remain setup-dependent and unapproved. Audio or attachment
send feasibility is not authorization for welcome audio or live DM execution.

## Private Artifact Model

Future private source artifacts for controlled follower evidence must live
outside the repo.

For source/operator evidence, use only:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

For consultant relay development target registry only, use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/
```

Private artifacts may contain person-level anchors only under an exact future
approval boundary. They must never be committed, pasted into chat, written into
tracked docs, stored in Mantis general memory, or copied into standard receipts.

## Redacted Receipt Model

Future source/operator receipts should live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Consultant relay development receipts should live only under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Redacted receipts may include:

- evidence packet ID;
- evidence route;
- source-health state;
- aggregate counts;
- blocker classes;
- path labels only;
- confirmation that private artifacts stayed private;
- confirmation that candidate queue, welcome audio, CRM writes, and source
  mutations stayed closed;
- recommended next safe step.

Redacted receipts must not include raw handles, names, emails, DMs, screenshots,
private anchors, private URLs, tokens, cookies, headers, env values,
credentials, message bodies, raw source rows, raw private artifacts, or private
content.

## New-Follower Vs Newly-Seen

CRM Core must keep these terms separate.

- `new_follower`: route-specific evidence says the controlled account followed
  during the approved proof window.
- `newly_seen`: CRM Core observed a private follower anchor that was not present
  in an approved prior private baseline.
- `source_health_only`: the route was reachable, but no candidate-producing
  follower evidence was captured.
- `identity_ambiguous`: evidence exists but cannot be safely tied to the
  controlled test label.

`newly_seen` is not enough for welcome audio send. It may support a future
review packet only.

## Candidate Queue Dependency And Closed Gate

Candidate queue generation remains closed.

A future controlled evidence packet may become an input to a later candidate
queue design or generation approval, but this artifact does not create,
populate, inspect, or approve a queue.

Candidate queue generation requires a separate future approval phrase and must
include already-welcomed, send-history, identity, blocker, and idempotency
controls.

## Welcome Audio Dependency And Closed Gate

Welcome audio send remains closed.

A controlled evidence packet does not authorize:

- DM opening;
- audio asset access;
- audio upload;
- welcome audio send;
- text welcome send;
- reply monitoring;
- Instagram action;
- outreach.

Future send requires the approved welcome-audio send boundary, an approved
candidate set, approved audio asset, final duplicate checks, and exact send
approval.

## Reply And Email Handoff Separation

Reply monitoring and email handoff remain separate future lanes.

Controlled follow evidence does not authorize reading DMs, opening threads,
monitoring replies, collecting message bodies, extracting emails, or writing CRM
state.

If a future controlled test account replies with contact details, that evidence
requires a separate private review and redacted receipt boundary.

## MailerLite Separation

MailerLite onboarding remains a downstream no-write design/preview lane.

This evidence packet does not authorize:

- MailerLite API calls;
- MailerLite UI access;
- subscriber upsert;
- group assignment;
- field mutation;
- automation enrollment;
- campaign sends;
- Gmail access.

MailerLite may become relevant only after a future approved email handoff or
onboarding payload preview boundary.

## CRM Card Enrichment Separation

CRM card enrichment remains a separate write-packet boundary.

Controlled follower evidence does not authorize:

- card writes;
- Signal Event Ledger writes;
- Engagement Snapshot Ledger writes;
- source-result ledger writes;
- Fact Store writes;
- scoring writes;
- outreach writes.

A future CRM card enrichment packet must be no-write until explicitly approved
for application.

## Future Approval Phrase Templates

### Manual Evidence Packet

```text
I approve one CRM Core controlled new-follower manual evidence packet for the Controlled Welcome Flow Proof. I will provide only redacted labels and non-secret evidence fields; do not ask for or record raw handles, private screenshots, DMs, tokens, cookies, headers, env values, credentials, or private content. Do not generate a candidate queue, send welcome audio, call APIs, open Instagram, or write CRM/source state.
```

### Notifications Evidence Check

```text
I approve one CRM Core controlled new-follower notifications evidence check only. Use the approved read-only notifications route, write private anchors only to the private Instagram artifact folder if visible, write redacted aggregate receipts, do not click notification items, open follower profiles, open DMs, send welcome audio, perform Instagram actions, generate a candidate queue, or write CRM/source state.
```

### Bounded Follower-Source Evidence Check

```text
I approve one CRM Core controlled new-follower bounded follower-source evidence check only. Use the approved bounded follower-source route with the stated cap, write private anchors only to the private Instagram artifact folder, write redacted aggregate receipts, do not open follower profiles, scroll beyond the approved cap, open DMs, send welcome audio, perform Instagram actions, generate a candidate queue, or write CRM/source state.
```

### API/Webhook Source-Health Check

```text
I approve one CRM Core Meta/Instagram API/webhook source-health check only, with no secrets printed or stored in tracked docs. Use only approved no-secret setup facts and approved secret-handling paths, do not request or print tokens, app secrets, webhook secrets, cookies, headers, env values, credentials, authorization codes, or access tokens, do not configure apps, create webhooks, open DMs, send welcome audio, generate a candidate queue, or write CRM/source state.
```

### Candidate Queue Generation

```text
I approve CRM Core to design, but not execute, a controlled welcome-audio candidate queue from the approved controlled new-follower evidence packet. Do not open Instagram, DMs, MailerLite, or Gmail, do not send welcome audio, do not perform source actions, and do not write CRM/source state.
```

This final template is design-only. Queue generation itself remains unapproved.

## Stop Conditions

Stop before future execution if:

- approval phrase is missing or modified;
- test account control is unknown;
- intended account confirmation is unknown;
- source route is unavailable;
- source-health state is blocked or ambiguous;
- private artifact path is outside the approved folder;
- redacted receipt path is outside the approved folder;
- evidence requires raw handles or private content in chat;
- route requires opening follower profiles without approval;
- route requires opening DMs;
- route requires welcome audio send;
- route requires candidate queue generation;
- route requires API calls without an approved API boundary;
- route requires app configuration or webhook setup;
- duplicate/already-welcomed state is needed but missing;
- any CRM/source write would occur.

## Closed Gates

- no execution;
- no source UI;
- no Instagram;
- no API calls;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DM opening;
- no welcome audio send;
- no candidate queue generation;
- no MailerLite;
- no Gmail;
- no private artifact inspection;
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

## Proposed Integration Note

Integrate
`docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`
as a lane-owned, no-run Instagram API/source-readiness artifact for the
Controlled Welcome Flow Proof. The artifact defines the future controlled
new-follower evidence packet boundary, separates manual, notifications,
bounded follower-source, and API/webhook source-health routes, and keeps
candidate queue generation, welcome audio send, reply monitoring, MailerLite
onboarding, CRM card enrichment, ledgers, Fact Store, scoring, source actions,
Launch OS, Mantis memory, and `/Users/alejandrogomez/CRM` closed.

## Next Safe Step

Relay this artifact to the Instagram API/source-readiness consultant for
selected-task review.

If the artifact is accepted and committed lane-locally, the next central
decision should be whether to integrate this evidence-packet design into the
Controlled Welcome Flow Proof planning surface.

## Completion Boundary

This design is complete when CRM Core has a lane-local, no-run controlled
new-follower evidence packet design that names future facts, evidence routes,
approval phrases, receipt behavior, private artifact behavior, stop conditions,
and closed gates without collecting evidence or executing any source action.

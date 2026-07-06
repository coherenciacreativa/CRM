# Instagram Welcome Audio Assistant Reply Policy Boundary Design v0

Date: 2026-07-06
Status: no-run, design-only, lane-local artifact

## Purpose

Define the future assistant reply policy boundary after an approved controlled
welcome audio flow. This artifact explains what a future Mantis, Mati, or
approved assistant identity may say, what it must never imply, and which
approval gates must remain separate before any draft preview, reply send,
reply monitoring, MailerLite action, CRM enrichment, or CRM/source write.

This artifact does not open Instagram, inspect DMs, inspect private artifacts,
draft a real reply, send a reply, send welcome audio, call APIs, use
MailerLite, use Gmail, generate a candidate queue, or write CRM/source state.

## Relationship To First Controlled Welcome Audio Send Result

The first controlled welcome audio send result proves that CRM Core can send
one approved welcome audio to one controlled candidate under exact approval and
record redacted receipts without exposing private identities.

That result does not authorize any assistant reply. A confirmed welcome audio
send is only prior context for a future assistant reply policy. It is not
permission to continue a conversation, open unrelated DMs, send follow-up
messages, enroll anyone in MailerLite, or update CRM state.

## Relationship To First Controlled Reply And Email Handoff Result

The first controlled reply and email handoff result proves that CRM Core can
observe one approved controlled reply route, classify a private email handoff
candidate, and keep private values outside tracked docs and chat.

That result does not authorize assistant replies. Future assistant replies may
use only an explicitly approved draft-preview packet. They must not reference
old message history, private evidence details, raw contact values, or any
private thread context unless that exact context is separately approved for the
future draft preview.

## Relationship To MailerLite No-Write Payload Preview Result

The MailerLite no-write payload preview result proves that approved private
email handoff evidence can be converted into a private no-write onboarding
payload preview without calling MailerLite or mutating subscribers.

That result does not prove MailerLite mutation readiness. Future assistant
replies must not claim that a person was enrolled, added to a group, placed in
an automation, subscribed, or added to a newsletter until a later MailerLite
mutation is explicitly approved and completed.

## Relationship To Reply Monitoring Boundary

The reply monitoring and email handoff boundary defines how a future approved
route may observe replies and classify handoff evidence. Assistant reply policy
is downstream from that boundary and remains separate.

Reply monitoring approval does not authorize assistant reply drafting or
sending. Assistant reply drafting approval does not authorize reply monitoring.
Each future action requires its own exact approval phrase and packet-specific
scope.

## Relationship To CRM Identity Enrichment Boundary

The CRM identity enrichment boundary defines a future no-write packet that may
summarize approved evidence for possible CRM card enrichment. Assistant replies
must not claim CRM state has been updated, an identity has been stitched, a
person record has changed, a card has been enriched, or an operator has taken a
CRM action unless a separate CRM write packet is explicitly approved and
applied.

## Assistant Identity Disclosure Rule

Future assistant replies must identify as one of:

- Alejandro's assistant;
- Mantis;
- Mati;
- another assistant identity explicitly approved for the specific reply.

The assistant identity must be clear enough that the recipient does not believe
the reply is personally written by Alejandro unless Alejandro separately
approves exact text for that specific case.

## Mantis And Mati Name And Signature Policy

Mantis or Mati may sign only as an assistant identity. A future reply may use a
short signature such as:

```text
Mantis, assistant to Alejandro
```

or:

```text
Mati, assistant to Alejandro
```

Any different signature, tone, language, or identity label requires separate
approval. The assistant must not create a real assistant persona deployment,
assistant identity registration, or standing signature state from this design.

## Assistant Must Not Pretend To Be Alejandro

Future replies must not:

- say or imply "I am Alejandro";
- write as if Alejandro personally read the message;
- write as if Alejandro personally replied;
- promise Alejandro will do something;
- imply Alejandro approved a claim unless the exact claim is approved;
- use old private thread context as if Alejandro had reviewed it.

The only exception is an exact-message approval for one specific case, where
Alejandro provides or approves the text and recipient boundary.

## Allowed Reply Classes

Future approved assistant replies may be limited to safe classes such as:

- brief acknowledgment;
- thank you;
- receipt confirmation;
- "I will pass this along to Alejandro";
- "Alejandro's assistant is helping organize replies";
- "If the later onboarding step is approved and succeeds, you may receive
  articles or newsletter updates";
- request for missing email, city, or country only if that data request is
  separately approved;
- routing to human review for anything personal, sensitive, ambiguous, complex,
  or high stakes.

Allowed reply classes are not self-executing. A future draft preview must still
be approved before any real reply text is generated from private evidence.

## Forbidden Reply Classes

Future assistant replies must not include:

- Alejandro impersonation;
- emotional, therapeutic, medical, legal, financial, or safety advice;
- promises on Alejandro's behalf;
- sales pressure;
- spiritual or personal claims not explicitly approved;
- collection of sensitive data beyond approved fields;
- unapproved links;
- claims that MailerLite enrollment happened before mutation;
- claims that CRM state was written before CRM write approval;
- references to old private thread history;
- references to private evidence not approved for the reply;
- raw email, handle, phone, location, or contact values;
- old private context from unrelated conversations;
- private MailerLite payload contents;
- group, automation, or subscriber status claims before setup inventory,
  verification, mutation approval, and completion.

## Human Escalation Classes

Future assistant policy must route to Alejandro or another approved human
operator when:

- the person asks for advice;
- the reply contains sensitive personal content;
- the person asks for a direct answer from Alejandro;
- identity is ambiguous;
- consent or communication preference is unclear;
- the person appears upset, confused, or vulnerable;
- the message asks for a business commitment;
- the message asks for unsubscribe, suppression, privacy, or data handling;
- the assistant cannot answer without private evidence beyond the approved
  packet.

## Safety And Escalation Examples

Safe acknowledgment class:

```text
Thanks for replying. I am Alejandro's assistant and will pass this along.
```

Safe handoff class, only if email handoff handling is separately approved:

```text
Thanks. I received your contact detail and will route it for review.
```

Escalation class:

```text
Thanks for sharing this. I am going to leave this for Alejandro or a human
operator to review directly.
```

The examples are policy examples only. They are not approved real replies and
must not be sent without a future send approval.

## Conversation State Model

Future assistant reply design may use non-CRM planning states such as:

- `no_reply_drafted`;
- `draft_preview_requested`;
- `draft_preview_prepared_redacted`;
- `human_escalation_required`;
- `reply_send_awaiting_approval`;
- `one_reply_sent`;
- `conversation_closed_by_policy`;
- `blocked_by_private_content_boundary`;
- `blocked_by_missing_approval`;
- `blocked_by_identity_ambiguity`;
- `blocked_by_mailerlite_or_crm_claim`.

These are policy states only. This artifact creates no real conversation state,
cadence schedule, closure state, escalation ticket, reply draft, send approval,
source-result state, CRM state, or operator memory.

## Reply Cadence And Closure Model

Future reply cadence must be minimal:

- one approved reply at a time;
- no recurring follow-up loop;
- no standing assistant conversation;
- no automatic reply chain;
- no old-history reading to infer context;
- close or escalate when uncertainty appears.

A future close/stop action requires its own approval boundary. Closing a
conversation in policy does not mutate Instagram, CRM, MailerLite, ledgers,
cards, Fact Store, scoring, or source-result ledgers.

## Source And Private Content Handling

Future assistant reply drafting may use private evidence only when a later
approval names the exact evidence packet and scope. Private evidence must remain
outside tracked docs and chat.

The reply policy must not print, paste, summarize, or commit:

- handles;
- names;
- emails;
- DMs;
- message bodies;
- private anchors;
- MailerLite payload values;
- CRM private state;
- source rows;
- screenshots;
- private URLs;
- tokens, cookies, headers, env values, credentials, or secrets.

## Private Evidence Dependency

Any future assistant reply draft preview must name the approved evidence class,
such as:

- approved controlled reply evidence label;
- approved email handoff evidence label;
- approved MailerLite no-write preview status label;
- approved CRM enrichment preview label.

If the evidence is missing, stale, ambiguous, or not explicitly approved for
reply drafting, the assistant must stop.

## No Old-History Reading Rule

Future assistant replies must not read old Instagram message history, old
private ChatGPT history, old Gmail messages, old MailerLite subscriber rows, or
old CRM private state to enrich a reply unless a future approval explicitly
names that source and boundary.

The assistant must not infer relationship context from old private messages.

## No Real Reply Drafting From Private Content

This artifact does not draft a real reply. It does not create:

- a real assistant reply draft;
- a real draft preview packet;
- a real send approval packet;
- a real human escalation ticket;
- a real MailerLite preview artifact;
- a real CRM enrichment preview artifact;
- a real assistant identity registration;
- a real assistant persona deployment.

## Future Draft Preview Boundary

A future draft preview may be prepared only after a separate exact approval. It
must use a redacted or explicitly approved private evidence packet and return
only the approved draft-preview surface. It must not send a reply, open new DMs,
call APIs, use MailerLite, write CRM/source state, or expose private values.

## Future One-Reply Send Boundary

A future one-reply send requires a separate exact approval after the draft is
reviewed. The send packet must include:

- approved recipient/candidate label;
- approved assistant identity;
- approved exact text or approved draft id;
- final duplicate and closure checks;
- stop conditions;
- redacted receipt path;
- confirmation that no other action is bundled.

One-reply send approval does not authorize welcome audio, reply monitoring,
MailerLite mutation, CRM enrichment, CRM writes, or ongoing assistant chat.

## Future Exact Approval Phrase Templates

### Assistant Reply Policy Design

```text
I approve CRM Core to design, but not execute, an assistant reply policy for controlled Instagram replies. Do not open DMs, do not send replies, do not inspect private artifacts, do not call APIs, and do not write CRM/source state.
```

### Controlled Assistant Reply Draft Preview

```text
I approve one CRM Core assistant reply draft preview from the explicitly approved controlled private evidence packet only. Use the approved assistant identity, do not open DMs, do not send the reply, do not print private values, do not call MailerLite or Gmail, and do not write CRM/source state.
```

### One Controlled Assistant Reply Send

```text
I approve one CRM Core controlled assistant reply send using the approved draft and approved assistant identity only. Send exactly one reply to the approved controlled candidate label, do not send welcome audio, do not open unrelated DMs, do not call MailerLite or Gmail, do not perform other Instagram actions, and do not write CRM/source state.
```

### Human Escalation

```text
I approve CRM Core to mark this controlled reply as human-escalation-required in a redacted receipt only. Do not send a reply, do not open additional DMs, do not call APIs, do not write CRM/source state, and do not print private content.
```

### Stop Or Close Conversation

```text
I approve CRM Core to close the assistant-reply planning state for this controlled conversation in a redacted receipt only. Do not mutate Instagram, do not send a reply, do not call APIs, and do not write CRM/source state.
```

### CRM Enrichment Preview

```text
I approve CRM Core to prepare one no-write CRM identity/enrichment packet preview from the explicitly approved controlled welcome-flow evidence only. Do not write cards, ledgers, Fact Store, scoring, source-result ledgers, or CRM/source state, do not call Instagram, MailerLite, Gmail, or Meta APIs, and do not print private identities in chat.
```

### MailerLite No-Write Preview

```text
I approve CRM Core to prepare one MailerLite no-write onboarding payload preview from the explicitly approved controlled private evidence packet only. Do not call MailerLite APIs, do not use MailerLite UI, do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings, do not print private identities, and do not write CRM/source state.
```

## Storage And Reference Policy

Repo durable docs for this task:

- this design artifact;
- the lane workstream status update.

CRM Core development telemetry or consultant relay receipts belong under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

CRM Core development-private registries belong under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/
```

The consultant target registry path, if used for relay routing, is:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

Future source/operator receipts may use this path label only under future
source/operator approval:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Future Instagram private source artifacts may use this path label only under
future approved source/private evidence boundaries:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Future MailerLite private source artifacts may use this path label only under
future approved source/private evidence boundaries:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/
```

The controlling artifacts for this task are reference-only. Codex may
read/reference them, but must not modify them unless separately approved. This
task must not create directories, receipts, private artifacts, private
registries, reply evidence, operational state, or source/operator artifacts.

## Closed Gates

- no execution;
- no source UI;
- no Instagram;
- no Safari;
- no APIs;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DM opening;
- no reply monitoring;
- no assistant reply drafting from private content;
- no assistant reply send;
- no welcome audio send;
- no candidate queue generation;
- no private artifact inspection beyond consultant target registry for relay
  routing;
- no MailerLite;
- no Gmail;
- no CRM/source writes;
- no ledgers;
- no cards;
- no Fact Store;
- no source-result ledger writes;
- no scoring;
- no outreach;
- no source mutation;
- no central integration;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Stop Conditions

Stop if:

- the approval phrase is missing, stale, or broader than the intended action;
- the assistant identity is not approved;
- the evidence packet is missing or not approved for reply drafting;
- private values would need to be printed;
- old-history reading is required;
- recipient identity is ambiguous;
- the message requires advice or a promise;
- MailerLite status is unknown but the reply would imply onboarding;
- CRM state is unknown but the reply would imply a CRM update;
- any source action, API call, DM opening, reply send, welcome audio send,
  MailerLite action, Gmail use, CRM/source write, or central integration would
  occur.

## Proposed Integration Note

Welcome Audio lane produced a no-run assistant reply policy boundary for the
Controlled Welcome Flow. The artifact defines assistant identity disclosure,
Mantis/Mati signature rules, no-Alejandro-impersonation rules, allowed and
forbidden reply classes, escalation classes, conversation state, cadence,
private content handling, future draft-preview and one-reply send approval
boundaries, storage policy, stop conditions, and closed gates. It creates no
real reply draft, send approval, assistant persona deployment, candidate queue,
Mailerlite artifact, CRM enrichment packet, source state, or CRM write.

## Next Safe Step

Recommended next safe step: central integration review may decide whether to
integrate this lane-local policy artifact into CRM Core central coordination.
No reply draft preview, reply send, MailerLite mutation, CRM enrichment, or
source action should start from this artifact alone.

## Completion Boundary

Complete when this lane-local artifact and workstream status update define the
assistant reply policy boundary without executing source actions, inspecting
private artifacts, drafting from private content, sending replies, touching
MailerLite/Gmail, writing CRM/source state, or integrating central.

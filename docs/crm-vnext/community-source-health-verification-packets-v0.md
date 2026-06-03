# Community Source Health Verification Packets v0

Date: 2026-06-02
Status: read-only/no-live CRM Core verification packet plan

## Purpose

This document defines source-health verification packets for the three priority
CRM Core community source families:

1. Instagram.
2. Email/MailerLite.
3. Gmail/newsletter replies.

These packets prepare future verification only. They do not run verification,
call live APIs, open UIs, search Gmail, inspect Instagram, call MailerLite,
mutate source systems, mutate CRM state, write ledgers, write cards, change
scoring, read secrets, print secrets, read private message bodies, or authorize
outbound action.

## Shared Packet Rules

| Rule | Required boundary |
| --- | --- |
| Execution | Prepare packet docs only. Do not run verification in this action. |
| Secrets | Do not read, print, echo, dump, rotate, refresh, or request credentials. |
| Private content | Do not print private message bodies, full email bodies, full DM threads, raw subscriber lists, private URLs, tokens, cookies, headers that include secrets, or full personal-content exports. |
| Source mutation | Do not click, reply, react, follow, send, archive, label, subscribe, unsubscribe, tag, group, schedule, publish, or change settings. |
| CRM mutation | Do not write cards, Fact Store, Signal Event Ledger, Engagement Snapshot Ledger, source-result ledgers, score state, dashboards, queues, or CRM state. |
| Output | Produce compact source-health artifacts only: status, checked route, timestamp, blocker class, redacted counts, and next safe operator step. |
| Meaning of green | A green result means the source route can supply read-only evidence for later dry-run processing. It is not permission to write CRM state or contact anyone. |

Source-health states used by all packets:

- `healthy`: the route can produce the expected read-only evidence without
  printing secrets or content and without mutation.
- `stale`: evidence exists but is too old, partial, or missing freshness proof.
- `blocked`: the route cannot proceed without human approval, credentials,
  login, permissions, private content, or another stop condition.
- `unknown`: the repo or supplied evidence does not prove current availability.

## Packet 1: Instagram

### What Needs To Be Verified

- Whether Instagram can supply compact read-only community signals through an
  approved route.
- Whether the usable route is API/webhook, UI read-only, export, local snapshot,
  or manual evidence.
- Whether available signals include DMs, story replies, message reactions,
  comments, mentions, likes, story views, follows, or aggregate insights.
- Whether each signal has an identity anchor: handle, email, phone, `personId`,
  or confirmed bridge evidence.
- Whether the route can produce compact evidence without opening private content
  beyond the approved read-only boundary.

### Why It Matters For CRM Core

Instagram is the main public/community attention channel. CRM Core needs to know
whether Instagram evidence can safely feed local signal normalization and later
dry-run previews, while keeping DMs and identity bridges review-only.

### Healthy Evidence

- A dated, redacted source-health receipt naming the exact route checked.
- Confirmation that the route is read-only and did not require login,
  checkpoint, CAPTCHA, permission escalation, or credential entry.
- For manual/UI evidence: compact observation rows with exact anchors and
  `threadOpenedReadOnly` status when a thread was part of the approved route.
- For API/webhook/export/snapshot evidence: redacted counts and source labels
  only, with no tokens, cookies, raw payload secrets, or full message bodies.
- Evidence that the output can be shaped for
  `crm:vnext:instagram-signal-events` without writing ledgers.

### Stale, Blocked, Or Unknown Evidence

| State | Evidence |
| --- | --- |
| `stale` | Prior observations exist but lack a date, source label, freshness receipt, or current route confirmation. |
| `blocked` | Login, checkpoint, CAPTCHA, password prompt, permission request, UI action risk, missing human approval, or need to open/read private content beyond the approved boundary. |
| `unknown` | No current evidence proves whether API, webhook, UI read-only, export, local snapshot, or manual evidence is available. |

### Later Verification Route

Allowed to prepare, not run here:

```text
Manual/UI route:
Alejandro or Mantis supplies a compact read-only observation packet
  -> no full thread export
  -> no reply/reaction/follow/action
  -> output redacted source-health receipt

Export/snapshot route:
Supplied Instagram observation JSON/export
  -> inspect metadata shape and counts only
  -> no live Instagram access
  -> output redacted source-health receipt

Future API/webhook route:
Approved no-secret healthcheck only
  -> status and redacted counts only
  -> no credential print
  -> no message body print
```

### Must Not Be Printed

- Access tokens, cookies, credentials, raw auth headers, webhook secrets.
- Full DM threads, private message bodies, private handles beyond compact
  evidence anchors needed for review, screenshots of private conversations.
- Raw API payloads containing private content.

### Must Not Be Opened, Read, Or Exported

- Instagram UI, DMs, inbox, thread history, or profile pages in this action.
- Full conversations or sensitive/private context.
- Any login, checkpoint, CAPTCHA, permission, settings, follow, reaction, or
  outbound surface.

### Requires Alejandro Approval

- Any live Instagram API/webhook healthcheck.
- Any Instagram UI/manual inspection.
- Any thread opening, even read-only.
- Any use of sensitive/private context beyond compact evidence.
- Any future ledger, card, scoring, or snapshot write.

### Stop Verification

Stop if verification would require:

- login, checkpoint, CAPTCHA, password, credential, cookie, or permission entry;
- opening Instagram UI in this action;
- reading or exporting private message bodies;
- clicking, replying, reacting, following, unfollowing, or changing settings;
- running a live API or webhook probe without explicit approval;
- writing CRM state or source-result memory.

### Output Artifact

Future verification should produce:

```text
~/Documents/Mantis-Reports/crm_core_instagram_source_health_verification_<date>.md
~/Documents/Mantis-Reports/crm_core_instagram_source_health_verification_<date>.json
```

The artifact should include route, source-health state, redacted counts, blocker
class, identity-anchor coverage, next safe operator step, and closed gates.

### After A Green Result

CRM Core may:

- accept supplied compact observations for local normalization;
- run later dry-run local processing only after separate approval;
- classify which signals are preview-ready, review-only, blocked, or unknown;
- route ambiguous identity bridges to review.

CRM Core still may not:

- write Signal Event Ledger, Engagement Snapshot Ledger, cards, Fact Store, or
  scoring;
- send, DM, reply, react, follow, or contact anyone;
- treat a green source as permission to automate Instagram.

## Packet 2: Email / MailerLite

### What Needs To Be Verified

- Whether a fresh MailerLite engagement snapshot/export exists or can be
  supplied safely.
- Whether a no-secret MailerLite read healthcheck would be safe and what it
  would prove.
- Whether the snapshot includes subscriber status, suppression, opens, repeated
  opens, clicks, repeated clicks, campaign context, and identity anchors.
- Whether open/click patterns can be separated from single weak opens.
- Whether the data can feed `crm:vnext:mailerlite-engagement-signals` without
  live calls or mutation.

### Why It Matters For CRM Core

Email/MailerLite is the main deep-relationship channel. CRM Core needs fresh
engagement and safety context before any dry-run heat preview or operator brief,
but email engagement must not become send permission.

### Healthy Evidence

- Dated snapshot/export receipt with source label, row count, and freshness.
- Confirmation that no subscribers, groups, tags, segments, workflows, campaigns,
  automations, or sends were mutated.
- Suppression/bounce/complaint fields preserved or explicitly reported absent.
- Repeated opens/clicks distinguishable from single opens.
- Identity anchors present as email and, where available, person/card bridge
  evidence.
- Snapshot shape compatible with `crm:vnext:mailerlite-engagement-signals`.

### Stale, Blocked, Or Unknown Evidence

| State | Evidence |
| --- | --- |
| `stale` | Snapshot/export exists but lacks date, source label, row count, freshness proof, or current subscriber-status context. |
| `blocked` | Verification requires API access, credentials, subscriber content printing, group/workflow mutation, or unapproved live MailerLite action. |
| `unknown` | No current snapshot/export receipt or approved source-health check exists. |

### Later Verification Route

Allowed to prepare, not run here:

```text
Snapshot/export route:
Supplied MailerLite engagement snapshot/export
  -> inspect metadata shape, fields, freshness, and row counts only
  -> no subscriber list dump in chat
  -> output redacted source-health receipt

Future API healthcheck route:
Approved no-secret MailerLite healthcheck
  -> endpoint status and redacted counts only
  -> no subscriber content
  -> no mutation
```

### Must Not Be Printed

- API keys, auth headers, tokens, env values, raw credentials.
- Full subscriber lists, private emails in bulk, private URLs, campaign bodies,
  group membership dumps, workflow details that expose private audience data.
- Raw rows beyond compact redacted examples if explicitly approved later.

### Must Not Be Opened, Read, Or Exported

- MailerLite UI in this action.
- Subscriber profiles, group management screens, campaign editors, automations,
  workflows, sends, or audience screens.
- Any export that includes unnecessary personal data or campaign body content.

### Requires Alejandro Approval

- Any live MailerLite API healthcheck.
- Any fresh snapshot/export collection.
- Any inspection of subscriber-level rows beyond metadata/shape.
- Any future write to ledgers, cards, Fact Store, scoring, groups, subscribers,
  workflows, campaigns, automations, or sends.

### Stop Verification

Stop if verification would require:

- API key access, credential output, or env dump;
- live MailerLite call without explicit approval;
- printing subscriber content or bulk personal data;
- opening MailerLite UI in this action;
- changing subscriber/group/segment/tag/campaign/workflow/send state;
- treating opens/clicks as permission to contact.

### Output Artifact

Future verification should produce:

```text
~/Documents/Mantis-Reports/crm_core_mailerlite_source_health_verification_<date>.md
~/Documents/Mantis-Reports/crm_core_mailerlite_source_health_verification_<date>.json
```

The artifact should include route, source-health state, snapshot freshness, row
count, available fields, suppression coverage, repeated-engagement coverage,
identity coverage, blockers, next safe operator step, and closed gates.

### After A Green Result

CRM Core may:

- accept the supplied snapshot/export for local adapter processing after
  separate approval;
- classify single opens as weak and repeated opens/clicks as stronger patterns;
- use suppression status as review/safety context;
- prepare dry-run preview inputs.

CRM Core still may not:

- write Signal Event Ledger, Engagement Snapshot Ledger, cards, Fact Store, or
  scoring;
- mutate MailerLite subscribers, groups, segments, campaigns, workflows,
  automations, or sends;
- treat email engagement as permission to contact.

## Packet 3: Gmail / Newsletter Replies

### What Needs To Be Verified

- Whether a metadata-only Gmail/newsletter reply discovery route is currently
  healthy or can be supplied as a redacted local report.
- Whether reply candidates can distinguish human replies from bounces,
  autoresponders, no-reply senders, list/bulk headers, and outbound sender rows.
- Whether selected rows include safe metadata: sender, date, subject/campaign
  relation, confidence, reason codes, and redacted snippet when approved.
- Whether the discovery shape can feed
  `crm:vnext:gmail-reply-engagement-signals` without live Gmail access.

### Why It Matters For CRM Core

Newsletter replies are high-signal relationship evidence, but they are also
interpretive and private. CRM Core needs a verification boundary that proves
metadata health without reading bodies or treating replies as outreach
permission.

### Healthy Evidence

- Dated metadata-only discovery receipt with route and source label.
- Human reply confidence fields present and false-positive classes excluded.
- No full body export and no private thread dump.
- Reply rows include enough redacted metadata to classify as strong, medium,
  weak, skipped, or false-positive.
- Output shape compatible with `crm:vnext:gmail-reply-engagement-signals`.

### Stale, Blocked, Or Unknown Evidence

| State | Evidence |
| --- | --- |
| `stale` | Prior discovery exists but lacks date, account/route label, freshness proof, or false-positive filter summary. |
| `blocked` | Verification requires Gmail login, connector/API call, full body export, private thread reading, credential access, or unapproved search. |
| `unknown` | No current metadata-only discovery receipt or approved no-content healthcheck exists. |

### Later Verification Route

Allowed to prepare, not run here:

```text
Metadata-only discovery route:
Supplied Gmail/newsletter reply discovery report
  -> inspect shape, counts, confidence classes, false-positive filters
  -> no full body export
  -> output redacted source-health receipt

Future no-content healthcheck route:
Approved Gmail/OpenClaw/gog healthcheck
  -> token/service status only
  -> no message content
  -> no mailbox search unless separately approved
```

### Must Not Be Printed

- OAuth tokens, refresh tokens, credentials, env values, auth headers.
- Full email bodies, full threads, full headers, raw message IDs in bulk, private
  snippets beyond approved redacted examples.
- Mailbox search results containing personal content.

### Must Not Be Opened, Read, Or Exported

- Gmail UI in this action.
- Gmail searches, messages, threads, attachments, labels, archives, sends, or
  settings.
- Full newsletter reply bodies or thread histories.

### Requires Alejandro Approval

- Any Gmail/OpenClaw/gog healthcheck.
- Any Gmail search or metadata discovery.
- Any use of redacted snippets.
- Any future interpretation of reply intent, care need, or next action.
- Any future ledger, card, Fact Store, scoring, or snapshot write.

### Stop Verification

Stop if verification would require:

- Gmail login, OAuth flow, credential access, or token output;
- live Gmail connector/API call without explicit approval;
- mailbox search in this action;
- reading full bodies or private threads;
- label/archive/delete/send/settings mutation;
- interpreting reply intent without review.

### Output Artifact

Future verification should produce:

```text
~/Documents/Mantis-Reports/crm_core_gmail_reply_source_health_verification_<date>.md
~/Documents/Mantis-Reports/crm_core_gmail_reply_source_health_verification_<date>.json
```

The artifact should include route, source-health state, discovery freshness,
candidate counts by confidence, false-positive counts, redaction policy, identity
coverage, blockers, next safe operator step, and closed gates.

### After A Green Result

CRM Core may:

- accept supplied metadata-only discovery for local adapter processing after
  separate approval;
- classify reply rows as strong, medium, weak, skipped, or false-positive;
- route human replies to review-only operator context;
- prepare dry-run preview inputs.

CRM Core still may not:

- write Signal Event Ledger, Engagement Snapshot Ledger, cards, Fact Store, or
  scoring;
- read full email bodies or private threads;
- send, reply, label, archive, delete, or contact anyone;
- treat a reply as permission to contact without human review.

## Cross-Packet Output Contract

Each future packet run should produce a compact JSON and Markdown receipt with:

- `source_family`
- `verification_route`
- `source_health_state`
- `checked_at`
- `checked_by`
- `approval_reference`
- `redaction_policy`
- `counts_redacted`
- `identity_coverage_summary`
- `blockers`
- `unknowns_remaining`
- `allowed_next_local_step`
- `still_forbidden_after_green`
- `closed_gates`

Receipts should be safe to summarize in chat without secrets, raw private
content, source mutations, CRM mutations, or outbound implications.

## Validation

This packet-preparation action validates with:

```bash
git diff --check
```

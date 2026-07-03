# CRM Core Storage And Mantis Operator Boundary Policy v0

Date: 2026-07-03
Status: no-run central operating hygiene policy

## Purpose

Define where CRM Core development records, relay telemetry, source/operator
receipts, private artifacts, target registries, and future Mantis/OpenClaw
operator surfaces belong.

This policy exists to prevent CRM Core development logs, sprint receipts, relay
transcripts, prompts, commits, or milestones from inflating or contaminating
Mantis general memory or OpenClaw/Mantis workspace context.

This policy does not authorize source actions, APIs, UI, private artifact
inspection, CRM writes, Launch OS work, Mantis memory writes, file migrations,
or report migrations.

## Core Principle

CRM Core development memory lives in the CRM repo.

Mantis may become a future operator of CRM Core, but Mantis general memory is
not CRM Core development memory.

OpenClaw/Mantis workspace is not the current CRM Core development workspace.

CRM Core development should start from:

```text
/Users/alejandrogomez/CRM-core
```

or an approved CRM-core lane worktree:

```text
/Users/alejandrogomez/CRM-core-mailerlite
/Users/alejandrogomez/CRM-core-instagram-api
/Users/alejandrogomez/CRM-core-welcome-audio
```

`/Users/alejandrogomez/CRM` is a visible legacy/non-CRM-core worktree label for
this project and must not be used unless Alejandro opens a separate explicit
boundary.

## Storage Taxonomy

### Repo Durable Records

Location:

```text
/Users/alejandrogomez/CRM-core
```

Use for:

- architecture;
- protocols;
- next actions;
- lane docs;
- workstream status;
- integration queue entries;
- decision records;
- no-run designs;
- durable summaries of completed work.

Do not use repo for:

- private artifacts;
- raw source rows;
- raw ChatGPT target URLs;
- private DMs;
- private subscriber content;
- raw identities;
- secrets;
- screenshots;
- report telemetry.

### CRM-Core-Reports

Preferred future location:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/
```

Use for CRM Core development telemetry, including:

- consultant-relay receipts;
- autonomous sprint receipts;
- copied consultant verdicts;
- non-private development telemetry;
- transport/recovery metadata;
- guardrail validation receipts.

Consultant-relay subfolder:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Rules:

- future consultant-relay receipts should use CRM-Core-Reports, not
  Mantis-Reports;
- receipts must remain redacted;
- receipts must not include private chats, private artifacts, source data,
  handles, emails, names, DMs, tokens, cookies, headers, env values,
  credentials, screenshots, or raw target URLs;
- this policy does not migrate existing Mantis-Reports/consultant-relay
  history.

### CRM-Core-Private-Artifacts

Preferred future location:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/
```

Use for CRM Core development-private infrastructure and non-source private
development artifacts, including:

- consultant target URL registry;
- consultant relay private operational state;
- local private development-only routing artifacts.

Preferred future consultant target registry path:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

Rules:

- raw target URLs must never be printed in chat, Mantis-Reports,
  CRM-Core-Reports, tracked docs, receipts, or returned output;
- central integration must not inspect or copy raw target URLs;
- existing target registry under Mantis-Private-Source-Artifacts may remain as
  a legacy continuity path until re-registered;
- future target registrations should prefer CRM-Core-Private-Artifacts.

### Mantis-Reports

Location:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Use for:

- future Mantis/operator-facing source receipts;
- redacted source-health receipts;
- redacted operator/source receipts intended for Mantis to consume or summarize;
- aggregate source/run receipts that belong to CRM operation rather than CRM
  development.

Do not use for:

- consultant-relay development telemetry going forward;
- copied consultant verdicts;
- sprint internal telemetry;
- development milestones;
- raw private content;
- private target URLs.

Legacy note:

Existing CRM Core development receipts under Mantis-Reports may remain as
historical artifacts. Do not migrate them in this policy patch.

### Mantis-Private-Source-Artifacts

Location:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/
```

Use for:

- future/source private artifacts;
- person-level source evidence;
- private Instagram anchors;
- private MailerLite artifacts;
- private Gmail/source artifacts;
- source-operation private state intended for future Mantis/CRM operation.

Do not use for:

- consultant relay development telemetry going forward;
- raw ChatGPT target URLs in future registrations;
- CRM development logs;
- milestone history;
- prompts or diffs.

Legacy note:

Existing consultant target registry under Mantis-Private-Source-Artifacts may
remain temporarily for continuity. Future registry writes should prefer
CRM-Core-Private-Artifacts.

### Mantis General Memory

Mantis general memory must not store:

- CRM Core development logs;
- sprint histories;
- Codex prompts;
- diffs;
- commits;
- copied consultant replies;
- relay receipts;
- queue entries;
- private artifacts;
- private source rows;
- target URLs;
- private identities;
- raw CRM build history.

Mantis general memory may store only high-level operator preferences or durable
CEO-level decisions when intentionally provided by Alejandro, and only if they
are not private source artifacts or development logs.

### OpenClaw / Mantis Workspace

OpenClaw/Mantis workspace is not the current CRM Core development workspace.

CRM Core development must not hydrate from OpenClaw/Mantis workspace
instructions as its authority.

Future Mantis/OpenClaw operation may invoke CRM Core protocols through explicit
approved operator packets, but must not turn OpenClaw/Mantis workspace into CRM
Core development memory.

## Mantis As Future CRM Operator

Mantis may later operate CRM Core as a worker/operator by:

- reading approved operator briefs;
- reading redacted source/operator receipts;
- asking Alejandro for decisions;
- invoking approved CRM Core protocols;
- routing tasks to Codex or another worker;
- summarizing channel readiness, blockers, signal inventory, identity coverage,
  review queues, and next operator moves.

Mantis must not:

- treat heat or engagement as permission to contact;
- store private queue entries in general memory;
- store CRM development logs in general memory;
- inspect private source artifacts unless an exact private-review boundary
  allows it;
- mutate source systems or CRM state without exact approval;
- bypass `crm-core-next-action.md` or CRM Core protocols.

## Goals Compatibility

Alejandro reports no active Codex Goals at the time of this policy.

Future Codex Goals are compatible only if they:

- start from `/Users/alejandrogomez/CRM-core` or an approved CRM-core lane
  worktree;
- read `docs/crm-vnext/crm-core-next-action.md`;
- obey the active next action;
- respect all forbidden scopes;
- do not route through `/Users/alejandrogomez/CRM`;
- do not use OpenClaw/Mantis workspace instructions as CRM Core authority;
- do not write to Mantis general memory;
- do not store development telemetry in Mantis-Reports.

Goals are wake/continue mechanisms only. They are not authority.

`crm-core-next-action.md` remains the routing authority.

## Transition Rules

This policy does not require migrating historical receipts.

Starting after this policy is committed:

- future consultant-relay receipts should use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

- future consultant target registry writes should use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

- future source/operator receipts may continue using:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

- future source/private artifacts may continue using:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/
```

- Mantis general memory must remain free of CRM development telemetry and
  private artifacts.

## Prompt/Protocol Requirements Going Forward

Future Codex prompts that create relay receipts must explicitly distinguish:

- development telemetry path;
- operator/source receipt path;
- private source artifact path;
- private development registry path.

Future central integration closeouts should include:

- `project_context_update_needed`: true/false;
- `storage_policy_update_needed`: true/false;
- `used_crm_core_reports`: true/false;
- `used_mantis_reports`: true/false;
- `used_mantis_memory`: false;
- `raw_target_url_printed`: false;
- `private_artifacts_integrated`: false.

## Stop Conditions

Stop if any task would:

- write CRM development logs to Mantis general memory;
- use OpenClaw/Mantis workspace as CRM Core development authority;
- store consultant-relay telemetry in Mantis-Reports after this policy without
  explicit legacy exception;
- print raw target URLs;
- commit private artifacts;
- inspect private artifacts without exact approval;
- use `/Users/alejandrogomez/CRM`;
- touch Launch OS docs;
- mutate source systems;
- write CRM/source state without exact approval.

## Completion Boundary

Complete when CRM Core has an explicit storage taxonomy and Mantis operator
boundary that preserves future Mantis/OpenClaw operator compatibility while
keeping CRM Core development memory, relay telemetry, private development
infrastructure, source receipts, private source artifacts, and Mantis general
memory separate.

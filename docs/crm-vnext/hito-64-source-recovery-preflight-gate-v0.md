# Hito 64 - Source Recovery Preflight Gate v0

Date: 2026-05-20
Status: Implemented as operator protocol hardening

## Why

During the Yoga Golden Cohort source-recovery pass, Mantis produced a valid read-only report but closed it after finding that several live high-value lanes were blocked:

- MailerLite returned unauthenticated.
- gog/Google Workspace returned `invalid_grant`.
- Instagram Messages UI redirected to login.

The report was safe, but too degraded for the CRM goal. For stitching work, those lanes are often where the strongest evidence lives, so a final-looking report can accidentally hide the real next step: ask Alejandro to unlock the source and retry.

## Rule

Serious stitching/source-recovery batches now need a source-health preflight before the full hunt.

Mantis should classify the needed lanes:

- MailerLite cursor scan.
- gog/Google Workspace for Gmail, Drive, Docs, Sheets, and Contacts.
- Instagram Messages UI.
- Local CRM card store and local reports/ledgers.
- Any source explicitly named by Alejandro, such as ClassBot, retreat sheets, ManyChat/proxy traces, or Gmail replies.

If a required high-value source is blocked, Mantis should pause into `awaiting_human_unblock` with:

- the blocked source;
- exact reason;
- exact unblock action;
- pending contact/search anchors;
- `degradedRunAllowed: false`.

Mantis should not close a degraded final batch unless Alejandro explicitly approves a degraded run, the blocked lane is not needed for the current contacts, or a cached/exported equivalent provides enough evidence.

## What Changed

Updated:

- `docs/crm-vnext/mantis-natural-batch-protocol.md`
- `docs/crm-vnext/operator-capabilities.md`
- `docs/crm-vnext/hito-53-stitching-batch-governance-v0.md`
- `docs/crm-vnext/hito-61-official-flow-source-recovery-v0.md`
- `lib/crm/crm-vnext-operator-capabilities.ts`
- `__tests__/operator-capabilities.spec.ts`

## Safety

No new mutation authority was added.

Still prohibited:

- CRM writes without explicit approval.
- Fact Store writes without explicit approval.
- ManyChat LIVE changes.
- MailerLite mutations or credential changes.
- Google writes or credential changes.
- Instagram messages, reactions, follows, credential changes, or permission changes.
- Any outbound contact.

This gate only changes when Mantis should pause and ask for help before producing a final evidence report.

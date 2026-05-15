# Hito 61 - Official-Flow Source Recovery v0

Date: 2026-05-15
Status: implemented

## Why

Alejandro caught an operator gap during the stitching batches: a contact was reported as missing email, but manual review of Instagram Messages showed that the person had already given data through the normal Instagram/onboarding path.

The CRM should not ask Alejandro to remember or retype data that the official flow probably captured already.

## Rule

When the Batch Operating Loop sees an Instagram/onboarding-like contact with missing email or phone, it marks the item as `source_recovery_required`.

Mantis must search official-flow sources before escalating to Alejandro:

- Instagram Messages UI;
- ManyChat read-only exports or cached flow records;
- Vercel/proxy/webhook traces;
- MailerLite cursor pagination with local filtering;
- lead-capture ledgers, local reports, CSVs/downloads;
- Gmail, Drive, and Contacts when they are useful and available.

## Operator Output

The follow-up evidence hunt should be contact-keyed and include:

- `searchedSources`;
- `discardedCandidates`;
- `remainingGaps`;
- `why_previous_batch_missed_this`;
- `awaiting_human_unblock` with exact pending anchors if auth/Relay/login blocks a lane.

## Safety

This is a read-only recovery rule. It does not authorize:

- ManyChat LIVE changes;
- Instagram messages/reactions/follows;
- MailerLite mutations;
- Google writes;
- CRM card writes;
- Fact Store writes;
- outbound contact.

Alejandro still approves local card writes separately after evidence is imported and reviewed.

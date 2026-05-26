# Hito 84 - Source-Result-Aware Coverage Push v0

Date: 2026-05-26
Status: implemented

## Why

After the Source Result Ledger, the next useful step was to make the next batch planner read that memory.

Otherwise, CRM vNext could faithfully store source-check receipts but still ask Mantis to repeat weak searches or treat a limited UI failure as a final negative.

## What Changed

`crm:vnext:omnichannel-coverage-push` now reads `.crm-vnext/source-result-ledger/ledger.jsonl` by default and attaches source-result memory to each selected candidate.

Candidates can now carry:

- `sourceResultHistory`;
- `sourceResultGuidance`;
- source-aware `sourceLanes`;
- source-aware `suggestedMantisAction`.

The generated Mantis prompt now explicitly asks for result classes:

- `bridge_found`;
- `found_profile_no_requested_bridge`;
- `not_found_limited_search`;
- `not_found_exhaustive`;
- `blocked`.

## Operator Effect

If a prior ManyChat profile was opened and visibly had no captured email, Mantis should not repeat the same profile read.

If a prior ManyChat search was only a weak/free-UI search, Mantis should not bury the contact. The contact remains retryable through a stronger exact-anchor route such as custom-field filter, API/export if available, Instagram thread search, MailerLite/Gmail/Drive/Contacts, or another official-flow source.

Clarification added after the first source-aware batch: `no ManyChat LIVE` means no ManyChat mutation or outbound. It does not mean "never read ManyChat UI." Read-only exact-anchor ManyChat UI lookup remains allowed when needed to recover historical onboarding evidence.

Follow-up after the completed v2 source-recovery batch: the planner now prefers quality over filling slots. Low bridge-potential rows are left in backlog by default, and candidates whose omnichannel exact-anchor recovery is already exhausted are excluded from immediate reruns unless a new anchor/source/API-export lane appears. This prevents the next Mantis batch from drifting into repeated or low-yield work.

## Safety

This remains a read-only planner. It does not mutate cards, Fact Store, scores, live APIs, credentials, ManyChat LIVE, Instagram, MailerLite, Google, WhatsApp, Telegram, or outbound channels.

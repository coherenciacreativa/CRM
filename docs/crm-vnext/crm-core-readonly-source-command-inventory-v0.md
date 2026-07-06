# CRM Core Read-Only Source Command Inventory v0

Date: 2026-06-03
Status: command inventory only; no source checks run

## Purpose

This inventory classifies candidate CRM Core commands and scripts for
Email/MailerLite source-health or engagement/status metadata and
Gmail/newsletter reply metadata-only discovery under the standing read-only
source policy.

This document does not authorize execution. It does not call live APIs, open
UIs, read or print credentials, inspect source snapshots, print subscriber
lists, print raw rows, print full email bodies, mutate source systems, mutate
CRM state, write ledgers, write cards, write Fact Store, write scoring, or send
outbound messages.

## Classification Values

| Field | Values |
| --- | --- |
| `read_only_confidence` | `confirmed`, `likely`, `unknown`, `blocked` |
| `credential_behavior` | `existing internal auth only`, `requires credential inspection`, `unknown` |
| `output_safety` | `redacted aggregate`, `raw rows risk`, `private content risk`, `unknown` |
| `mutation_risk` | `none`, `unknown`, `unsafe` |
| `allowed_under_standing_policy` | `yes`, `no`, `needs clarification` |

For local supplied-artifact adapters, `existing internal auth only` means there
is no live credential route for Codex to inspect; any credentials were handled
outside this command before the artifact was supplied.

## Inventory

| Source family | Command or script | read_only_confidence | credential_behavior | output_safety | mutation_risk | allowed_under_standing_policy | latest_result | latest_guard | note | Recommended next step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MailerLite/email source health | `npm run crm:vnext:mailerlite-healthcheck` / `scripts/crm-vnext-mailerlite-healthcheck.mjs` | confirmed | existing internal auth only | redacted aggregate | none | yes | healthy on 2026-06-03 | not applicable | Final bounded cursor check scanned 14 pages / 1373 subscribers and exhausted before cap without leaking credential metadata or raw subscriber rows. | Use the healthy source-health result to plan the next no-write MailerLite engagement metadata intake step. |
| MailerLite setup/config metadata | `npm run crm:vnext:mailerlite-setup-readonly-verification` / `scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs` | fixture-tested and mocked-live-tested; real live-read pending approval | future live mode uses existing internal auth only after approval/path prechecks; no credential output | redacted aggregate receipts; private setup refs only in approved private artifact path | none intended; live mode enforces read-only setup/config route and no subscriber-row reads | no for live until separately approved for this setup route | mocked live mode tested; real live setup verification not run | redaction tests for IDs/emails/tokens/raw payloads; path safety; no subscriber rows; no mutation methods | Dedicated onboarding setup/config readiness guard with GET-only setup allowlist and conservative mutation readiness. | Central integration, then live read-only setup verification approval. |
| MailerLite/email engagement/status metadata | `npm run crm:vnext:mailerlite-engagement-signals -- --snapshot-file <path> --redacted-summary` / `scripts/crm-vnext-mailerlite-engagement-signals.mjs` | confirmed for supplied local snapshot/export route | no credential use expected for local snapshot route | redacted aggregate when `--redacted-summary` is used | none | yes, only with approved/supplied artifact and `--redacted-summary` | not run | `692771c Add redacted MailerLite engagement summary mode` | Normal output remains unsafe for chat/standard receipts; real intake must use `--redacted-summary`. | Determine whether an approved/supplied MailerLite engagement snapshot/export artifact exists before running any intake. |
| MailerLite/email engagement private artifact export | `npm run crm:vnext:mailerlite-engagement-artifact-export` / `scripts/crm-vnext-mailerlite-engagement-artifact-export.mjs` | confirmed by tests, pending first real run | existing internal auth only, no credential output | private artifact + redacted receipts | none | yes | not run | upstream HTTP failure redaction test added before commit | Writes raw source rows only to a private artifact path outside the repo and emits redacted JSON/Markdown receipts with aggregate counts, field-family availability, freshness, blockers, closed gates, and mutation/CRM safety flags. | Run bounded export with low caps. |
| MailerLite/email identity evidence | `npm run crm:vnext:mailerlite-evidence -- --search-results-file <path> --text <text>` / `scripts/crm-vnext-mailerlite-evidence.mjs` | confirmed | existing internal auth only | raw rows risk | none | needs clarification | not run | not applicable | Supplied subscriber results may include email, phone, status, groups, and fields. | Keep for identity-evidence lanes, not the first engagement/source-health check. Use only with redacted supplied results and no raw-row chat output. |
| MailerLite/email live identity evidence | `npm run crm:vnext:mailerlite-evidence -- --use-mailerlite-cli --text <text>` / `scripts/crm-vnext-mailerlite-evidence.mjs` | likely | existing internal auth only | raw rows risk | none | needs clarification | not run | not applicable | Source read is live and can return subscriber records before helper compaction. | Do not use as the first engagement intake path. If needed later, require a redacted receipt path and explicit row-output guard. |
| Gmail/newsletter reply metadata | `npm run crm:vnext:gmail-reply-engagement-signals -- --discovery-file <path>` / `scripts/crm-vnext-gmail-reply-engagement-signals.mjs` | confirmed | existing internal auth only | private content risk | none | yes | not run | not applicable | Requires a dated metadata-only Gmail/newsletter reply discovery artifact. | Run only after a supplied artifact is approved. Do not print reply activities, subjects, snippets, or headers in chat. |
| Gmail/newsletter reply pipeline dry-run | `npm run crm:vnext:signal-event-pipeline -- --gmail-reply-discovery-file <path>` with no write flags | confirmed | existing internal auth only | private content risk | none | yes | not run | not applicable | Output may include preview items and depends on supplied metadata quality. | Use after the metadata adapter step, not first. Never include `--write-events` or `--write-snapshot` in CRM Core source-intake work. |
| Gmail evidence from supplied results | `npm run crm:vnext:gmail-evidence -- --search-results-file <path> --text <text>` / `scripts/crm-vnext-gmail-evidence.mjs` | confirmed | existing internal auth only | private content risk | none | needs clarification | not run | not applicable | Supplied results can include sender, subject, snippets, and message IDs. | Keep for identity-evidence lanes. Use only with redacted supplied results and avoid printing evidence packets containing private snippets. |
| Gmail live evidence search | `npm run crm:vnext:gmail-evidence -- --use-gog --account <account> --text <text>` / `scripts/crm-vnext-gmail-evidence.mjs` | likely | existing internal auth only | private content risk | none | needs clarification | not run | not applicable | Source read is live and can return Gmail result metadata/snippets. | Do not use as the first source-health command. Require metadata-only query scope, redacted output, and stop on auth/UI/private-content ambiguity. |
| Gmail/Google source-health | `npm run crm:vnext:gog-healthcheck` / `scripts/crm-vnext-gog-healthcheck.mjs` | confirmed | existing internal auth only | redacted aggregate | none | needs clarification | not run | not applicable | The command covers broader Google Workspace evidence lanes and prints the account identifier. | Do not use as the first Gmail reply check. If used later, scope and output should be narrowed to Gmail metadata health only. |

## Latest MailerLite Source-Health Result

The MailerLite source-health healthcheck is now confirmed safe under the
standing read-only source policy after the credential metadata redaction patch
and final bounded cursor verification.

Latest healthy receipt:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_final_cursor_2026-06-03.json
/Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_final_cursor_2026-06-03.md
```

Result summary:

- source-health state: healthy;
- groups probe: succeeded;
- subscribers probe: succeeded;
- subscriber cursor scan: succeeded;
- pages scanned: 14;
- subscribers scanned: 1373;
- scan exhausted before cap;
- credential metadata absent from terminal, Markdown receipt, and JSON receipt;
- no source or CRM writes.

## Commands Not Recommended First

- `crm:vnext:mailerlite-engagement-signals -- --snapshot-file <path>
  --redacted-summary` and `crm:vnext:gmail-reply-engagement-signals` are safe
  local adapters, but they require supplied source artifacts. The first bounded
  intake found no matching local artifacts. For MailerLite engagement metadata,
  normal adapter output remains unsafe for chat/standard receipts, so real
  intake must use `--redacted-summary`.
- `crm:vnext:gmail-evidence -- --use-gog` and
  `crm:vnext:mailerlite-evidence -- --use-mailerlite-cli` can perform live
  source reads and may return private metadata or raw rows. They need tighter
  output guards before use.
- `crm:vnext:gog-healthcheck` is read-only and aggregate-oriented, but it checks
  broader Google Workspace evidence lanes than newsletter reply metadata and
  should not be the first CRM Core Gmail reply command without narrowed scope.

## Standing Boundaries

Even when a candidate is `yes` or `confirmed`, CRM Core still may not:

- print, inspect, refresh, rotate, modify, export, or expose credentials;
- print subscriber lists, raw rows, full email bodies, private URLs, campaign
  bodies, tokens, headers, cookies, env values, or private content;
- mutate MailerLite, Gmail, Shopify, Instagram, subscribers, groups, workflows,
  audiences, campaigns, sends, or outbound channels;
- write CRM state, cards, ledgers, Fact Store, Signal Event Ledger, Engagement
  Snapshot Ledger, source-result ledgers, or scoring;
- touch Launch OS docs or `/Users/alejandrogomez/CRM`.

## Validation

This inventory validates with:

```bash
git diff --check
```

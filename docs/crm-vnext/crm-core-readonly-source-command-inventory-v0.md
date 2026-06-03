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

| Source family | Command or script | read_only_confidence | credential_behavior | output_safety | mutation_risk | allowed_under_standing_policy | Recommended next step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MailerLite/email source health | `npm run crm:vnext:mailerlite-healthcheck` / `scripts/crm-vnext-mailerlite-healthcheck.mjs` | confirmed | existing internal auth only | unknown | none | needs clarification | Best first live source-health candidate after a redaction guard suppresses credential source, credential length, and credential fingerprint metadata from terminal/chat and receipts. Use low page caps and aggregate-only output. |
| MailerLite/email engagement/status metadata | `npm run crm:vnext:mailerlite-engagement-signals -- --snapshot-file <path>` / `scripts/crm-vnext-mailerlite-engagement-signals.mjs` | confirmed | existing internal auth only | raw rows risk | none | yes | Run only after a dated MailerLite snapshot/export artifact is supplied and approved for metadata processing. Do not print adapter signals containing emails or private campaign context in chat. |
| MailerLite/email identity evidence | `npm run crm:vnext:mailerlite-evidence -- --search-results-file <path> --text <text>` / `scripts/crm-vnext-mailerlite-evidence.mjs` | confirmed | existing internal auth only | raw rows risk | none | needs clarification | Keep for identity-evidence lanes, not the first engagement/source-health check. Use only with redacted supplied results and no raw-row chat output. |
| MailerLite/email live identity evidence | `npm run crm:vnext:mailerlite-evidence -- --use-mailerlite-cli --text <text>` / `scripts/crm-vnext-mailerlite-evidence.mjs` | likely | existing internal auth only | raw rows risk | none | needs clarification | Do not use as the first source-health command. If needed later, require a redacted receipt path and explicit row-output guard because the source read is live. |
| Gmail/newsletter reply metadata | `npm run crm:vnext:gmail-reply-engagement-signals -- --discovery-file <path>` / `scripts/crm-vnext-gmail-reply-engagement-signals.mjs` | confirmed | existing internal auth only | private content risk | none | yes | Run only after a dated metadata-only Gmail/newsletter reply discovery artifact is supplied and approved. Do not print reply activities, subjects, snippets, or headers in chat. |
| Gmail/newsletter reply pipeline dry-run | `npm run crm:vnext:signal-event-pipeline -- --gmail-reply-discovery-file <path>` with no write flags | confirmed | existing internal auth only | private content risk | none | yes | Use after the metadata adapter step, not first. Never include `--write-events` or `--write-snapshot` in CRM Core source-intake work. |
| Gmail evidence from supplied results | `npm run crm:vnext:gmail-evidence -- --search-results-file <path> --text <text>` / `scripts/crm-vnext-gmail-evidence.mjs` | confirmed | existing internal auth only | private content risk | none | needs clarification | Keep for identity-evidence lanes. Use only with redacted supplied results and avoid printing evidence packets containing private snippets. |
| Gmail live evidence search | `npm run crm:vnext:gmail-evidence -- --use-gog --account <account> --text <text>` / `scripts/crm-vnext-gmail-evidence.mjs` | likely | existing internal auth only | private content risk | none | needs clarification | Do not use as the first source-health command. Require metadata-only query scope, redacted output, and stop on auth/UI/private-content ambiguity because the source read is live. |
| Gmail/Google source-health | `npm run crm:vnext:gog-healthcheck` / `scripts/crm-vnext-gog-healthcheck.mjs` | confirmed | existing internal auth only | redacted aggregate | none | needs clarification | Do not use as the first Gmail reply check. If used later, scope and output should be narrowed to Gmail metadata health only because the command covers broader Google Workspace evidence lanes and prints the account identifier. |

## Safest First Actual Command Candidate

The safest first actual source command is the MailerLite source-health
healthcheck, but only after a redaction guard is confirmed for credential
metadata. The repo contract documents it as read-only and aggregate-oriented,
and it directly answers whether MailerLite/email source health is available.

Recommended future command shape:

```bash
npm run crm:vnext:mailerlite-healthcheck -- \
  --limit 1 \
  --max-pages 1 \
  --out /Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_<date>.json \
  --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/crm_core_mailerlite_healthcheck_redacted_<date>.md
```

Before running it, CRM Core should ensure terminal/chat and receipt output do
not expose credential source, credential length, credential fingerprint, tokens,
subscriber rows, subscriber emails, group membership rows, campaign bodies,
headers, env values, or private content.

## Commands Not Recommended First

- `crm:vnext:mailerlite-engagement-signals` and
  `crm:vnext:gmail-reply-engagement-signals` are safe local adapters, but they
  require supplied source artifacts. The first bounded intake found no matching
  local artifacts.
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

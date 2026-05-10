# Hito 12 - Gmail Evidence Helper v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a read-only Gmail Evidence Helper.

New pieces:

- pure helper: `lib/crm/crm-vnext-gmail-evidence-helper.ts`,
- API: `POST /api/crm-vnext/gmail-evidence-helper`,
- CLI: `npm run crm:vnext:gmail-evidence`,
- tests for helper and API,
- operator capabilities entry and recommended-flow step,
- docs: `gmail-evidence-helper.md`.

## Why It Matters

Alejandro wants Mantis/Codex to search scattered evidence in Gmail without turning the CRM into an unsafe live email actor.

This hito gives Mantis a disciplined loop:

```text
person clue -> Gmail query plan -> read-only search/export -> redacted evidence packet -> Deep Local Stitching
```

The CRM receives evidence, not credentials.

## Behavior

The helper:

- builds Gmail search plans from identity clues,
- accepts Gmail results supplied by a connector/export,
- matches results to the person clue,
- redacts sensitive snippets,
- emits `evidenceSources` packets with `sourceKind: gmail_export`,
- reports `authBlocked=true` when a local connector such as `gog` fails.

It does not:

- send email,
- modify Gmail,
- mutate person cards,
- write Fact Store,
- read OAuth tokens,
- refresh credentials,
- call live Gmail from the API.

## CLI

Planning mode:

```bash
npm run crm:vnext:gmail-evidence -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
```

Supplied search results:

```bash
npm run crm:vnext:gmail-evidence -- --search-results-file ./gmail-results.json --text "CRM: @mayuyis2626 es Mayerli."
```

Optional read-only local `gog` search:

```bash
npm run crm:vnext:gmail-evidence -- --use-gog --account saludoalsol@gmail.com --text "CRM: @mayuyis2626 es Mayerli."
```

If `gog` returns `invalid_grant`, the helper reports the blocker and does not attempt a credential fix.

## Guardrails

- Read-only.
- No outbound channels.
- No Gmail mutation.
- No CRM card mutation.
- No Fact Store write.
- No credential reads.
- No ManyChat, Instagram, MailerLite, WhatsApp, or Telegram calls.
- API output does not expose local paths.

## Verification

Focused verification covers:

- query planning from Mayerli-style clues,
- supplied Gmail-result matching,
- money/account redaction,
- auth blocker reporting,
- API guard and no live Gmail calls,
- operator-capabilities map.

The intended real flow is:

```text
Gmail Evidence Helper -> evidenceSources JSON -> Deep Local Stitching -> defer/review/new-card policy
```

## Follow-On Implemented

Define the first reviewed card-write policy:

- when evidence is enough to create a new card,
- when evidence should merge into an existing person,
- how MailerLite candidates and Gmail/contact evidence are weighted,
- which restricted-service fields require human visibility review.

Implemented as:

- `docs/crm-vnext/card-write-merge-policy.md`
- `docs/crm-vnext/hito-13-card-write-merge-policy-v0.md`
- `POST /api/crm-vnext/card-write-merge-policy`
- `npm run crm:vnext:card-write-merge-policy`

Keep OpenClaw/gog Gmail/Contacts auth stabilization as a separate infrastructure hito:

- `gmail-openclaw-auth-stability-backlog.md`

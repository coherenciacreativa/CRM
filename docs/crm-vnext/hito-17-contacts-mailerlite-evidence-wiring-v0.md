# Hito 17 - Contacts + MailerLite Evidence Wiring v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has two additional safe evidence helpers:

- Contacts Evidence Helper
- MailerLite Evidence Helper

Together with Gmail Evidence Helper, Mantis now has a consistent evidence contract:

```text
external/read-only investigation -> evidenceSources packet -> Deep Local Stitching -> Card Apply Preview
```

This lets the system enrich scattered community identities without letting live connectors mutate records or leak credentials.

## Contacts Result

For Mayerli / `@mayuyis2626`, the read-only Contacts route found a likely Contacts record with a phone candidate. Card Apply Preview can now preserve the cleaner name candidate from Gmail/local evidence and add the phone candidate from Contacts.

The card still remains unwritten:

- no canonical person card mutation,
- no Fact Store write,
- no automatic merge,
- email still missing.

## MailerLite Result

MailerLite is now cableado as a safe evidence route:

- API: `POST /api/crm-vnext/mailerlite-evidence-helper`
- CLI: `npm run crm:vnext:mailerlite-evidence`
- evidence source kind: `mailerlite_export`
- Deep Local Stitching and Card Write/Merge Policy understand that source kind.
- The local scan path uses cursor pagination (`next_cursor`) and local filtering instead of trusting the `search` endpoint.

The local MailerLite CLI was tested read-only and returned:

```text
HTTP 401: Unauthenticated.
```

No credential was printed or touched. This is an authentication blocker for this local Keychain/CLI route, not a CRM architecture blocker. Mantis confirmed a healthy OpenClaw/CRM MailerLite route can scan the full subscriber list read-only.

## Operator Rule

When Mantis has a healthy MailerLite connector, it should:

1. Cursor-paginate subscribers read-only and filter locally using the clue terms from MailerLite Evidence Helper.
2. Supply selected subscriber rows through `mailerLiteSearchResults`.
3. Pass the emitted `mailerlite_export` packets into Deep Local Stitching or Card Apply Preview.
4. Stop before any subscriber/tag/group/automation mutation.

## Guardrails

- No outbound channels.
- No MailerLite mutation.
- No credential read/print/rotation.
- No person-card mutation.
- No Fact Store write.
- No ManyChat LIVE.
- No Instagram credential/API permission changes.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-mailerlite-evidence-helper.spec.ts __tests__/crm-vnext-mailerlite-evidence-helper-api.spec.ts __tests__/operator-capabilities.spec.ts
```

Contacts + preview smoke:

- Contacts evidence packet produced for Mayerli.
- Card Apply Preview preserved `Gladys Mayerli Garcia Ortegon`.
- Phone candidate became available in `identityResolution`.
- `operationsExecuted = 0`.

MailerLite smoke:

- local CLI route reported `401` as `authBlocked=true`.
- no secret output.

## Next Step

Run a MailerLite batch through a healthy Mantis/OpenClaw MailerLite app or a read-only export, then feed those rows into:

```bash
npm run crm:vnext:mailerlite-evidence -- --search-results-file ./mailerlite-results.json --text "<batch>"
```

After that, Card Apply Preview should produce richer review packets before any write path exists.

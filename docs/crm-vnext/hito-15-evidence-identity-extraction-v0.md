# Hito 15 - Evidence Identity Extraction v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now extracts identity signals from review evidence before drafting card operations.

New behavior:

- Deep Local Stitching returns `identitySignals` per hit:
  - full-name candidates,
  - email candidates,
  - phone candidates,
  - Instagram handles.
- Deep Local Stitching preserves source diversity so repeated memory hits do not hide useful evidence from downloads, Gmail packets, contact exports, or retreat tables.
- Card Apply Preview can enrich the proposed card draft with fuller identity evidence while keeping `executed=false`.

## Why It Matters

Alejandro correctly suspected that Mayerli had more information somewhere.

The previous batch was too conservative visually: it deferred creation, but still showed a sparse draft. The new pass found and preserved:

```text
Gladys Mayerli Garcia Ortegon
```

from read-only Zoom/Gmail evidence and a downloaded Zoom chat file.

The result is better operator behavior:

```text
clue: @mayuyis2626 es Mayerli
evidence: Gladys Mayerli Garcia Ortegon joined Yoga Colombia
preview: deferred review packet with fuller displayName candidate
```

## Real Mayerli Smoke

Input:

```text
CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.
```

Output:

- status: `deferred_review_packet`,
- target: `ig:mayuyis2626`,
- proposed draft display name: `Gladys Mayerli Garcia Ortegon`,
- service context: yoga + retreats,
- evidence: Alejandro report, Gmail/Zoom packet, downloaded Zoom chat, Juana/Telegram memory,
- confirmed email: none,
- confirmed phone: none,
- operations executed: 0.

## Guardrails

- No card mutation.
- No merge execution.
- No Fact Store write.
- No outbound channels.
- No live Gmail/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls from CRM.
- No credential reads.
- Identity evidence remains review-only until Alejandro approves a future write path.

## Verification

Focused tests:

```bash
npm test -- --run __tests__/crm-vnext-deep-local-stitching.spec.ts __tests__/crm-vnext-card-apply-preview.spec.ts
```

Real read-only smoke:

- local expanded sources,
- selected Gmail evidence packets,
- Mayerli case.

## Next Step

Search for email/phone with more specialized read-only routes:

- MailerLite read-only UI/export or refreshed bridge,
- macOS Contacts if permission is available,
- downloaded Zoom registration/participant reports if present,
- Gmail exact searches that exclude Zoom/payment notifications.

If email/phone remains missing, keep Mayerli as a deferred review packet rather than a clean new-card write.

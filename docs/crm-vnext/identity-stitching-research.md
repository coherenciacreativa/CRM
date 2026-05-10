# CRM vNext Identity Stitching Research

Date: 2026-05-10
Status: v0 read-only candidate research

## Purpose

Identity Stitching Research turns unmatched CRM clues into candidate research.

It exists for cases like:

```text
CRM: Juan Jose Trujillo es estudiante de yoga, asistio a retiros y es paciente de psicologia.
CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros.
```

Instead of stopping at "unmatched", the system searches safe local sources and recommends what Mantis should do next.

## Surfaces

- Browser route: `/crm-vnext/identity-stitching-research`
- API: `POST /api/crm-vnext/identity-stitching-research`
- CLI:

```bash
npm run crm:vnext:identity-stitching-research -- --text "CRM: Juan Jose Trujillo es estudiante de yoga."
npm run crm:vnext:identity-stitching-research -- --source-kind alejandro_conversation --reporter Alejandro --channel codex --text-file ./batch.txt
```

## Sources Searched

v0 searches only local, read-only sources:

- local Person Cards V1 snapshot,
- local MailerLite/IG bridge enriched CSV.

It does **not** call live MailerLite, Instagram, ManyChat, WhatsApp, Telegram, Gmail, or email APIs.

## Recommendations

Each clue receives one recommendation:

- `stitch_to_existing_card`: strong exact local person-card match exists.
- `review_mailer_candidate`: strong local MailerLite/bridge candidate exists, but no card is stitched yet.
- `review_possible_candidates`: only weak/medium candidates exist.
- `create_new_card_candidate`: stable identity exists, but no candidate was found.
- `needs_more_identity`: no stable identity and no useful candidate were found.

All recommendations are read-only. They do not mutate cards.

## Restricted Service Context

Psychology or therapy service context is not ignored.

When Alejandro says someone is a patient, the CRM treats it as customer/service context:

- usable for internal profile enrichment,
- usable for continuity of care,
- usable for private product/service fit,
- not usable for outbound copy without human review,
- not a place to store clinical details.

## Response Shape

```json
{
  "ok": true,
  "research": {
    "schemaVersion": "crm-vnext-identity-stitching-research-2026-05-10",
    "mode": "read_only_identity_stitching_research",
    "summary": {
      "clues": 2,
      "candidates": 3,
      "strongCandidates": 1,
      "mailerReviewRecommendations": 1,
      "createCardRecommendations": 1
    },
    "clues": []
  }
}
```

The response excludes local filesystem paths and secret values.

## Safety

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No outbound channels.
- No live MailerLite API calls.
- No credential reads or refreshes.
- Weak name-only matches are evidence, not merge approval.

## Operator Rule

Use this after Activation Run when people are unmatched, name-only, or newly reported.

Mantis should return evidence and confidence, then ask for human confirmation before merge or card creation unless a future explicit write policy says otherwise.

When the identity evidence would create a new card, run Deep Local Stitching before accepting that direction:

```bash
npm run crm:vnext:deep-local-stitching -- --text-file ./batch.txt
```

When the local evidence has been reviewed or no extra evidence was found, pass the same batch to Multi-Service Card Proposal:

```bash
npm run crm:vnext:multi-service-card-proposal -- --text-file ./batch.txt
```

That next layer preserves parallel service relationships before any card creation, merge, or enrichment decision.

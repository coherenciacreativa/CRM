# CRM vNext Identity Review

Date: 2026-05-09
Status: v0 read-only review queue

## Purpose

Identity Review connects the approved Fact Store to local person cards without mutating records.

It answers: "Can this stored fact be safely attached to exactly one card, or does Mantis need to ask for identity/business clarification first?"

## Surfaces

- Browser route: `/crm-vnext/identity-review`
- API: `GET /api/crm-vnext/identity-review`
- CLI:

```bash
npm run crm:vnext:identity-review
npm run crm:vnext:identity-review -- --limit 25
npm run crm:vnext:identity-review -- --fail-on-review
```

## Review Statuses

- `ready_for_preview`: one stable identity matched one local person card and the fact is card-ready.
- `needs_identity_review`: the fact is name-only, ambiguous, or matched more than one possible card.
- `unmatched`: the fact has a stable identity, but no local card exists yet.
- `needs_business_review`: identity is matched, but the fact itself requires review before a card rebuild.

## Matching Policy

Strong matches:

- exact `personId`
- exact email
- exact Instagram handle
- exact phone

Weak matches:

- exact normalized display name

Name-only matches are intentionally not auto-previewed. They remain in identity review until a stable identity is confirmed.

## Preview

For `ready_for_preview` items, the report includes:

- matched `personId`
- current card stage, priority score, and next action
- proposed evidence note
- proposed tags
- proposed scoring hints

This is a proposal only. No card file is written, rebuilt, or changed.

## Safety

- Read-only.
- No person-card mutation.
- No outbound messages.
- No external API calls.
- No credential reads or refreshes.
- Local path overrides are allowed only in local/test contexts and are not returned by the API.

## Operator Use

Recommended Mantis flow:

1. Parse conversational report with Fact Intake.
2. Store approved facts in Fact Store.
3. Run Identity Review.
4. If `ready_for_preview`, prepare a rebuild proposal.
5. If review is required, ask Alejandro or Juana for the missing identity/business clarification.

Current downstream route: `/crm-vnext/card-rebuild-diff`.

# CRM vNext Card Apply Preview

Date: 2026-05-10
Status: v0 read-only operation preview

## Purpose

Card Apply Preview converts card write/merge policy decisions into exact hypothetical operations.

It answers:

```text
If this were approved later, what exactly would the CRM try to change?
```

It does not apply anything.

## Surfaces

- API: `POST /api/crm-vnext/card-apply-preview`
- CLI:

```bash
npm run crm:vnext:card-apply-preview -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:card-apply-preview -- --include-expanded-sources --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:card-apply-preview -- --evidence-file ./gmail-contact-drive-evidence.json --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:card-apply-preview -- --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl --evidence-file ./evidence.json --text "CRM: @mayuyis2626 es Mayerli."
```

## What It Produces

Each preview item includes:

- policy decision id,
- target person id,
- identity resolution summary,
- current card summary if one exists,
- proposed card draft when relevant,
- blocked approvals,
- exact operations,
- safety note.

The identity resolution summary also includes `evidenceDecisionSummary`, which tells Mantis whether a candidate email was already:

- confirmed for the subject,
- kept unassigned as family/companion evidence,
- moved toward a related-person candidate,
- left in needs-more-evidence,
- ignored.

When Deep Local Stitching finds identity signals, the proposed card draft can use them as review-only enrichment. For example, if Alejandro reports `@mayuyis2626 es Mayerli` and evidence later finds `Gladys Mayerli Garcia Ortegon`, the preview draft may use the fuller name while still keeping the card blocked/deferred for human review.

If the decision ledger says a family/shared email should remain unassigned, the preview keeps `missingContactFields: ["email"]` and does not promote that email into the proposed card draft. If the ledger says Alejandro confirmed the email for the subject, the preview may show it as a future write candidate, but operations still remain `executed=false`.

Every operation has:

```json
{
  "wouldMutate": true,
  "executed": false
}
```

This is deliberate: it shows the future mutation shape while proving nothing was executed.

## Operation Types

- `create_card_candidate`
- `enrich_existing_card`
- `stage_merge_review`
- `stage_deferred_write_review`
- `stage_identity_request`
- `add_evidence`
- `add_service_relationship`
- `mark_restricted_service`
- `add_relationship_context`

## Real Batch Behavior

For the current Juan Jose + Mayerli batch:

- Juan Jose becomes a blocked merge/create review packet from MailerLite evidence.
- Mayerli becomes a deferred review packet before new-card creation.
- Mayerli's draft now keeps the fuller identity candidate found in evidence: `Gladys Mayerli Garcia Ortegon`.
- Google Drive/Sheets evidence later adds a phone candidate for Mayerli and two possible family email candidates.
- Mayerli's draft can propose phone `3115381341`, but it does not assign `mayariana@hotmail.com` or `mayaariana@hotmail.com` because those may belong to Ariana/family.
- Mayerli's identity resolution keeps `missingContactFields: ["email"]` until email ownership is confirmed.
- Both proposed drafts preserve multi-service context.
- All operations are `executed=false`.

## Safety

- Read-only.
- No person-card mutation.
- No merge execution.
- No Fact Store write.
- No outbound messages.
- No live Gmail/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls.
- No credential reads.
- This does not implement a write command.

## Operator Rule

Use this after `card-write-merge-policy`.

If a preview is blocked, Mantis should prepare a review packet or ask for the missing approval/evidence. It should not apply operations.

For ambiguous evidence such as a family/shared email, the next surface is:

```bash
npm run crm:vnext:evidence-review-packet -- --include-expanded-sources --evidence-file ./evidence.json --text "<batch>"
```

That converts the preview into explicit ownership questions without writing anything.

If a decision already exists in the local evidence-review ledger, keep passing the ledger into the preview. This prevents redundant questioning and keeps the future write candidate aligned with Alejandro's latest approved decision.

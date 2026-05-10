# CRM vNext Stitch Batch Review

Date: 2026-05-10
Status: v0 read-only batch review

## Purpose

Stitch Batch Review gives Mantis one operator-friendly view of several contact clues at once.

It combines:

```text
Card Apply Preview + Evidence Review Packet + Evidence Review Decisions Ledger
```

and returns a per-contact recommendation:

- enrich existing card,
- create card candidate,
- review merge-or-create,
- defer write for review,
- ask for more identity.

It does not write anything.

## Surfaces

- API: `POST /api/crm-vnext/stitch-batch-review`
- CLI:

```bash
npm run crm:vnext:stitch-batch-review -- --text "CRM: Juan Jose... @mayuyis2626 es Mayerli..."
npm run crm:vnext:stitch-batch-review -- --include-expanded-sources --evidence-file ./evidence.json --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl --text "<batch>"
```

## What It Produces

Each batch item includes:

- target person id,
- subject label,
- recommended action,
- stage: `approval_ready`, `review_needed`, `identity_needed`, or `deferred`,
- proposed identity fields,
- missing contact fields,
- applied evidence decisions,
- proposed service relationships,
- relationship contexts,
- open evidence questions,
- blockers and next evidence actions,
- operations previewed and proof that none executed.

Identity fields from evidence are filtered per contact. A handle, email, or phone from a neighboring batch sentence should not be promoted into another person's proposed card unless it matches the current contact's identity clue or relevant evidence.

## Mayerli / Ariana Behavior

If the ledger already contains:

```text
mayaariana@hotmail.com = keep_email_unassigned_family_or_companion
```

the batch reviewer:

- keeps Mayerli's primary email as `null`,
- shows `mayaariana@hotmail.com` under `keptUnassignedEmails`,
- does not ask that same question again,
- still asks about another unresolved candidate such as `mayariana@hotmail.com`.

This is the intended compounding loop: ask once, remember, keep moving.

## Safety

- Read-only.
- No person-card mutation.
- No merge execution.
- No Fact Store write.
- No outbound messages.
- No live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls.
- No credential reads.
- A batch review is not card-write approval.

## Operator Rule

Use this after evidence searches and before asking Alejandro to approve a group of card actions.

If `openEvidenceQuestions > 0`, resolve those first through Evidence Review Packet and Evidence Review Decisions.

If an item is `approval_ready`, send it next to Card Write Approval Packet.

Do not apply anything directly from Stitch Batch Review. The approval packet is the next human-facing boundary.

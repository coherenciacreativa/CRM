# CRM vNext Card Write Approval Packet

Date: 2026-05-10
Status: v0 read-only approval packet

## Purpose

Card Write Approval Packet is the pause point between stitching intelligence and any future write path.

It takes the same input as Stitch Batch Review, applies stored evidence decisions, and returns per-contact approval items:

- ready for human approval,
- blocked by open evidence questions,
- blocked by insufficient identity.

It does not write anything.

## Surfaces

- API: `POST /api/crm-vnext/card-write-approval-packet`
- CLI:

```bash
npm run crm:vnext:card-write-approval-packet -- --text "CRM: Juan Jose... @mayuyis2626 es Mayerli..."
npm run crm:vnext:card-write-approval-packet -- --include-expanded-sources --evidence-file ./evidence.json --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl --text "<batch>"
```

## What It Produces

Each approval item includes:

- target person id,
- subject label,
- recommended action,
- identity summary,
- proposed services,
- relationship contexts,
- open questions,
- approval scopes,
- approval checklist,
- blockers and next evidence actions,
- operations previewed,
- `operationsExecuted: 0`.

Approval scopes make the human boundary explicit:

- `card_write_policy`,
- `identity_match`,
- `merge_policy`,
- `privacy_restricted_service`,
- `no_outbound_confirmation`.

## Ready Means

`ready_for_human_approval` means the item has no unresolved evidence questions and can be presented to Alejandro for explicit approval to enter a future reviewed card-write path.

It does not mean:

- write now,
- merge now,
- send a message,
- update MailerLite,
- update Instagram,
- update ManyChat,
- update Google Drive,
- write Fact Store.

## Blocked Means

`blocked_open_evidence_questions` means Mantis should resolve Evidence Review Packet questions first.

`blocked_needs_more_identity` means Mantis should gather a stable email, handle, phone, or strong evidence before returning to approval.

## Mayerli / Ariana Behavior

If the ledger already says:

```text
mayaariana@hotmail.com = keep_email_unassigned_family_or_companion
```

the approval packet keeps that decision visible and does not ask again. If another candidate email remains unresolved, the item stays blocked until that question is decided or ignored.

## Evidence Approval Application

When Alejandro answers a blocked evidence question, use Evidence Approval Application to record the decision and rerun this packet in one step:

```bash
npm run crm:vnext:evidence-approval-application -- \
  --text "<batch>" \
  --evidence-file ./evidence.json \
  --select-email luis.e.lopera@gmail.com=confirm_email_for_subject
```

Dry-run shows the before/after delta. `--write --approved-by Alejandro` stores only the evidence decision ledger entry; it still does not write cards.

## Safety

- Read-only.
- No person-card mutation.
- No merge execution.
- No Fact Store write.
- No outbound messages.
- No live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram calls.
- No credential reads.
- Approval packet only.

## Operator Rule

Use this after Stitch Batch Review.

If an item is ready, ask Alejandro to approve the exact approval item before any future apply/write implementation.

If an item is blocked, do not ask for write approval yet; gather or decide evidence first.

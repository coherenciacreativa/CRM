# CRM vNext Evidence Approval Workbench

Date: 2026-05-10
Status: v0 read-only decision queue

## Purpose

Evidence Approval Workbench gives Mantis one compact queue of unresolved evidence questions.

It answers:

```text
What does Alejandro need to decide so these contacts can advance?
```

It does not store decisions and does not write cards.

## Surfaces

- API: `POST /api/crm-vnext/evidence-approval-workbench`
- CLI:

```bash
npm run crm:vnext:evidence-approval-workbench -- \
  --text-file ./batch.txt \
  --evidence-file ./evidence.json \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl
```

## What It Produces

For every unresolved email ownership question:

- subject/contact label,
- target person id,
- candidate email,
- priority,
- recommended option,
- available options,
- evidence snippets and source kinds,
- a ready-to-use `--select-email` fragment for Evidence Approval Application.

Example:

```text
--select-email mayaariana@hotmail.com=keep_email_unassigned_family_or_companion
```

That fragment is not approval by itself. Mantis should use it only after Alejandro confirms the decision.

## Operator Flow

1. Run Evidence Approval Workbench.
2. Ask Alejandro the compact set of questions.
3. Run Evidence Approval Application with the confirmed `--select-email` decisions.
4. Rerun Card Write Approval Packet.
5. Only then ask for card-write approval on ready items.

## Safety

- Read-only.
- No decision ledger write.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No live connector calls.
- No credential reads.

## Why It Matters

This is the first shape of a conversational approval console for Mantis: instead of asking one identity question at a time, Mantis can batch the unresolved decisions and help Alejandro clear several contacts in one pass.

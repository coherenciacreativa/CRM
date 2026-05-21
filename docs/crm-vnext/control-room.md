# CRM vNext Control Room

Date: 2026-05-22
Status: Implemented v0

## Purpose

The Control Room is the first daily read for CRM vNext.

It exists to prevent the project from drifting into many useful but disconnected scripts. It answers one operational question:

```text
What should Mantis do now, if anything?
```

## Surfaces

- Browser: `/crm-vnext/control-room`
- API: `GET /api/crm-vnext/control-room`
- CLI: `npm run crm:vnext:control-room`

Report form:

```bash
npm run crm:vnext:control-room -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_control_room_2026-05-22.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_control_room_2026-05-22.md
```

## What It Combines

- vNext person card readiness,
- source ledger status,
- signal packet inbox,
- daily operator handoff,
- engagement movement and resolution-loop context through the handoff.

## State Machine

The report chooses one state:

- `blocked`: local CRM readiness is broken.
- `process_signal_delta`: a new saved signal packet should enter the local pipeline preview.
- `source_unblock_required`: a needed source is blocked and requires an explicit human unblock.
- `human_decision_required`: Mantis should ask Alejandro a concrete decision/context question.
- `operator_review`: there is internal work for Mantis, but no outbound/write authority.
- `observe`: no new delta or decision requires action.

## Product Discipline

Control Room is now the first stop before building or running more CRM loops.

Rules:

- no broad decision/resolution loop without signal delta,
- no new builder lane unless it feeds cards, signals, interpretation, operation, or approved action,
- no legacy surface becomes authority unless it feeds the vNext source-of-truth map,
- no outbound or card write is authorized by scores, queues, or the Control Room.

## Safety

The Control Room is read-only and local.

It does not call live APIs, read credentials, mutate person cards, write Fact Store, change score ledgers, touch ManyChat LIVE, or send outbound messages.

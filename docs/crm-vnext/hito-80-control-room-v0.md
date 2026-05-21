# Hito 80 - Control Room v0

Date: 2026-05-22
Status: Implemented

## Why

Alejandro raised the key product risk: CRM could become a pile of scripts created by autonomous builders instead of a coherent command center.

Control Room v0 creates a single daily operating surface for the project.

## Added

- `GET /api/crm-vnext/control-room`
- `/crm-vnext/control-room`
- `npm run crm:vnext:control-room`
- `lib/crm/crm-vnext-control-room.ts`
- `lib/crm/crm-vnext-control-room-markdown.ts`
- `docs/crm-vnext/control-room.md`

## Behavior

The Control Room composes existing safe surfaces:

- readiness,
- source ledger,
- signal packet inbox,
- daily operator handoff.

It chooses one state:

```text
blocked
process_signal_delta
source_unblock_required
human_decision_required
operator_review
observe
```

This makes "what next?" explicit and reduces redundant loops.

## Boundary

The Control Room is read-only and local.

It does not mutate cards, write Fact Store, change scores, call live sources, touch credentials, or send messages.

## Product Decision

From this point, daily CRM work should start here. If Control Room says `observe`, Mantis should not invent a new engagement loop just because an automation woke up.

# Hito 57: Card Write Delta Gate v0

Date: 2026-05-15
Status: implemented

## Why

The 2026-05-15 stitching/enrichment batch was useful but exposed a redundancy problem. Mantis returned 12 approval-ready items, yet the local write preview showed that the current card store already contained the proposed visible fields. Without a gate, Codex or Mantis could keep asking Alejandro to approve writes that add no real card value.

## What Changed

`card-write-apply` now compares an upsert proposal against the current local vNext card before marking it ready.

It blocks a proposed upsert as `blocked_no_material_card_delta` when there is no material change to:

- display name,
- identity fields,
- channel state,
- product/client participation,
- evidence.

`batch-operating-loop` now uses that dry-run result before exposing `readyApprovalItems`. If a card-write approval item is structurally ready but the dry-run says it is a no-op, it no longer gets presented to Alejandro as something worth approving.

Those people are preserved in `noMaterialDeltaQueue`, so the operator still has a next step: ask Alejandro for human context, run a sharper read-only evidence hunt, or generate context-fact proposals.

## Result On The Real Batch

For `/Users/alejandrogomez/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_2026-05-15.json`:

- 12 contacts were processed.
- 12 approval packet items were structurally ready.
- 0 write plan items remained ready after the delta gate.
- 12 items moved into `noMaterialDeltaQueue`.
- The dry-run summary reports `blocked_no_material_card_delta`.
- No cards were written.

## Safety

- Read-only batch rerun.
- No local card writes.
- No Fact Store writes.
- No external connector calls.
- No outbound messages.

## Next Operator Posture

When a batch ends in `blocked_no_material_card_delta`, the correct next move is not to force writes. Instead:

- ask Alejandro for human enrichment on those people,
- run a more specific read-only evidence hunt,
- or generate context-fact proposals if the batch contains story/context worth preserving.

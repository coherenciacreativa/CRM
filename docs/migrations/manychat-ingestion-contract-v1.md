# ManyChat Ingestion Contract v1 (CRM-first)

Date: 2026-03-01  
Status: Implemented in code path with feature flags (shadow-first)

## Purpose
Define one canonical inbound contract for ManyChat/Instagram events so CRM can route, compare, and cut over safely.

## Canonical shape (v1)

Required fields:
- `source_platform`
- `flow_id`
- `flow_name`
- `trigger_type`
- `contact_id`
- `channel`
- `message_text`
- `event_ts` (ISO timestamp)
- `dedupe_key`

Optional fields:
- `message_id`
- `event_name`
- `status_normalized` (`LIVE | STOPPED | DRAFT | UNKNOWN`)
- `raw_flow_status`

## Runtime safety switches

Read on every request (no deploy required):
- `CRM_INGESTION_ENABLED` (default `false`)
- `CRM_INGESTION_SHADOW_ONLY` (default `true`)
- `CRM_FLOW_ALLOWLIST` (comma-separated flow ids/names)
- `MANYCHAT_DIRECT_FALLBACK` (default `true`)

Routing behavior:
1. **Disabled or direct fallback ON** → legacy path only (current behavior preserved)
2. **Enabled + shadow only ON** → legacy path executes, contract is parsed/logged for parity markers
3. **Enabled + shadow only OFF + flow in allowlist + fallback OFF** → normalized-contract route to pipeline

## Dedupe & idempotency
- Contract includes `dedupe_key` via deterministic builder.
- v1 uses compatibility mode (`source_platform + contact_id + normalized message_text`) to align with existing idempotency behavior.
- Legacy dedupe remains the write key in `webhook_events` during this batch for non-breaking rollout.

## Example payload normalizations

### 1) To CRM copy 2
Input fields (common):
- `flow_id=content20250930140219_013526`
- `flow_name=To CRM copy 2`
- `trigger_type=keyword_dm`
- `contact_id=563924665`
- `last_text_input=...`

Output contract:
- `flow_id=content20250930140219_013526`
- `flow_name=To CRM copy 2`
- `trigger_type=keyword_dm`
- `contact_id=563924665`
- `message_text` from DM text extractor

### 2) To CRM copy 3 con flow de audio
Handles nested flow fields (`flow.id`, `flow.name`) and full-contact ids (`user:...`).

### 3) To CRM
Handles legacy field variants (`automation_id`, `automation_name`, `subscriber.id`, `text`).

### 4) Buffer — Accumulate DMs (40s window)
Supports `Full_Contact_Data[].custom_fields.last_dm_text` as message source for buffered DM content.

## Shadow-mode comparison markers
Webhook logs emit:
- `crm_ingestion.shadow_compare`
  - legacy dedupe key
  - contract dedupe key
  - flow metadata
  - contract version

This allows parity checks without changing production write behavior.

## Rollback notes
Immediate rollback options (runtime only):
1. Set `MANYCHAT_DIRECT_FALLBACK=true`
2. Or set `CRM_INGESTION_ENABLED=false`

Both paths revert to legacy webhook pipeline behavior without deploy.

## Next cutover steps
- Define and pin initial `CRM_FLOW_ALLOWLIST` with migrate-first flows.
- Turn off shadow-only for one allowed flow (`To CRM copy 2`) and monitor parity metrics.
- Move webhook event dedupe key source from legacy to contract key after parity confidence window.

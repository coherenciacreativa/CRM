# ManyChat -> CRM Cutover (Batch 1) Checklist

Date: 2026-03-01  
Scope: CRM-first ingestion contract + rollback switches (read-only inventory completed)

## 1) Lock CRM-first ingestion contract (do now)
- [x] Define canonical payload schema for inbound events from ManyChat triggers:
  - `source_platform`, `flow_id`, `flow_name`, `trigger_type`, `contact_id`, `channel`, `message_text`, `event_ts`, `dedupe_key`
- [x] Freeze required fields vs optional fields and publish version tag (`v1`).
- [x] Confirm idempotency rule (`dedupe_key` + time window) and replay behavior.
- [x] Map status normalization (`LIVE/STOPPED/DRAFT`) for observability only (not routing logic).
- [x] Add contract tests with sample payloads from top-priority flows:
  - `To CRM copy 2`
  - `To CRM copy 3 con flow de audio`
  - `To CRM`
  - `Buffer — Accumulate DMs (40s window)`

## 2) Build safe routing switches (before any production flip)
- [x] Add env-based toggle: `CRM_INGESTION_ENABLED` (default OFF in prod).
- [x] Add shadow mode toggle: `CRM_INGESTION_SHADOW_ONLY` (ON for dry-run compare).
- [x] Add per-flow allowlist toggle: `CRM_FLOW_ALLOWLIST` (start with migrate-first flows only).
- [x] Add hard bypass: `MANYCHAT_DIRECT_FALLBACK=ON` to immediately stop CRM path if needed.
- [x] Ensure toggles are runtime-configurable without deploy (feature flag/config service).

## 3) Observability + rollback guardrails
- [ ] Dashboard: ingestion success rate, dedupe hit rate, processing latency p50/p95, per-flow error rate.
- [ ] Alert thresholds:
  - Error rate > 2% for 5 minutes
  - Latency p95 > target SLA
  - Dedupe spike anomaly
- [ ] Implement rollback runbook (single command/flag set) with owner + escalation contact.
- [ ] Define rollback trigger criteria and decision window (e.g., 10 min sustained breach).

## 4) Cutover execution sequence (Batch 1)
- [ ] Start shadow mode for migrate-first flows and compare CRM vs current behavior.
- [ ] Validate parity on sample conversations and lead records.
- [ ] Enable CRM ingestion for `To CRM copy 2` first.
- [ ] Monitor for one full traffic window; then enable remaining migrate-first flows.
- [ ] Keep `Say hi to new followers` live in ManyChat unchanged during Batch 1.

## 5) Post-cutover hygiene
- [ ] Tag archive candidates with owner + confirmation deadline (no immediate disable/delete).
- [ ] Capture final decision log per flow (keep/migrate/archive) in migration tracker.
- [ ] Schedule Batch 2 review for drafts and legacy campaign flows.

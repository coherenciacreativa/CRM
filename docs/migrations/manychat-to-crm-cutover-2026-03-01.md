# ManyChat -> CRM Cutover Plan (2026-03-01)

## Objective
Reduce dependency on ManyChat as a middleman while preserving Instagram automation throughput and data quality.

## Current state (observed)
- ManyChat account accessible (`fb2853446`, PRO) with Instagram connected.
- Key active automations include:
  - `Say hi to new followers` (LIVE)
  - `To CRM copy 2` (LIVE, high runs)
- Significant legacy debt:
  - many `STOPPED` / `DRAFT` / `Untitled` automations
  - duplicated `To CRM*` variants and old keyword-trigger experiments.
- CRM repo already has production ingestion pieces:
  - `/api/manychat-webhook` (Vercel)
  - `manychat_cli` + Supabase + MailerLite sync
  - replay endpoint `/api/reprocess-events`

## Migration matrix (initial)

### A) Keep live for now (guardrail)
1. `Say hi to new followers` (LIVE)
   - Keep while direct IG follower-trigger replacement is validated.
   - Reason: business-critical greeting capture.

2. `To CRM copy 2` (LIVE)
   - Keep temporarily as ingress trigger.
   - Refactor content/logic to call CRM endpoint as source of truth.

### B) Migrate first (high leverage)
1. `To CRM*` family (copy/variants)
   - Consolidate into single CRM-owned pipeline with feature flags.
   - Goal: one canonical event schema + dedupe.

2. `email capture upon ad click` (DRAFT)
   - Move to CRM event model (ad source metadata + lead normalization).
   - Keep ManyChat only for trigger surface if required.

3. Qualification DM flows (`LAUNCH Approved DM`, `LAUNCH Unqualified DM`, `Notify when "quiero"`)
   - Reimplement decisioning in CRM rules engine.
   - Use ManyChat only as optional transport shell.

### C) Archive/cleanup candidates (safe debt removal)
- Old `Untitled` drafts with no runs / stale triggers
- Old `Message contains ...` broad-keyword catch-all flows
- Stopped duplicate `To CRM` flows not referenced by current campaigns
- Single-reel legacy experiments no longer used

## Target architecture

Instagram (events) -> Ingress API (CRM) -> Queue + dedupe -> Contact/Interaction store (Supabase) ->
Rules/Scoring -> Outbound action adapter (IG API or temporary ManyChat action) -> Observability/alerts.

## 3-phase cutover

### Phase 1: Stabilize + declutter (no behavior regressions)
- Inventory all LIVE flows + triggers + destination actions.
- Freeze new ad-hoc automations.
- Soft-archive stale STOPPED/DRAFT duplicates (reversible checklist).

### Phase 2: CRM-first logic
- Route core parsing, enrichment, lead scoring, and routing decisions through CRM endpoints.
- Keep ManyChat as thin trigger layer where Meta API parity is not yet 1:1.
- Add idempotency keys and replay safety for all ingress events.

### Phase 3: Middleman minimization
- Replace eligible ManyChat triggers/actions with direct Meta webhooks + messaging APIs.
- Keep only unavoidable ManyChat features (if any) behind explicit cost/benefit gates.

## Success metrics
- >=70% of business logic executed in CRM (not in ManyChat builder).
- >=50% reduction of active ManyChat automations.
- 0 data-loss incidents during cutover.
- Faster lead-to-CRM latency and clearer audit trail.

## Immediate next execution batch
1. Generate full automation inventory export (name, status, triggers, runs, modifiedAt).
2. Create `crm_flow_registry` table (or equivalent JSON source) as source-of-truth map.
3. Implement one canonical `ig_event_ingest` endpoint contract used by all active flows.
4. Migrate `To CRM copy 2` into CRM-owned orchestrator while keeping rollback switch.

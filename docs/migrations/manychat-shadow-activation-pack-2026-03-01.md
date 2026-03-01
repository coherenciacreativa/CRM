# ManyChat → CRM Shadow Activation Pack (Same-Day)

Date: 2026-03-01  
Flow in scope: `To CRM copy 2` (`content20250930140219_013526`)  
Mode: **shadow first**, no production deploy in this batch.

## 1) Exact runtime flags (shadow start)

Set these exact values in the runtime receiving webhook traffic:

```env
CRM_INGESTION_ENABLED=true
CRM_INGESTION_SHADOW_ONLY=true
CRM_FLOW_ALLOWLIST=content20250930140219_013526,to crm copy 2
MANYCHAT_DIRECT_FALLBACK=true
```

Expected route behavior with this exact set:
- `route_mode=shadow`
- Legacy pipeline remains source of truth.
- Contract path runs for comparison signals only.

## 2) Operator sequence (same day)

1. Confirm local main includes merge commit `3662f9098047fa3f181457fd3dcaf33ffaa658e9`.
2. Run local smoke (`npm run smoke:shadow`) and targeted tests before touching runtime flags.
3. Apply exact shadow flags above.
4. Run a short shadow window (60–120 min) for flow allowlist only.
5. Evaluate promote/rollback criteria below.

## 3) Verification checks during shadow

## A. Pre-window checks
- [ ] Allowlist includes only:
  - `content20250930140219_013526`
  - `to crm copy 2`
- [ ] `route_mode=shadow` is returned on simulate requests.
- [ ] Contract emits required fields (`flow_id`, `flow_name`, `contact_id`, `message_text`, `dedupe_key`).

Suggested validation request (non-destructive):

```bash
curl -X POST "<preview_url>/api/manychat-webhook?simulate=1&dry=1" \
  -H "Content-Type: application/json" \
  -H "x-debug-token: <debug_token>" \
  --data @./docs/migrations/samples/to-crm-copy-2-sanitized.json
```

## B. In-window checks (every 10–15 min)
- [ ] No sustained webhook `5xx` bursts (>3 in 5 min).
- [ ] No `persist_failed` responses.
- [ ] `contract_dedupe_key` stable for repeated payloads.
- [ ] Identity status distribution stable (`matched`/`none`/`conflict`) with no unsafe merge pattern.
- [ ] Flow-level throughput within expected low-volume band (±5% vs baseline sample).

## 4) Promote criteria (same-day)

Promote only if **all** are true for the full shadow window:

1. Critical incidents: **0**
2. Required contract completeness: **>=99%**
3. Identity safety: **0 unsafe merge events**
4. Conflict/ambiguous identity rate: **<=5%** and non-increasing trend
5. Throughput parity for allowlisted flow: **within ±5%**

## 5) Promote flag flip (when criteria pass)

Flip only these values:

```env
CRM_INGESTION_ENABLED=true
CRM_INGESTION_SHADOW_ONLY=false
CRM_FLOW_ALLOWLIST=content20250930140219_013526,to crm copy 2
MANYCHAT_DIRECT_FALLBACK=false
```

Post-flip watch window: 30 min with critical-only alerts.

## 6) Rollback criteria and actions

Rollback immediately if any condition is hit:
- Sustained `5xx` >5 min
- `persist_failed` appears in 2 consecutive checks
- Identity conflict/ambiguous exceeds 5% for recent bucket
- Confirmed downstream sync gap >10 min

Rollback actions (fastest first):

```env
# immediate failback
MANYCHAT_DIRECT_FALLBACK=true

# optionally disable CRM path
CRM_INGESTION_ENABLED=false

# or remain compare-only
CRM_INGESTION_SHADOW_ONLY=true

# reduce scope completely if needed
CRM_FLOW_ALLOWLIST=
```

## 7) Critical-only alert routing

Route only critical signals to paging/operator channel (example: `#crm-alerts-critical`):

**Route to critical channel:**
- Sustained webhook `5xx` burst
- `persist_failed` on webhook event persistence
- Identity conflict/ambiguous spike above threshold
- Downstream sync interruption for allowlisted flow

**Do not page (log-only):**
- Single malformed payload
- One-off 4xx already handled as non-blocking
- Isolated transient retriable failures

Minimal alert payload fields for triage:
- `severity`, `title`, `message`, `timestamp`
- `flow_id`, `flow_name`, `route_mode`
- `contact_id`/`message_id` (if present)
- current flag snapshot (`enabled`, `shadow_only`, `direct_fallback`, `allowlist`)

## 8) End-of-window operator log

Record:
- start/end timestamps
- exact flag values
- PASS/FAIL against promote criteria
- decision: `promote` / `continue shadow` / `rollback`
- blocker summary (if any)

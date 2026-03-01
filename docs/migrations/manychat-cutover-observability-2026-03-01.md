# Cutover Observability Checklist (Critical-Only)

Date: 2026-03-01  
Flow focus: `To CRM copy 2`  
Mode: low-volume fast cutover

## Alerting principle

During cutover, alert only on **customer-impacting or data-integrity criticals**.  
Everything else is log-only for follow-up.

## Critical signals (page-worthy)

- Webhook endpoint sustained 5xx (>3 in 5 minutes).
- Event persistence failure (`persist_failed`) for new webhook events.
- Identity stitching unsafe state:
  - repeated `conflict`/`ambiguous` spikes above baseline.
- MailerLite hard failure burst (not single transient) causing lead sync gap.
- Sudden drop in processed events for allowlisted flow (>20% vs prior 30-min baseline).

## Non-critical (log + review, no page)

- Single malformed payload.
- Isolated low-confidence parsing alerts.
- One-off 422/409 subscriber conflicts when already handled non-blocking.

## Pre-cutover checklist

- [ ] Confirm `CRM_FLOW_ALLOWLIST` includes only `To CRM copy 2` identifiers.
- [ ] Confirm shadow flags are set as planned.
- [ ] Confirm alert webhook/channel is reachable.
- [ ] Confirm debug/simulate route works in preview (`simulate=1&dry=1`).

## Shadow window checklist

- [ ] Verify `route_mode=shadow` responses for sampled traffic.
- [ ] Compare legacy and contract dedupe keys for sample set.
- [ ] Track identity resolution status distribution (`matched` / `none` / `conflict`).
- [ ] Check no sustained 5xx or persist failures.

## Promote window checklist (first 30 minutes)

- [ ] Flip to CRM route (`shadow_only=false`, `direct_fallback=false`) for allowlisted flow.
- [ ] Confirm first successful CRM-routed events end-to-end.
- [ ] Watch critical dashboard every 5 minutes (not continuous paging noise).
- [ ] Keep rollback switch ready and documented in operator channel.

## Rollback trigger thresholds

Initiate rollback immediately if any condition is true:

1. 5xx burst persists >5 minutes.
2. Persist failures for webhook events are non-zero for 2 consecutive checks.
3. Identity conflict/ambiguous rate exceeds 5% of recent events.
4. Lead sync gap confirmed (events received but not reaching downstream) for >10 minutes.

## Minimal dashboard widgets

- Webhook requests/min + 2xx/4xx/5xx split.
- `webhook_events` NEW→PROCESSED latency + FAILED count.
- Identity resolution status counts by 5-minute bucket.
- MailerLite sync success/failure rate.
- Flow-level count for `content20250930140219_013526`.

## Operator handoff note

At end of window, log:
- exact flag values used,
- start/end timestamps,
- incident(s) observed,
- decision: continue / rollback / re-run shadow.

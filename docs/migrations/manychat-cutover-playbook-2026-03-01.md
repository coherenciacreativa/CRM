# ManyChat → CRM Cutover Playbook (Low-Volume Fast Path)

Date: 2026-03-01  
Scope: Flow `To CRM copy 2` (`content20250930140219_013526`)  
Goal: Validate CRM ingestion + identity stitching on low volume, then promote same day if healthy.

## 1) Preconditions (no-prod-deploy path)

- Branch with contract + identity stitching is deployed to a **preview/non-prod endpoint** only.
- ManyChat flow remains unchanged except temporary webhook destination toggle for shadow window.
- Feature flags available in target runtime:
  - `CRM_INGESTION_ENABLED`
  - `CRM_INGESTION_SHADOW_ONLY`
  - `CRM_FLOW_ALLOWLIST`
  - `MANYCHAT_DIRECT_FALLBACK`
- `CRM_FLOW_ALLOWLIST` includes only:
  - `content20250930140219_013526`
  - `to crm copy 2`

## 2) Synthetic replay approach (pre-shadow confidence)

Use sanitized historical payloads from `To CRM copy 2` and replay to preview endpoint.

### Replay set
- 20–50 events total, including:
  - normal text lead
  - duplicate message sample (same contact + same text)
  - missing optional fields
  - alternate casing for email/username
  - one intentionally malformed payload

### Replay checks
- Contract v1 created (`flow_id`, `flow_name`, `contact_id`, `message_text`, `dedupe_key`).
- Dedupe remains deterministic for repeated payloads.
- Identity resolution returns expected status (`matched`, `none`, or guarded `conflict`; never unsafe merge).
- No 5xx responses.

### Suggested replay command
```bash
curl -X POST "<preview_url>/api/manychat-webhook?simulate=1&dry=1" \
  -H "Content-Type: application/json" \
  -H "x-debug-token: <debug_token>" \
  --data @./docs/migrations/samples/to-crm-copy-2-sanitized.json
```

## 3) Same-day shadow window (recommended: 60–120 min)

### Shadow configuration
- `CRM_INGESTION_ENABLED=true`
- `CRM_INGESTION_SHADOW_ONLY=true`
- `MANYCHAT_DIRECT_FALLBACK=true`
- `CRM_FLOW_ALLOWLIST` restricted to `To CRM copy 2`

### During shadow
- Keep legacy behavior as source of truth.
- Compare contract dedupe (`contract_dedupe_key`) vs legacy dedupe for sampled events.
- Monitor:
  - webhook success rate
  - identity conflicts/ambiguity spikes
  - MailerLite sync failures (should be non-blocking where expected)

## 4) Quick promote criteria (same day)

Promote only if **all** hold during the shadow window:

1. Error budget: 0 critical incidents and <1% transient failures.
2. Contract completeness: >=99% of events with required contract fields.
3. Identity safety: 0 unsafe merges; conflict rate stable/no spike.
4. Throughput parity: event count in CRM path roughly matches legacy (+/-5%).
5. Operator sign-off in incident channel/log.

## 5) Promote procedure (fast cutover)

1. Set:
   - `CRM_INGESTION_ENABLED=true`
   - `CRM_INGESTION_SHADOW_ONLY=false`
   - `MANYCHAT_DIRECT_FALLBACK=false`
2. Keep allowlist restricted to `To CRM copy 2` for first wave.
3. Watch critical alerts for 30 min after switch.
4. If stable, keep running and schedule next flow onboarding.

## 6) Rollback switches (instant, non-destructive)

Use the following in order of speed:

1. **Immediate failback**: `MANYCHAT_DIRECT_FALLBACK=true`
2. **Disable CRM path**: `CRM_INGESTION_ENABLED=false`
3. **Re-enter compare-only mode**: `CRM_INGESTION_SHADOW_ONLY=true`
4. **Scope reduction**: remove `To CRM copy 2` from `CRM_FLOW_ALLOWLIST`

Rollback expectation: no ManyChat deletion, no automation removal, no data-destructive operations.

## 7) Operator notes

- Keep legacy flow intact for at least 24h after successful promote.
- Do not run production deploy as part of this playbook.
- If identity conflicts rise, pause promotion and inspect candidate records manually.
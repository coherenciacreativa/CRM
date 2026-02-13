# Incident Note - 2026-02-13

## Summary

- Incident: ManyChat webhook event `1115` appeared as `FAILED` in CRM dashboard.
- Timestamp: `2026-02-13 15:15:49.977028+00` (10:15:49 AM local).
- Initial error recorded in `webhook_events.error`: `Mailerlite 422`.
- Verification event after fix: `1119` with status `PROCESSED`.

## Root Cause

The pipeline treated MailerLite HTTP `422` as a hard failure, so a single invalid subscriber payload could mark the whole webhook event as `FAILED`.

## Fix Applied

File updated: `api/manychat-webhook.ts`

1. Validate and normalize email before MailerLite sync.
2. On MailerLite `422`, retry once with a minimal payload (`email`, `groups`, `resubscribe`).
3. If `422` persists after minimal retry, log warning and skip MailerLite sync for that event instead of failing the full pipeline.

Production deploy completed to `crm-manychat-webhook.vercel.app` on 2026-02-13.

## Post-Fix Checks

- `GET /api/healthz` returns `ok: true`, `supabase_ok: true`, `mailerlite_key_present: true`.
- Unauthorized probe to `POST /api/manychat-webhook` returns `401` as expected.
- New real test event (`1119`) processed successfully.

## Monitoring (next 24-48h)

1. Watch `webhook_events` for new `FAILED` rows.
2. If failures appear, inspect `error` column first.
3. Prioritize action only if failures are consecutive or impact live lead ingestion.


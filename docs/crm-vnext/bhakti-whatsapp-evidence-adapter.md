# Bhakti WhatsApp Evidence Adapter v0

Date: 2026-05-27
Status: read-only adapter, approval packet before any card write

## Purpose

Bhakti WhatsApp is a high-value CRM vNext source for phone numbers and digital-product participation signals. The adapter treats Bhakti as evidence and signal input, not as a parallel source of truth.

It reads:

- Bhakti Supabase `users` via GET only.
- Optional compact `event_log` samples by exact `user_phone`.
- Local CRM vNext person-card store.

It emits:

- Existing-card enrichment candidates when Bhakti can fill missing phone/email fields.
- Review-card proposals when a Bhakti user has email + phone but no current CRM card.
- Review-only conflicts when identity points to multiple cards or would overwrite an existing identity.
- Canonical `bhakti_whatsapp` signal events for the Signal Event Pipeline.

## Command

```bash
npm run crm:vnext:bhakti-whatsapp-evidence -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_evidence_adapter_v0_YYYYMMDD.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_evidence_adapter_v0_YYYYMMDD.md \
  --events-out ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_signal_events_v0_YYYYMMDD.json
```

Then dry-run scoring impact:

```bash
npm run crm:vnext:signal-event-pipeline -- \
  --events-file ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_signal_events_v0_YYYYMMDD.json \
  --source-label "Bhakti WhatsApp evidence adapter v0" \
  --collector Codex \
  --out ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_signal_pipeline_dry_run_YYYYMMDD.json
```

And dry-run the local card apply packet:

```bash
npm run crm:vnext:bhakti-whatsapp-apply -- \
  --evidence-file ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_evidence_adapter_v0_YYYYMMDD.json \
  --apply-all-ready \
  --out ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_apply_dry_run_YYYYMMDD.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_bhakti_whatsapp_apply_dry_run_YYYYMMDD.md
```

## Safety

- No Supabase mutations.
- No Twilio calls.
- No WhatsApp outbound.
- No MailerLite mutations.
- No Fact Store writes.
- No CRM card writes.
- No credential printing.
- Existing phone/email fields are never overwritten automatically.

## Write Gate

The adapter's `readyWriteItems` are only a local dry-run packet. A later apply step must still:

- receive explicit Alejandro approval,
- re-read the current card store,
- re-check dedupe/conflict status,
- write only local CRM card-store files,
- create a backup before mutation,
- append a local receipt ledger.

The guarded apply runner is `npm run crm:vnext:bhakti-whatsapp-apply`. It defaults to dry-run and requires `--write --approved-by <name>` before local card-store mutation.

# CRM vNext Mantis Evidence Import

Date: 2026-05-10
Status: v0 read-only CLI

## Purpose

Mantis Evidence Import turns a Mantis read-only investigation report into the two artifacts CRM vNext already understands:

- CRM fact text,
- `evidenceSources` packets.

This is the bridge from natural operator work to the guarded card pipeline.

## CLI

```bash
npm run crm:vnext:mantis-evidence-import -- \
  --report-file ~/Documents/Mantis-Reports/juana_ig_retreat_evidence_hunt_2026-05-10.json \
  --handles @gulnarapaola,@lavivirozo \
  --min-confidence high \
  --out tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --text-out tmp/crm-vnext/juana_ig_retreat_actionable_import.txt
```

The generated JSON can be passed as `--evidence-file` to:

- Evidence Approval Workbench,
- Evidence Review Decisions,
- Card Write Approval Packet,
- Stitch Batch Review.

The generated text can be passed as `--text-file`.

## Safety

- No card writes.
- No Fact Store writes.
- No outbound messages.
- No live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram calls.
- No credential reads.
- Local paths from Mantis evidence are not copied into the import packet.

## Operator Pattern

Use this when Mantis has already investigated outside the CRM runtime and produced a selected evidence report.

```text
Mantis evidence hunt JSON
-> Mantis Evidence Import
-> Evidence Approval Workbench
-> Evidence Review Decisions
-> Card Write Approval Packet
-> Card Write Apply
```

This keeps the system flexible: Mantis can search in Gmail, Drive, Contacts, MailerLite exports, local files, or Chrome, but CRM still receives evidence through one standard contract.

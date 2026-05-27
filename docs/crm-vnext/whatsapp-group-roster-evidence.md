# CRM vNext WhatsApp Group Roster Evidence

Date: 2026-05-27
Status: v0 read-only evidence adapter

## Purpose

This lane turns a WhatsApp group member roster into CRM vNext evidence without reading chat bodies or mutating WhatsApp.

The first use case is the `Encuentro Feliz` group. Its roster is useful because it contains people who have enough community proximity to be worth stitching, and it exposes phones for some members.

## Command

```bash
npm run crm:vnext:whatsapp-group-roster-evidence -- \
  --roster-file ~/Documents/Mantis-Reports/whatsapp_encuentro_feliz_roster_YYYYMMDD.json \
  --use-macos-contacts-db \
  --out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_evidence_YYYYMMDD.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_evidence_YYYYMMDD.md \
  --events-out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_signal_events_YYYYMMDD.json
```

Guarded local apply, after explicit approval:

```bash
npm run crm:vnext:whatsapp-group-roster-apply -- \
  --evidence-file ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_evidence_YYYYMMDD.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_apply_dry_run_YYYYMMDD.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_apply_dry_run_YYYYMMDD.md
```

To commit the conservative existing-card enrichment lane:

```bash
npm run crm:vnext:whatsapp-group-roster-apply -- \
  --evidence-file ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_evidence_YYYYMMDD.json \
  --write \
  --approved-by Alejandro \
  --out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_apply_EXECUTED_YYYYMMDD.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_whatsapp_encuentro_feliz_roster_apply_EXECUTED_YYYYMMDD.md \
  --fail-on-blocked
```

## Safety

- Read-only.
- No WhatsApp messages.
- No group changes.
- No Contacts mutation.
- No CRM card writes.
- No Fact Store writes.
- No outbound.
- The apply runner only writes local CRM cards after `--write --approved-by <name>`, creates a backup, and appends a ledger entry.

## Merge Semantics

Allowed as ready evidence:

- exact email bridge from macOS Contacts to an existing CRM card,
- exact phone bridge from WhatsApp roster or Contacts to an existing CRM card,
- phone/email absent-field enrichment only.

Not allowed as ready evidence:

- name-only matching,
- generic first-name matching,
- group membership treated as attendance,
- overwriting an existing phone/email.

Phone-only group members can become review-card candidates, but only after explicit human approval. The default packet marks them as review candidates, not as automatic writes.

The v0 apply runner intentionally applies only existing-card enrichments. It does not create new cards from phone-only group members; those require a separate approval packet.

## Signal Semantics

The adapter emits optional low-strength `group_membership_observed` signal events. These should feed the Signal Event Ledger only after review. Membership in the group means the person is connected to the Encuentro Feliz channel; it does not prove they attended a specific gathering.

# Hito 37: Mantis Evidence Import v0

Date: 2026-05-10

## What Happened

Mantis completed a read-only evidence hunt for the Juana/IG retreat batch and saved:

```text
~/Documents/Mantis-Reports/juana_ig_retreat_evidence_hunt_2026-05-10.json
```

CRM vNext now has a CLI that converts that report into CRM-native inputs:

```bash
npm run crm:vnext:mantis-evidence-import
```

The first import selected the two high-confidence, actionable matches:

- `@gulnarapaola` -> Gulnara Paola Castaño Reyes, candidate email `gulnacast@gmail.com`, candidate phone `+57 300 4477735`.
- `@lavivirozo` -> Viviana Rozo Maldonado, candidate email `viviana.rozo@kaplan.com`.

The import produced:

- 2 selected results,
- 11 evidence sources,
- 0 operations executed,
- no card mutation readiness by itself.

## Pipeline Result

The generated import was passed into:

```bash
npm run crm:vnext:evidence-approval-workbench -- \
  --text-file tmp/crm-vnext/juana_ig_retreat_actionable_import.txt \
  --evidence-file tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --source-kind instagram_signal \
  --reporter Mantis \
  --channel codex \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl

npm run crm:vnext:card-write-approval-packet -- \
  --text-file tmp/crm-vnext/juana_ig_retreat_actionable_import.txt \
  --evidence-file tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --source-kind instagram_signal \
  --reporter Mantis \
  --channel codex \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl
```

The approval packet correctly blocked both items on email-ownership decisions:

- Gulnara: confirm whether `gulnacast@gmail.com` belongs to `@gulnarapaola`.
- Viviana: confirm whether `viviana.rozo@kaplan.com` belongs to `@lavivirozo`.

No card write happened.

## Dry-Run Decision Check

This dry-run was validated:

```bash
npm run crm:vnext:evidence-review-decisions -- \
  --text-file tmp/crm-vnext/juana_ig_retreat_actionable_import.txt \
  --evidence-file tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --source-kind instagram_signal \
  --reporter Mantis \
  --channel codex \
  --select-email gulnacast@gmail.com=confirm_email_for_subject \
  --select-email viviana.rozo@kaplan.com=confirm_email_for_subject
```

It would create two decision records if Alejandro approves later, but it was not committed.

## Next Human Decision

If Alejandro confirms both mappings, the next command can store evidence decisions:

```bash
npm run crm:vnext:evidence-review-decisions -- \
  --text-file tmp/crm-vnext/juana_ig_retreat_actionable_import.txt \
  --evidence-file tmp/crm-vnext/juana_ig_retreat_actionable_import.json \
  --source-kind instagram_signal \
  --reporter Mantis \
  --channel codex \
  --select-email gulnacast@gmail.com=confirm_email_for_subject \
  --select-email viviana.rozo@kaplan.com=confirm_email_for_subject \
  --approved-by Alejandro \
  --write
```

After that, rerun Card Write Approval Packet and then use the guarded card write path.

## Strategic Meaning

This is a practical step toward natural-language CRM operation:

```text
"Mantis, probemos un batch nuevo"
-> evidence hunt
-> standard import
-> approval questions
-> controlled card update
```

Mantis can work in natural investigative mode while CRM vNext keeps a narrow, auditable contract.

## Safety

No CRM cards were changed.

No Fact Store write happened.

No MailerLite, Instagram, ManyChat, Gmail, Google Drive, WhatsApp, Telegram, or credential mutation happened.

The only write-like check was a dry-run evidence decision preview with `committed=false`.

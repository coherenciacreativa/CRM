# Hito 67 - Card Store Durability Snapshot v0

Date: 2026-05-21
Status: Implemented

## Why This Matters

CRM vNext now has enough community cards and evidence to require real
durability. The local card store is useful but sensitive: it should be backed up
off-machine without being readable by Apple, Google, git, or accidental file
viewers.

## Implemented Surface

Command:

```bash
npm run crm:vnext:snapshot -- --verify
```

First trusted-machine initialization:

```bash
npm run crm:vnext:snapshot -- --init-keychain-secret --verify
```

Script:

```text
scripts/crm-vnext-snapshot.mjs
```

Runbook:

```text
docs/crm-vnext/card-store-durability-runbook.md
```

## Behavior

- Validates `.crm-vnext/person-card-store/person-cards-vnext.json`.
- Archives `.crm-vnext`, excluding nested snapshots.
- Encrypts locally with AES-256-GCM.
- Uses `CRM_VNEXT_SNAPSHOT_SECRET` when supplied, otherwise macOS Keychain.
- Can create the Keychain secret on first run with `--init-keychain-secret`.
- Writes local encrypted snapshot under `.crm-vnext/snapshots/local`.
- Copies encrypted snapshot to iCloud Drive by default.
- Optionally decrypts and restores in a temp folder with `--verify`.
- Writes JSON/Markdown reports to `~/Documents/Mantis-Reports`.

## Guardrails

- No CRM personal content printed.
- No encryption secret printed.
- No plain archive copied to cloud.
- No git tracking of CRM private data.
- No outbound messages.
- No live API calls.
- No external data mutations except copying encrypted bytes to the selected
  cloud folder.

## Automation Recommendation

After the first verified snapshot succeeds, enable a daily quiet-window backup.
Use local scheduling rather than a model-heavy loop where possible. The routine
should only alert Alejandro when the command fails, the Keychain secret is
missing/unavailable, iCloud destination is unavailable, or restore verification
fails.

Do not rely on automation alone for disaster recovery until the snapshot secret
has an independent recovery copy outside this Mac.


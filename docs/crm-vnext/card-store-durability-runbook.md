# CRM vNext Card Store Durability Runbook

Date: 2026-05-21
Status: Implemented v0

## Purpose

Protect the local CRM vNext community card store before the system becomes more
automatic.

The card store contains personal community data, service relationships, emails,
phones, source evidence, scoring context, and restricted relationship notes. It
must not be pushed to git or uploaded to cloud storage in plain text.

## Source Of Truth

Current local source of truth:

```text
.crm-vnext/person-card-store/person-cards-vnext.json
```

Current local state root:

```text
.crm-vnext/
```

This folder is ignored by git because it contains private CRM data.

## Snapshot Command

Create an encrypted snapshot and copy it to iCloud Drive:

```bash
npm run crm:vnext:snapshot -- --verify
```

First-time setup on a trusted Mac:

```bash
npm run crm:vnext:snapshot -- --init-keychain-secret --verify
```

The command:

- validates the person-card store JSON,
- archives `.crm-vnext` while excluding nested snapshots,
- encrypts the archive locally with AES-256-GCM,
- stores/reads the encryption secret from macOS Keychain,
- writes a local encrypted snapshot,
- copies only the encrypted snapshot to iCloud Drive,
- verifies the snapshot by decrypting and restoring it in a temporary folder,
- writes a JSON and Markdown report to `~/Documents/Mantis-Reports`.

Default cloud destination:

```text
~/Library/Mobile Documents/com~apple~CloudDocs/Mantis-Archive/CRM-vNext-Snapshots
```

## Recovery Model

Automation uses the Keychain secret on this Mac.

Disaster recovery must not depend on Alejandro remembering a passphrase. The
recovery secret should also exist outside this Mac, but not in the repo and not
in chat. Recommended storage:

- a trusted password manager that does not depend only on the same iCloud
  account,
- and/or a sealed printed recovery kit in a secure physical place.

Until that independent recovery copy exists, encrypted iCloud snapshots protect
against accidental local corruption, but they are not yet a complete
Mac-lost-or-stolen disaster recovery solution.

## Advanced Data Protection

Current observed iCloud state on 2026-05-21:

- iCloud Drive: on.
- Advanced Data Protection: off.
- Access iCloud Data on the Web: on.

Long-term recommendation:

1. Keep CRM snapshots encrypted locally before cloud copy.
2. Create independent recovery for the snapshot secret.
3. Set up Apple recovery contact and/or recovery key.
4. Only then consider enabling iCloud Advanced Data Protection.

This order avoids a brittle setup where stronger cloud encryption makes recovery
harder than Alejandro's real project load can safely support.

## Automatic Backup Policy

Active cadence after v0 verification:

- Daily encrypted snapshot during a quiet local window.
- Run immediately after large approved CRM write batches when practical.
- Keep reports in `~/Documents/Mantis-Reports`.
- User-facing noise policy: failure-only. Do not send a daily success report.
- Alert Alejandro only on failure, missing Keychain access, missing iCloud path,
  insufficient disk space, or restore-test mismatch.

Preferred implementation:

- a local/scheduled automation that runs the command,
- low/no reasoning for routine execution,
- concise alert only when blocked or unhealthy.

Current Codex app automation:

```text
crm-vnext-encrypted-snapshot-backup
```

Schedule:

```text
Daily at 03:20 local scheduler time
```

Command:

```bash
npm run crm:vnext:snapshot -- --verify
```

Success behavior:

- create encrypted local and iCloud snapshots,
- create local reports,
- do not produce a daily conversational report.

Failure behavior:

- notify Alejandro with the exact unblock action,
- include the local report/log path,
- never print secrets, decrypted archives, CRM personal content, or tokens.

## Safety

- Never print the encryption secret.
- Never commit `.crm-vnext` or decrypted snapshots.
- Never copy plain CRM archives to iCloud/Drive.
- Never treat a successful cloud copy as proof of recoverability unless the
  restore test also passes.
- No outbound contact messages are involved.

# AGENTS.md

## Session Defaults (Read First)

- Default mode for this repository is `STRICT_SECRET_MODE`.
- In every new session, assume strict mode is ON unless the user explicitly asks to disable it for that session.
- Before any credential task, restate: `Strict secret mode ON (no secret output, no env dumps).`

## Project Routing: Launch OS Work

For Launch OS, MailerLite, microproduct market-learning, or Goals/play resume
work, use the Launch OS context routing docs before broad hydration:

1. `docs/crm-vnext/launch-os-codex-profile.md`
2. `docs/crm-vnext/launch-os-next-action.md`
3. `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`

Do not deep-read OpenClaw/Mantis soul, identity, broad memory, or unrelated
repos by default for routine Launch OS development. Escalate only when the
Codex Profile or active next action calls for it.

This routing does not weaken strict secret mode, live-gate discipline, exact
approval requirements, or the prohibition on printing secrets.

## Strict Secret Mode Rules

1. Never print secret values to terminal output or chat.
2. Never paste secrets into chat.
3. Never read or dump full env files.
4. Never run commands that can expose all env vars.
5. Use keychain + provider secret stores only; no plaintext secrets in tracked files.

## Forbidden Commands (Strict Mode)

- `cat .env`, `cat .env.local`, `cat .env.*`
- `sed`, `awk`, `rg`, `grep` commands that print secret-bearing `.env*` values
- `vercel env pull` (writes all secrets to a local file)
- `env`, `printenv`, `export -p`, `set` (or equivalent full env dumps)
- `echo $SECRET` patterns (any command that prints secret variables)

## Allowed Secret Handling Patterns

- Store/update via hidden prompt (or keychain helper scripts when available).
- Read secrets into ephemeral shell variables only for direct API/CLI usage.
- Pipe secret values directly to provider CLIs without printing.
- Verify by behavior/status only:
  - provider auth status codes,
  - app health/smoke checks,
  - deployment success.

## Standard Rotation Flow

1. Create new secret in provider UI.
2. Store in local keychain.
3. Update runtime secret stores (`production`, `preview`, `development` as needed).
4. Redeploy affected services.
5. Run smoke/auth checks.
6. Revoke old secret.
7. Log completion in devlog/runbook.

## Incident Protocol

If a secret is printed or pasted accidentally:

1. Stop and report exposure immediately.
2. Treat the secret as compromised.
3. Rotate and revoke it.
4. Record the incident and remediation.

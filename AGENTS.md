# AGENTS.md

## Session Defaults (Read First)

- Default mode for this repository is `STRICT_SECRET_MODE`.
- In every new session, assume strict mode is ON unless the user explicitly asks to disable it for that session.
- Before any credential task, restate: `Strict secret mode ON (no secret output, no env dumps).`

## Problem Reality Gate — Before Engineering

Before any tracked write responding to a blocker, any new artifact or
engineering surface, or any Chief Architect packet that asks for engineering
because something is allegedly missing or broken, read:

`docs/crm-vnext/crm-core-problem-reality-gate-v1.md`

The required evidence levels are:

- `codex_claimed`
- `repo_verified`
- `reproduced_no_effect`
- `runtime_empirical`
- `product_observed`

The only diagnosis verdicts are:

- `verified_problem`
- `existing_solution_or_route`
- `insufficient_evidence`

`codex_claimed` can never authorize a build. Failure to find a component is not
proof that it does not exist. A runtime, browser, source, or tool defect requires
`reproduced_no_effect` or `runtime_empirical`; a new backend, runtime, source
family, or capability family additionally requires a rejected no-build route,
causal proof, indispensability, and a Chief Architect ruling. Product readiness
requires `product_observed`.

If the gate is required and its diagnosis is not `verified_problem`, stop
before tracked writes. Search for and invoke existing components before
proposing new engineering. Review diagnosis first; review an artifact only
after the diagnosis is verified. A technically correct fix for an unverified
problem remains HOLD.

## Chief Architect UI Relay — Initial Gate

Before every ChatGPT Chief Architect consultation, treat this as the mandatory
first protocol, not as a remembered preference:

1. Work from `/Users/alejandrogomez/CRM-core`, refresh branch/HEAD/status, and
   treat the repo plus central integration records as current truth.
2. Classify the request through
   `docs/crm-vnext/crm-core-chief-architect-request-routing-v1.md`, then use
   only the registered target assigned to that closed request class. The
   destination project must be exactly `CRM Core — Chief Architect`; wrong
   project, wrong role, wrong declared target, or unregistered target fails
   before Send. The standing targets are `00 — North Star & Portfolio`,
   `01 — Operating Model & Mission Templates`, and
   `02 — Architecture Exceptions`. An approved mission chat uses a separate
   `chief-architect-mission-contract-YYYY-MM-DD-<slug>` target. No target may
   replace or mutate `chief-architect-integration`, and every non-00 target's
   project-route fingerprint must match that canonical anchor.
3. For `direct_target_open`, acquire
   `scripts/crm-vnext-consultant-relay-lock.mjs` through its static private
   registry preflight, then confirm the visible exact project and chat while
   the lock is held. Every subsequent handshake, prompt, or capture acquisition
   must pass the dynamic preflight with that fresh visible observation and the
   redacted project/chat route fingerprints computed from the visible tab. If
   either preflight is not green, stop.
4. Prepare the complete prompt before touching the composer. Insert it in one
   clipboard paste and click the Send button. Never press Enter to send and
   never stream a multiline prompt with repeated typing actions.
5. Capture the answer with ChatGPT's `Copy response` button, verify that the
   clipboard was replaced, and validate the complete packet, identifiers, and
   sentinel before acting.
6. Never print or track raw ChatGPT target URLs, private chat text, clipboard
   contents, or target-registry contents. Use redacted receipts only.

This gate is fail-closed and applies even when a target was previously
handshake-confirmed.

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

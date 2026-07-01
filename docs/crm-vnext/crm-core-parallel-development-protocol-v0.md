# CRM Core Parallel Development Protocol v0

Date: 2026-06-29
Status: no-run coordination protocol

## Purpose

Define how CRM Core can run multiple consultant chats and multiple Codex workers
in parallel while preserving architecture, branch hygiene, source privacy,
approval boundaries, and integration quality.

This protocol does not authorize lane execution, API calls, UI/Computer Use,
source checks, source mutation, CRM writes, candidate queue generation, welcome
audio, scoring, ledgers, cards, Fact Store writes, Launch OS work, or use of
`/Users/alejandrogomez/CRM`.

## Operating Model

### Alejandro / CEO

- Sets priority.
- Approves boundaries.
- Supplies non-secret facts when needed.
- Does not need to remember lane details.
- Does not manually coordinate merge conflicts.

### Chief Architect / Integration Chat

- Main ChatGPT thread.
- Owns system architecture.
- Converts CEO priorities into lane prompts.
- Reviews Codex outputs.
- Maintains integration queue.
- Decides what enters central branch.
- Prevents lane drift.

### Lane Consultant Chats

Examples:

- MailerLite onboarding.
- Meta/Instagram API.
- Welcome audio.
- Identity bridge / CRM write packets.
- Scoring / heat / next-best-action.

They may think, plan, draft prompts, and review lane outputs, but they do not
independently change central architecture without integration.

### Codex Workers

- One branch/worktree per lane.
- Small scoped commits.
- No live source execution unless exact approval exists.
- Must report status, files changed, blockers, and proposed integration notes.

### Integration Worker

- Only lane allowed to consolidate central files by default.
- Reviews branch diffs.
- Resolves conflicts.
- Updates board and integration queue.
- Updates `crm-core-next-action.md` only with explicit integration task.

## Branch / Worktree Model

Recommended branches:

- `codex/crm-core-reentry` for current central integration branch.
- `codex/crm-core-integration`
- `codex/crm-core-mailerlite-onboarding`
- `codex/crm-core-instagram-api`
- `codex/crm-core-welcome-audio`
- `codex/crm-core-identity-bridge`
- `codex/crm-core-scoring-heat`

Recommended optional worktrees:

- `/Users/alejandrogomez/CRM-core`
- `/Users/alejandrogomez/CRM-core-mailerlite`
- `/Users/alejandrogomez/CRM-core-instagram-api`
- `/Users/alejandrogomez/CRM-core-welcome-audio`
- `/Users/alejandrogomez/CRM-core-identity-bridge`

Rules:

- No lane merges directly into central branch.
- Lane branches push commits.
- Integration branch cherry-picks or merges after review.
- No lane starts from stale context without reading its lane status file.
- Each lane must identify current branch in every closeout.

## Central Files

Only integration should edit these files by default:

- `docs/crm-vnext/crm-core-next-action.md`
- `docs/crm-vnext/crm-core-workstream-board-v0.md`
- `docs/crm-vnext/crm-core-integration-queue-v0.md`
- `docs/crm-vnext/source-of-truth-map.md`
- `docs/crm-vnext/operator-capabilities.md`
- `docs/crm-vnext/control-room.md`
- `package.json`
- shared policy docs
- shared scripts or tests used across lanes

Lanes may propose changes to these files, but should not edit them unless the
task explicitly approves.

## Lane-Owned Files

MailerLite lane may own:

- `docs/crm-vnext/mailerlite-*.md`
- `docs/crm-vnext/workstreams/mailerlite-onboarding.md`
- future MailerLite-specific scripts/tests after approval.

Instagram API lane may own:

- `docs/crm-vnext/instagram-meta-*.md`
- `docs/crm-vnext/workstreams/instagram-api.md`

Welcome audio lane may own:

- `docs/crm-vnext/welcome-audio-*.md`
- `docs/crm-vnext/instagram-welcome-audio-*.md`
- `docs/crm-vnext/workstreams/welcome-audio.md`

Identity bridge lane may own:

- `docs/crm-vnext/identity-bridge-*.md`
- `docs/crm-vnext/crm-write-packet-*.md`
- `docs/crm-vnext/workstreams/identity-bridge.md`

Scoring lane may own:

- `docs/crm-vnext/scoring-*.md`
- `docs/crm-vnext/heat-*.md`
- `docs/crm-vnext/next-best-action-*.md`
- `docs/crm-vnext/workstreams/scoring-heat.md`

## Required Lane Closeout

Every lane must return:

1. branch
2. git status
3. files changed
4. tests/checks run
5. commit SHA if committed
6. lane status update
7. private/source boundaries respected
8. blockers
9. proposed integration note
10. whether central-file change is requested
11. confirmation of no forbidden scope

## Integration Queue Rules

A lane output can enter integration only if:

- branch is correct;
- changed files are lane-appropriate;
- `git diff --check` passes;
- no private artifacts are in repo;
- no reports/private files are committed;
- no source execution occurred without approval;
- active gates remain closed;
- proposed central changes are explicit.

## Approval Gates

No lane may independently approve:

- API calls;
- UI/Computer Use;
- Instagram actions;
- MailerLite mutations;
- Gmail access;
- DMs;
- welcome audio;
- candidate queue generation;
- CRM writes;
- scoring;
- ledgers/cards/Fact Store;
- Launch OS touch;
- `/Users/alejandrogomez/CRM`.

Any such action requires exact Alejandro approval and must be routed through the
Chief Architect / Integration chat.

## Source Privacy Rules

Private artifacts stay outside repo:

- `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/`
- `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/`
- `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/gmail/`

Redacted receipts stay under:

- `/Users/alejandrogomez/Documents/Mantis-Reports/`

Never commit or paste private artifact contents.

## Conflict Policy

If two lanes need the same file:

- stop;
- write an integration note;
- do not manually resolve inside lane;
- Integration Worker decides.

If a lane discovers architectural contradiction:

- record contradiction;
- propose options;
- do not silently rewrite shared architecture.

## First Parallel Lanes

Start with exactly three lanes:

1. `mailerlite-onboarding`
2. `instagram-api-readiness`
3. `welcome-audio-send-boundary`

Park until later:

- `identity-bridge-crm-write`
- `scoring-heat-next-best-action`
- `follower-source-ui-repair`

Reason:

- first three are high leverage and mostly independent;
- identity bridge depends on email/welcome architecture;
- scoring depends on evidence and write packet policy;
- follower-source UI is unstable and parked for v0.

## Completion Boundary

Complete when CRM Core has a protocol for parallel consultants/Codex workers,
branch/worktree rules, lane ownership, central-file protection, integration
queue, lane closeout format, source privacy rules, conflict handling, and
initial lane recommendation.

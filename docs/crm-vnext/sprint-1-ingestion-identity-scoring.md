# CRM vNext Sprint 1: Ingestion, Identity, Scoring

Date: 2026-05-08
Owner split: Codex builds; Mantis operates.

## Goal

Create the first dependable vNext foundation without disturbing the frozen production perimeter.

Sprint 1 is successful when Mantis and Alejandro can inspect a person through a richer, deterministic CRM lens, even before every external channel is fully automated.

## Guardrails

- No external sends.
- No ManyChat LIVE changes.
- No credential dumps.
- No Instagram/MailerLite auth changes unless Alejandro explicitly participates.
- Prefer read-only probes, local contracts, tests, and generated internal artifacts.

## Workstream A: Person Card vNext Contract

Deliverables:

- Define card sections for identity, channels, interactions, products, scoring, evidence, and next actions.
- Preserve strict identity stitching: never merge by name-only.
- Keep evidence and confidence visible on every merged fact.

Definition of done:

- Contract doc exists.
- Example person cards cover email-only, IG-only, omnichannel, customer, and ambiguous identity cases.

## Workstream B: Community Scoring vNext

Deliverables:

- Implement deterministic scoring module in the repo.
- Keep official lifecycle terminology: Semilla, Germinada, Florecida, Cosecha.
- Separate commercialWarmth from communityDepth and relationshipEngagement.
- Add productFit for yoga, mentorship, therapy, digital products, and retreats.
- Include dataConfidence and nextBestAction.

Definition of done:

- Unit tests cover low-data, email-engaged, omnichannel high-intent, existing customer, and risk cases.
- Output can be consumed by Mantis and dashboard without external services.

Near-term signal backlog:

- MailerLite campaign engagement: opens, clicks, last open/click, decay, groups/tags, and article/topic interest.
- Gmail replies to `Notas de Alejandro`: reply frequency, recency, depth of response, and relationship signal strength.
- Instagram engagement: comments, likes, story views, DMs, new follows, and onboarding events where API permissions allow stable read access.

These should become scoring inputs, not manual anecdotes. Keep scoring multidimensional: commercial warmth, community depth, relationship engagement, product fit, and data confidence.

## Workstream C: MailerLite Refresh Path

Deliverables:

- Audit current MailerLite snapshot path without printing secrets.
- Define safe refresh command/runbook.
- Add fields needed for scoring: groups/tags, opens, clicks, last activity, subscriber status.

Definition of done:

- We can refresh the MailerLite snapshot when credentials are valid.
- Failure mode produces a human-readable auth alert instead of silent staleness.

## Workstream D: Instagram Read Strategy

Deliverables:

- Document which signals are currently available through API, UI harvest, ManyChat, or not available.
- Repair or replace the stale web probe only if it can be done safely and read-only.
- Prepare an auth/permission checklist for Alejandro if Meta permissions are the blocker.

Definition of done:

- The system can say exactly why IG reads are blocked and what human action is needed.
- No blind autosending is reintroduced.

## Workstream E: Internal Dashboard v0

Deliverables:

- Use existing Next app, not a separate tool.
- Start with internal views: overview, people list, person card.
- Read from local/API contracts already used by Mantis.

Definition of done:

- Alejandro can open a local/internal page and inspect community state.
- Dashboard shows confidence/evidence and does not imply false precision.

## Alert Policy

Use Telegram alert to Alejandro when any of these happens:

- credential or permission refresh is required;
- a Meta/MailerLite/WhatsApp setup step needs human login;
- a decision changes outbound behavior or customer-visible automation;
- a data conflict cannot be resolved safely;
- a production job must be touched outside the minimal-mode freeze.

If none of the above applies, continue autonomously and leave clear repo/memory evidence.

# Hito 82 - Instagram Thread-Open Read-Only Rule v0

Date: 2026-05-24
Status: Implemented documentation/governance hardening

## Why

The first Omnichannel Coverage Push run showed a procedural gap: Mantis could search Instagram Messages UI, find plausible candidates, and still leave everything as review-only because she did not open the matching conversation.

For Alejandro's CRM, many identity bridges live inside the original Instagram thread where a person gave an email, phone, city, country, or onboarding context. A top-search result is useful, but the thread often contains the actual proof.

## Decision

When Instagram Messages UI returns a plausible candidate for CRM stitching, Mantis is explicitly allowed and expected to open the existing conversation in read-only mode.

This is not outbound if Mantis only reads visible content and does not:

- type or send,
- react,
- follow or unfollow,
- click message actions,
- grant permissions,
- change settings,
- mutate Instagram state.

## Required Evidence Fields

When Instagram UI is relevant, reports should include:

- `threadOpenedReadOnly`,
- `threadOpenDecisionReason`,
- `searchedAnchors`,
- matched handle/display name when visible,
- compact bridge evidence,
- discarded candidates,
- blocker state if the thread cannot be opened safely.

## Boundary

Do not export full conversations. Capture compact evidence only: identity bridge, explicit self-location, onboarding/source context, product interest, preference, tone, or next-step cue.

If Instagram asks for login, Relay, checkpoint, CAPTCHA, saved-profile selection, or another human-action screen, Mantis should pause in `awaiting_human_unblock` and retry after Alejandro confirms.

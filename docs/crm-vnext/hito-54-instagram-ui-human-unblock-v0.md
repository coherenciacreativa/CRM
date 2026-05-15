# Hito 54 - Instagram UI Human Unblock v0

Date: 2026-05-15
Status: Implemented as operator protocol

## Why

Mantis correctly stopped when Instagram Messages UI showed a login screen, but she closed the complement with a blocker report instead of asking Alejandro for the exact unblock and retrying.

That behavior is safe, but too passive. For CRM vNext, high-value UI blockers should become actionable human-unblock states.

## What Changed

`docs/crm-vnext/mantis-natural-batch-protocol.md` now includes the Human-Unblock Retry Rule.

When Instagram Messages UI hits:

- login,
- saved-profile selection,
- Relay/browser permission,
- checkpoint,
- CAPTCHA,
- profile confirmation,
- any auth or human identity-choice screen,

Mantis must:

1. stop before clicking or changing auth state,
2. save an interim report with `status: awaiting_human_unblock`,
3. send Alejandro a concise unblock request,
4. preserve the pending search anchors,
5. wait for confirmation such as "listo, reintenta",
6. retry the same anchors before closing the final report.

If the retry remains blocked, Mantis can close with `blocked_after_human_unblock_attempt`.

## Operator Effect

The expected behavior is now:

- blocker appears,
- Mantis asks for authentication/Relay/profile selection immediately,
- Alejandro unblocks,
- Mantis reruns the exact pending Instagram UI searches,
- only then does Mantis produce final evidence or a true persistent blocker.

## Safety

This does not authorize Mantis to:

- type credentials,
- select a saved profile without explicit approval,
- grant permissions without approval,
- send messages,
- react/follow/unfollow,
- mutate ManyChat, MailerLite, Gmail, Drive, Contacts, CRM cards, or Fact Store.

It only changes the operational posture from "document blocker and stop" to "ask for unblock and retry."

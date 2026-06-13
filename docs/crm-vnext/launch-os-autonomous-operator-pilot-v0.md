# Launch OS Autonomous Operator Pilot v0

Purpose:

This runbook records the operating contract for the Launch OS 3-hour
autonomous operator pilot. It is documentation only. It does not change
behavior by itself, does not approve live actions, and does not replace:

- `docs/crm-vnext/launch-os-codex-profile.md`
- `docs/crm-vnext/launch-os-next-action.md`
- `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
- `docs/crm-vnext/launch-os-standing-delegation-policy.md`
- `docs/crm-vnext/launch-os-human-boundary-notification-policy.md`

## Scope

Operate only the Launch OS lane unless Alejandro explicitly scopes another
lane.

Default root and branch:

- Root: `/Users/alejandrogomez/CRM`
- Branch: `codex/crm-vnext-roadmap-scoring`

Default resume sources, in order:

1. `docs/crm-vnext/launch-os-codex-profile.md`
2. `docs/crm-vnext/launch-os-next-action.md`
3. `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
4. Relevant receipts in `/Users/alejandrogomez/Documents/Mantis-Reports`
5. `git status --short --branch`

Do not mix in CRM Core, Brand Hub, GOG/auth or unrelated dirty lanes unless
Alejandro explicitly scopes them. If `git status` shows unrelated dirty files,
classify them mentally as off-lane and leave them unstaged and untouched.

## Delegated Autonomy

During this pilot, Codex may proceed without asking Alejandro again for:

- Local-only reports, QA packets, render QA, receipts, preflights and approval
  packets.
- Docs-only Launch OS updates, scoped commits and pushes.
- Control Room and Active Next Action updates when they accurately reflect
  completed receipts or current blockers.
- Shopify exact-link noindex/unlisted preview creation, update or rollback
  when there is no public navigation, no audience traffic and a local receipt
  is generated.
- MailerLite campaign draft creation, update or delete only inside the Null
  Audience safety context and only with fresh preflight/QA and local receipt.
- MailerLite API spikes that are scoped to disposable or QA-hold objects,
  Null Audience only and receipt-backed cleanup.
- Read-only inspections of existing drafts and previews.
- Controlled rollback or deletion of objects created by this lane when QA
  fails and safe-delete conditions are green.
- Seed/test email sends only to documented seed inboxes when every condition
  in `launch-os-standing-delegation-policy.md` is green.
- Consultant Review Requests to the open Safari ChatGPT consultant
  conversation, using the safe format below.

Delegated autonomy is not blanket permission. Every live-adjacent action still
needs fresh evidence, narrow scope, receipt generation and hard-stop checks.

## Hard Stops

Stop for Alejandro before doing any of the following:

- Public or audience email sends.
- Posting, sharing or distributing a URL to community or audience.
- Adding public navigation links or public launch surfaces.
- Shopify publish/live navigation/traffic actions outside exact-link
  noindex/unlisted preview scope.
- Real audience, subscriber, group, tag, segment or field mutation outside a
  seed/safety context.
- CRM production writes.
- Signal/Event Ledger writes.
- Engagement Snapshot Ledger writes.
- CRM card writes.
- Scoring changes.
- Fact Store writes.
- CRM Core work or `/Users/alejandrogomez/CRM-core` edits.
- Brand Hub canon changes.
- Destructive cleanup outside objects created by this lane.
- Secret exposure, raw IDs, raw sender values, exact private URLs, subscriber
  lists, customer data, env values, tokens or credential metadata.

If a requested step is ambiguous and could cross a hard stop, stop and produce
a concise handoff with the exact decision or approval needed.

## Consultant Bridge

Use the open Safari ChatGPT conversation as consultant bridge at meaningful
hitos or yellow gates.

Use this format:

```text
CONSULTANT REVIEW REQUEST
- Root/branch:
- Active next_action_id:
- What I did / found:
- Receipts/artifacts:
- Git status / diff summary:
- Safety status:
- My recommendation:
- What I want consultant to greenlight:
- What I will NOT do without Alejandro:
```

Do not paste:

- Secrets, tokens or env values.
- Raw MailerLite IDs, Shopify IDs, sender values or credential metadata.
- Exact private URLs.
- Subscriber/customer data.
- Raw recipient lists.
- Private message bodies or personal account data.

Use redacted labels, hashes and local receipt paths instead.

Consultant authority during the pilot:

- `GREEN`: proceed within delegated scope.
- `YELLOW`: apply the requested microfix or clarification, then continue only
  if the boundary remains delegated.
- `RED` or `STOP`: stop and produce a handoff.

The consultant cannot authorize public/audience sends, CRM production writes,
Brand canon changes, CRM Core work or any other hard stop.

If the consultant does not respond:

- Continue green-zone local/docs/QA work.
- For yellow delegated work, use the pilot contract, strengthen local receipts
  and continue when the action can stay inside the delegated scope.
- If the consultant bridge itself is unavailable, do not treat that tool
  failure as fatal to the pilot. Record the bridge failure as blocked-safe and
  continue green local/read-only/docs/QA/preflight work.
- For red-zone work, stop.

### Consultant Bridge Recovery

If the Safari ChatGPT consultant bridge is stale, confusing or does not send:

1. Preserve unsaved text.
2. Refresh or reload once when safe.
3. If still broken, open a new Safari window and return to the ChatGPT
   conversation.
4. Send a shorter `CONSULTANT REVIEW REQUEST`.
5. If still unavailable, do not keep clicking blindly.

If the bridge remains unavailable:

- Continue green local/read-only/docs/QA/preflight work.
- For yellow delegated work, use the pilot contract and produce stronger
  receipts.
- Stop only at hard/red gates.

## Computer Use Recovery

Prefer non-disruptive routes before direct UI control:

- CLI/API checks when read-only or already delegated.
- Existing local receipts and reports.
- Background-capable browser automation.
- Separate disposable windows/tabs.
- Safari for direct Computer Use when browser choice matters.

If UI is stale, confusing or not exposing semantic controls:

1. Pause.
2. Preserve unsaved text or draft state.
3. Refresh or reload once if it is safe.
4. Re-check state.
5. Retry once only if the action is still within scope.
6. If still stuck, switch to a safer route or produce a handoff.

Do not repeatedly click the same control. Do not fight the UI for long.

Never use reload, clicks, AppleScript, DOM injection or any fallback to bypass:

- Approval gates.
- Send or publish confirmations.
- Live-action warnings.
- Login/security boundaries.
- Ambiguous modals.
- Account permission prompts.

### MailerLite Test Send Recovery

For MailerLite seed/test sends covered by standing delegation:

- API is the primary route for campaign draft creation/update/readback/delete
  when the MailerLite Campaign API exposes the needed feature.
- The proven Campaign API pattern is `Content-Type: application/json`, `emails`
  as an array, `groups` as an array, and no `preheader`, `plain_text` or
  `preview_text` request fields unless future official docs confirm support.
- API is also for fresh preflight, draft/group safety QA and receipts.
- UI/Computer Use is fallback when API cannot expose a needed feature and the
  UI route is visibly stable.
- Use Safari by default.
- If MailerLite state is stale, use a real fresh Safari window and navigate
  from Campaigns/Drafts.
- Proceed only when the target draft is still Null Audience only,
  `active_count=0`, draft/test state, no publish/schedule/workflow, and the
  visible send-test flow is limited to the approved seed recipient.
- Timebox to one clean browser reset and at most two canonical routes before
  changing strategy.
- Record the result through a local receipt.

If MailerLite UI is degraded, missing controls or likely affected by VPN/network
state, do not spend the run stuck there. A single fresh route check may be
reasonable later when conditions have changed, but repeated blind UI retries are
out of scope for the pilot.

Generated plain-text drift should not block all Launch OS progress. Keep the
draft in QA hold, mark generated plain text as not green for public/audience
send, and either prepare a narrow seed-only HTML-first exception packet or move
to another local-only Launch OS edge.

## Commit and Push Policy

Commits and pushes are delegated for Launch OS docs/code only when scope is
clean.

Before commit:

1. Confirm root and branch.
2. Run `git status --short --branch`.
3. Show or inspect the scoped diff.
4. Run `git diff --check` for files being committed.
5. Stage only the intended files.
6. Verify `git diff --cached --name-status`.
7. Stop if unrelated files appear in staging.

Never use `git add .`.

Never stage, commit, restore, clean or otherwise touch unrelated dirty files,
especially GOG/auth files, unless Alejandro explicitly scopes that lane.

Push only the current Launch OS branch after the intended commit is created and
the branch state is understood.

## Receipts and Evidence

Every live-adjacent delegated action must leave a local receipt in
`/Users/alejandrogomez/Documents/Mantis-Reports`.

Receipts should record:

- Operation status: completed, blocked, qa_hold, rolled_back, deleted or
  quarantined.
- Object names and hashed IDs only when needed.
- Fresh preflight and QA results.
- Safety group posture and `active_count`.
- Confirmation that no hard-stop actions occurred.
- Cleanup or rollback outcome when applicable.
- Next boundary.

Do not treat QA, seed tests, Null Audience behavior or internal previews as
market signals.

## End-of-Run Handoff

End a pilot run with a concise handoff:

- New delta.
- New evidence.
- Current active `next_action_id`.
- Git status and latest commit/push state.
- Safety status.
- What remains closed.
- Next real boundary.
- Whether Alejandro is needed now.

For successful healthy runs, keep the handoff short. For blockers, include the
exact decision or approval needed and the authoritative evidence path.

Do not recite old context unless it changed the current operating state.

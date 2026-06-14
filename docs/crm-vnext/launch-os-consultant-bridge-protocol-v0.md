# Launch OS Consultant Bridge Protocol v0

Purpose:

This runbook defines how Codex and Mantis use a ChatGPT consultant bridge while
operating Launch OS. It is documentation only. It does not approve live sends,
public distribution, CRM writes, Brand canon changes or external-system
mutations by itself.

The goal is speed with judgment: use the consultant bridge for meaningful
yellow-gate review, but do not let bridge or UI failure stop green local work or
delegated yellow work that can be safely receipt-backed.

## Authority

Default Launch OS resume sources remain:

1. `docs/crm-vnext/launch-os-codex-profile.md`
2. `docs/crm-vnext/launch-os-next-action.md`
3. `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
4. Relevant receipts in `/Users/alejandrogomez/Documents/Mantis-Reports`
5. `git status --short --branch`

This protocol complements:

- `docs/crm-vnext/launch-os-autonomous-operator-pilot-v0.md`
- `docs/crm-vnext/launch-os-standing-delegation-policy.md`
- `docs/crm-vnext/launch-os-human-boundary-notification-policy.md`

It does not override red gates requiring Alejandro.

## Roles

- Alejandro: CEO and final authority for red gates, product direction and Brand
  canon changes.
- Codex: primary Launch OS operator for repo work, local artifacts, preflights,
  QA, scoped commits, receipts and delegated live-adjacent operations.
- Mantis: memory and handoff layer. Mantis may carry strategic state and
  operating posture, but receipts remain authoritative for live-adjacent facts.
- ChatGPT consultant: advisory reviewer for yellow gates. The consultant can
  say `GREEN`, `YELLOW` or `RED/STOP`, but cannot authorize red-gate actions.

## Consultant Verdict Model

Use the bridge when an action would benefit from a second operating review but
does not require Alejandro directly.

- `GREEN`: proceed within the already delegated scope and generate a receipt.
- `YELLOW`: apply the requested clarification, microfix or narrower preflight,
  then proceed only if the action remains delegated.
- `RED` or `STOP`: stop and produce a handoff for Alejandro with the exact
  decision needed.

If the consultant bridge is unavailable, continue green local/read-only/docs/QA
work. For yellow delegated work, use the pilot contract, strengthen receipts and
continue only when no red gate is crossed.

## Red Gates Requiring Alejandro

Stop for Alejandro before:

- Public or audience email sends.
- Posting or distributing a URL to community or audience.
- Public navigation or launch surfaces.
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
- Destructive cleanup outside objects created by the current Launch OS lane.
- Any action that would expose secrets, tokens, sender values, exact private
  URLs, subscriber/customer data, private message bodies, env values or
  credential metadata.

The consultant bridge cannot convert a red gate into a delegated action.

## Delegated Yellow Gates

During an approved autonomous operator pilot, these may proceed with consultant
review or self-review plus stronger receipts:

- Local QA, local docs, local preflights, render QA and decision packets.
- Scoped Launch OS commits and pushes.
- Shopify noindex/unlisted preview work with no public navigation and no
  audience traffic.
- MailerLite Null Audience campaign draft creation, update, readback, delete or
  QA hold.
- MailerLite API spikes inside Null Audience or disposable-object scope.
- MailerLite draft QA/readback.
- Seed/test sends only to documented seed inboxes when standing-delegation QA is
  green.
- Scoped rollback, delete or quarantine of objects created by this lane when QA
  fails and safe-cleanup rules are green.

MailerLite API is the primary route for campaign draft
creation/update/readback/delete when possible. UI/Computer Use is fallback only
when API cannot expose a needed feature and the visible route is stable.

## Single-Message Consultant Protocol

Never type a consultant request line by line into ChatGPT.

Required procedure:

1. Compose the full request first in a local scratch file, note or editor.
2. Include a `request_id`.
3. Include the `END_CONSULTANT_REVIEW_REQUEST` marker.
4. Review for secrets, raw IDs, tokens, exact private URLs, sender values,
   subscriber/customer data, seed inboxes and env values.
5. Paste the entire block into ChatGPT in one action.
6. Send once.

This prevents partial context, accidental early submission and fragmented
approval records.

### Request ID Format

Use:

```text
launch_os_bridge_YYYYMMDD_HHMMSSZ_<lane>_<short_slug>
```

Examples:

```text
launch_os_bridge_20260614_013500Z_test_claridad_plain_text_qa
launch_os_bridge_20260614_020100Z_mailerlite_seed_exception
```

Do not include secrets, raw object IDs or private URLs in request IDs.

### Request Template

```text
CONSULTANT REVIEW REQUEST
request_id:
- Root/branch:
- Active next_action_id:
- Why I stopped / why I am consulting:
- Current gate:
- Current state:
- Receipts/artifacts:
- Safety status:
- Proposed action:
- Exact actions requested for consultant greenlight:
- What I will NOT do without Alejandro:
END_CONSULTANT_REVIEW_REQUEST
```

Use redacted labels and hashes for MailerLite IDs, Shopify URLs, sender values
and other sensitive objects.

### If A Partial Request Is Sent

If any part of a consultant request is accidentally sent before the full block:

1. Stop typing into that thread.
2. Do not continue with a line-by-line patch unless the consultant explicitly
   asks for one narrow missing fact.
3. Send one corrective message:

```text
The previous message was partial. Please ignore it. I am resending the complete
CONSULTANT REVIEW REQUEST below with a new request_id.
```

4. Create a new `request_id`.
5. Paste the complete reviewed request with
   `END_CONSULTANT_REVIEW_REQUEST`.
6. Treat only the response to the complete request as the consultant verdict.

If the partial request exposed sensitive data, stop and report the exposure
path without repeating the sensitive value.

## Compact Consultant Bridge v2

Use this compact protocol as the current default for ChatGPT consultant bridge
requests.

Rules:

1. Do not send long messages to ChatGPT.
2. A `CONSULTANT REVIEW REQUEST` must be under 900 characters.
3. It must include only:
   - `request_id`
   - active `next_action_id`
   - proposed action
   - safety status
   - artifact/receipt paths
   - exact `GREEN` / `YELLOW` / `RED` ask
4. If more detail is needed, create a local artifact:
   `/Users/alejandrogomez/Documents/Mantis-Reports/consultant_bridge_request_<request_id>.md`
   and mention only the path in the compact request.
5. If the compact request fragments or ChatGPT/Safari fails:
   - send `DISREGARD PARTIAL REQUEST` if possible;
   - refresh once;
   - try a new Safari window once;
   - if still broken, mark `consultant_bridge_unavailable` and continue green
     local work or delegated yellow work with receipts.
6. Consultant bridge failure is not a blocker unless the current action is a red
   gate.
7. Red gates still require Alejandro:
   - public/audience sends;
   - public distribution/navigation launch;
   - real audience/subscriber mutation outside seed/safety;
   - CRM production writes;
   - ledgers/cards/scoring/Fact Store;
   - CRM Core;
   - Brand Hub canon changes;
   - destructive cleanup outside lane objects.
8. Do not type line by line into ChatGPT. If using the bridge, compose the
   compact request first, then paste/send once.
9. If no consultant response appears, continue only if the action is green or
   yellow delegated and covered by the pilot contract; otherwise produce a
   handoff.

## Safari / ChatGPT Bridge Recovery

When the ChatGPT consultant bridge in Safari is stale, confusing or does not
send:

1. Preserve unsaved text.
2. Refresh or reload once when safe.
3. If still broken, open a new Safari window and return to the ChatGPT
   conversation.
4. Send a shorter complete `CONSULTANT REVIEW REQUEST`.
5. If still unavailable, do not keep clicking blindly.

If the bridge remains unavailable:

- Record the bridge failure as blocked-safe, not fatal.
- Continue green local/read-only/docs/QA/preflight work.
- For yellow delegated work, use the pilot contract and stronger receipts.
- Stop only at red gates.

Do not use refresh, retry, UI clicks or browser workarounds to bypass send,
publish, launch, security or approval gates.

## Computer Use Recovery

When Computer Use is needed, prefer Safari and protect Alejandro's visible
desktop and current focus.

Preferred order:

1. CLI/API checks when already approved and safer.
2. Existing local receipts and reports.
3. Background-capable browser automation.
4. Separate disposable windows or tabs.
5. Direct Safari UI control only when necessary.

If UI gets stuck:

1. Pause.
2. Preserve unsaved text or draft state.
3. Refresh or reload once if safe.
4. Re-check state.
5. Retry once only if the action remains in scope.
6. Switch route or produce a handoff.

Do not repeatedly click the same control. Do not fight the UI for long. Do not
use coordinate or visual fallback to cross a red gate.

## MailerLite Route Priority

Current Launch OS MailerLite posture:

- API is primary for campaign draft creation, update, readback and delete.
- The proven Campaign API shape is:
  - `Content-Type: application/json`;
  - `emails` as an array;
  - `groups` as an array;
  - no `preheader`, `plain_text` or `preview_text` request fields unless
    future official docs confirm support.
- Hidden preheader belongs inside the HTML when needed.
- Exact HTML byte hash mismatch is advisory when semantic/canonicalized HTML QA
  is green.
- Generated plain text drift is a review surface before seed/public send, not a
  reason to delete a semantically green Null Audience draft automatically.
- UI/Computer Use is fallback when API cannot expose the needed feature and the
  MailerLite app shell is visibly stable.

If MailerLite UI is degraded, missing controls or likely affected by network or
VPN state, do one fresh route check later if useful. Do not keep the run stuck
there.

## Commit And Push Policy

Commits and pushes are delegated only for the active Launch OS hito and only
when scope is clean.

Before commit:

1. Confirm root and branch.
2. Run `git status --short --branch`.
3. Inspect the scoped diff.
4. Run `git diff --check` for intended files.
5. Stage only intended files.
6. Verify `git diff --cached --name-status`.
7. Stop if any unrelated file is staged.

Never use `git add .`.

Never stage, commit, restore, clean or otherwise touch GOG/auth dirty files
unless Alejandro explicitly scopes that lane.

Push only after the intended commit is created and branch state is understood.

## End-of-Run Handoff

End an autonomous or bridge-assisted run with:

- New delta.
- New evidence and receipt paths.
- Current active `next_action_id`.
- Root, branch, latest commit and push status.
- Git status grouped by lane.
- Safety status.
- What remains closed.
- Current blockers.
- Next useful edge.
- Whether Alejandro is needed now.

For healthy runs, keep the handoff short. For blockers, include the exact
decision or approval needed and the authoritative evidence path.

## Operating Reminder

Bridge failure is not a product failure and not a reason to stop Launch OS.
MailerLite UI failure is not market evidence. Seed QA, Null Audience behavior,
blocked route checks and internal previews are not observed market events.

Use the bridge to improve judgment, not to replace judgment.

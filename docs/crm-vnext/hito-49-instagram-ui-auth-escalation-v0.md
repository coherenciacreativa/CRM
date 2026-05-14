# Hito 49 - Instagram UI Auth Escalation v0

Date: 2026-05-14
Status: documented operator rule

## Why This Exists

During the high-potential IG-origin batch, Mantis attempted the Instagram Messages UI lane and hit a login/profile prompt. She correctly avoided entering credentials or clicking through a risky prompt, but Alejandro flagged the deeper issue: this lane is too valuable to let it disappear as an ordinary skipped source.

The Instagram UI search can reveal bridges that the current API path cannot reliably provide, especially email or phone -> handle matches in DM threads.

## Rule

When Instagram Messages UI is needed for CRM stitching and a login/password/profile/checkpoint/CAPTCHA/permission prompt appears:

- do not enter credentials,
- do not click through permissions,
- do not send messages or mutate Instagram,
- record `blocked_by_instagram_ui_auth`,
- preserve the exact search anchors,
- ask Alejandro to authenticate/open Instagram in the browser,
- rerun that specific UI search after the human-auth checkpoint is cleared.

## What This Changes

This is not a new live automation permission. It is an escalation rule.

Mantis may continue the batch with MailerLite, Gmail, Drive, Contacts, local reports, and lead-capture traces, but the Instagram UI route remains an explicit follow-up instead of being buried as a generic blocker.

## Safety

Still prohibited:

- sending Instagram messages,
- liking/reacting/following/unfollowing,
- changing credentials or permissions,
- reading/exporting full conversations,
- writing CRM cards without later approval.

Allowed:

- ask Alejandro to clear the auth prompt,
- perform read-only searches once the UI is already authenticated,
- capture compact, non-sensitive evidence for CRM vNext.

# Hito 83 - Instagram Name-Only Guard v0

Date: 2026-05-25
Status: Implemented governance hardening

## Why

Alejandro flagged a trust issue in the Omnichannel Coverage Push second pass: some Instagram handle candidates looked too optimistic, likely produced by broad name search rather than a real bridge.

For CRM vNext, weak Instagram lookalikes waste review time and reduce confidence in stitching. The system should prefer a clean unresolved gap over an inflated candidate list.

## Decision

Instagram name similarity is not a stitch.

Mantis must treat these as weak/no-write evidence unless a stronger bridge exists:

- same or similar display name,
- similar handle,
- mutual follows,
- top-search result with no email/phone/context bridge,
- opened thread that shows no email, phone, self-identification, or relevant relationship context.

Those cases should be labeled as `weak_name_only_hit`, `ambiguous_name_only`, or `discarded_candidate`, not as plausible card-write candidates.

## Strong Bridges

An Instagram bridge can move toward `bridge_confirmed_review_before_write` only when at least one strong anchor exists:

- exact email or phone appears in the Instagram thread or visible search result;
- lead-capture, ManyChat, Vercel/proxy, MailerLite, Gmail, Contacts, Drive/Sheets, or another official source connects the handle with the contact;
- the conversation contains explicit self-identification or clear relationship/origin context;
- Alejandro or a trusted human explicitly confirms the handle.

## Preferred Recovery Lane

For contacts likely acquired through Alejandro's Instagram welcome/onboarding flow, the high-trust path is:

1. Search exact email or phone inside Instagram Messages UI.
2. Open the matched thread read-only only when safe.
3. Capture compact evidence: searched anchor, matched handle/display, bridge text, city/country when self-stated, origin/context, and discarded candidates.
4. Leave unresolved contacts unresolved when the thread has no bridge.

This protects the CRM's confidence layer while preserving the useful Instagram UI fallback.

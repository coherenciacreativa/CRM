# CRM vNext Omnichannel Coverage Push

Date: 2026-05-24
Status: Implemented local read-only planner

## Purpose

`crm:vnext:omnichannel-coverage-push` is the focused identity-coverage planner after Control Room.

It reads the local vNext card store and asks:

```text
Which contacts should Mantis investigate first if we want more people connected across both email and Instagram?
```

This is different from broad stitching. It does not try to enrich everyone. It selects the cards where one bridge can unlock more useful CRM intelligence.

## Command

```bash
npm run crm:vnext:omnichannel-coverage-push
```

Useful report form:

```bash
npm run crm:vnext:omnichannel-coverage-push -- \
  --limit 40 \
  --out ~/Documents/Mantis-Reports/crm_vnext_omnichannel_coverage_push_2026-05-24.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_omnichannel_coverage_push_2026-05-24.md
```

## What It Selects

Two lanes:

- `ig_to_email`: Instagram handle exists, email is missing.
- `email_to_instagram`: email exists, Instagram handle is missing.

The second lane suppresses cards whose evidence already says the person does not have Instagram. Those cards can still be valid CRM contacts, but they should not consume source-recovery cycles looking for a bridge that Alejandro has already ruled out.

Each candidate includes:

- current identity fields,
- missing identity gap,
- bridge potential,
- priority score and score breakdown,
- reasons,
- recommended read-only source lanes,
- copy-ready Mantis action.

## Source Lanes

The report is local-only, but it tells Mantis which source lanes to use in a separate read-only evidence hunt:

- MailerLite cursor pagination + local filtering,
- Instagram Messages UI read-only search,
- lead-capture / ManyChat / Vercel / webhook traces,
- Gmail metadata/snippets when newsletter replies matter,
- Drive/Sheets/Docs and Contacts read-only,
- local Mantis reports and ledgers.

If Instagram UI asks for login, Relay, checkpoint, saved-profile selection, or permission, Mantis must pause into `awaiting_human_unblock` and ask Alejandro for the exact unblock before closing a degraded final report.

If Instagram UI returns a plausible candidate, Mantis should open the existing thread read-only before deciding the bridge. A top-search hit alone usually stays `review_only`; a thread can promote the result to `bridge_confirmed_review_before_write` when it shows the missing email, phone, handle, self-identification, or relationship/origin context clearly enough.

Name-only Instagram search is intentionally low-trust. A similar display name, mutual follow, or similar handle should be recorded as `weak_name_only_hit` or discarded evidence, not as a candidate bridge, unless another source provides a strong anchor. For contacts that likely came through the Instagram welcome/onboarding flow, the preferred lane is to search exact email or phone inside Instagram Messages UI and recover the original thread where the person gave that data.

## Mantis Rule

Use this when the Control Room or strategic report shows that email+Instagram coverage is the bottleneck.

Do not use it as an excuse to rerun old generic batches. It should produce a bounded candidate set and then a contact-keyed evidence packet.

## Safety

The command itself is local-only and read-only.

It does not:

- open Instagram, Gmail, MailerLite, Google Drive, Contacts, WhatsApp, Shopify, or ManyChat,
- call live APIs,
- read or mutate credentials,
- mutate CRM cards,
- write Fact Store,
- change scores,
- send outbound messages,
- perform social actions.

It may write only its own JSON/Markdown report when `--out` or `--markdown-out` is supplied.

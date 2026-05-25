# ManyChat Auth Stability Runbook

Date: 2026-05-25

## Goal

Keep ManyChat available as a read-only source for CRM vNext stitching without touching ManyChat LIVE, sending messages, changing automations, or exposing credentials.

## Current Local Contract

- CLI: `python3 manychat.py`
- Keychain service: `CRM-ManyChat`
- Keychain account: `api_key`
- Preferred token type: ManyChat Page-scoped API key from ManyChat `Settings -> API`.
- Safe check: `python3 manychat.py auth check-readonly`

The CRM local code checks credentials in this order:

1. macOS Keychain item `CRM-ManyChat` / `api_key`
2. `.env`/process variables:
   - `MANYCHAT_PAGE_SCOPED_API_KEY`
   - `MANYCHAT_PAGE-SCOPED_API_KEY`
   - `MANYCHAT_API_KEY`

## Safe Setup

Do not paste the token in Telegram, Codex chat, docs, screenshots, or shell history.

1. Open ManyChat.
2. Go to `Settings -> API`.
3. Generate or copy the Page API key.
4. Store it locally with hidden input:

```bash
python3 manychat.py auth set-interactive
```

5. Verify without mutations:

```bash
python3 manychat.py auth show
python3 manychat.py auth check-readonly
```

Expected healthy result:

```json
{
  "page_api_status": 200,
  "ok": true,
  "mode": "read_only_page_info_check"
}
```

## If API Is Not Available

ManyChat currently documents Account Public API keys as available on certain paid plans, and Pro includes API access. If Alejandro's account no longer has API access after cancelling Pro, treat this as a business constraint, not a code failure.

Fallback source lanes remain valid:

- Existing CRM/Supabase webhook traces captured while ManyChat was active.
- Vercel proxy logs and `webhook_events`.
- MailerLite notes/groups populated by the onboarding flow.
- Instagram Messages UI read-only exact email/phone/handle search.
- Manual ManyChat contact exports if the UI still allows export.

## Safety Rules

Allowed:

- Read-only lookup by exact email, phone, handle, or ManyChat contact id.
- Read-only health checks.
- Local evidence packet generation.

Forbidden without explicit approval:

- Editing or pausing ManyChat LIVE automations.
- Sending messages, broadcasts, flows, tags, or actions.
- Regenerating/deleting an existing API key without understanding connected systems.
- Printing token values.
- Storing tokens in repo files.


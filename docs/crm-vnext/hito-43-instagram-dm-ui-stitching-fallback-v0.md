# Hito 43 - Instagram DM UI Stitching Fallback v0

Date: 2026-05-14

## Why

Alejandro found a practical stitching route for contacts that have an email but no Instagram handle:

> search the known email inside Instagram Messages UI, then use the matched thread as an identity bridge.

Rocio Martinez Jaime is the model case: the CRM already had her email from onboarding/MailerLite-like capture, and Alejandro could recover the Instagram thread by searching that email in Instagram DMs.

## What Changed

- Added a local read-only CLI: `crm:vnext:instagram-dm-ui-evidence`.
- Added `instagram_dm_ui_export` as a first-class connected evidence source kind.
- Deep Local Stitching can now extract an Instagram handle from trusted DM UI bridge packets.
- Operator capabilities now list this lane for Mantis.
- Documentation explains the safe UI observation pattern and how to feed it into the existing evidence/approval flow.

## Operator Pattern

1. Start from a confirmed email/phone on a partial card.
2. Search that value in Instagram Messages UI.
3. If a thread appears, record only minimal selected evidence:
   - searched value,
   - matched handle,
   - display name,
   - city/country when explicitly visible,
   - compact preferences/tone/context when useful,
   - observer,
   - observed time,
   - short non-sensitive note.
4. Run:

```bash
npm run crm:vnext:instagram-dm-ui-evidence -- \
  --observations-file ./ig-dm-ui-observations.json \
  --out tmp/crm-vnext/ig_dm_ui_evidence.json
```

5. Pass the resulting `evidenceSources` into Deep Local Stitching / Card Apply Preview / approval flow.

## Safety

The helper itself does not open Instagram, call APIs, read credentials, or mutate anything.

Actual UI search must remain read-only: no sends, likes, reactions, follows, permission changes, ManyChat LIVE edits, card writes, or Fact Store writes.

If Instagram asks for login, checkpoint, CAPTCHA, permissions, or anything state-changing, stop and ask Alejandro.

Do not copy full conversations into CRM evidence. The intended artifact is a small evidence packet that preserves provenance and promotes only clear identity/location fields automatically; richer tone/preferences/context remain compact review context unless Alejandro approves a card/fact write.

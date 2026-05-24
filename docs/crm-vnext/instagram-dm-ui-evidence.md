# Instagram DM UI Evidence

Date: 2026-05-14
Status: v0 local read-only command

## Purpose

Some Instagram-origin contacts enter CRM with an email but no handle because they were inserted through a Custom GPT, Vercel proxy, MailerLite form, or another path outside ManyChat.

When the Instagram API cannot safely read DMs, Mantis or Codex can use a read-only UI fallback:

1. Start from a confirmed email or phone.
2. Search that value inside Instagram Messages UI.
3. If a plausible thread appears, open it in read-only mode and record only selected evidence: email/phone searched, handle/display name found, observer, time, city/country when clearly stated, lightweight preference/tone notes when useful, and a short non-sensitive snippet.
4. Convert that observation into `instagram_dm_ui_export` evidenceSources.
5. Feed the evidence packet into Deep Local Stitching / Card Apply Preview before any card write.

## Command

```bash
npm run crm:vnext:instagram-dm-ui-evidence -- \
  --observations-file ./ig-dm-ui-observations.json \
  --out tmp/crm-vnext/ig_dm_ui_evidence.json
```

Example observation:

```json
{
  "observations": [
    {
      "searchTerm": "r_mart803@hotmail.com",
      "subjectName": "Rocio Martinez Jaime",
      "subjectEmail": "r_mart803@hotmail.com",
      "matchedInstagramHandle": "rocio_yoga_mx",
      "matchedDisplayName": "Rocio Martinez Jaime",
      "city": "Ciudad de Mexico",
      "country": "Mexico",
      "preferences": ["retiros", "meditacion"],
      "tone": "calida y curiosa",
      "threadContext": "Pidio recibir correos y respondio con interes al saludo inicial.",
      "observedBy": "Alejandro",
      "observedAt": "2026-05-14T12:00:00.000Z",
      "confidence": "strong",
      "snippet": "Email appeared in Instagram Messages search."
    }
  ]
}
```

The command emits `instagram_dm_ui_export` evidenceSources. It does not open Instagram itself.

## Safety

- Read-only.
- No outbound messages.
- No likes, reactions, follows, or UI mutations.
- No Instagram API calls.
- No cookies, tokens, passwords, or credential reads.
- No card mutation.
- No Fact Store write.
- No ManyChat LIVE change.

## Operator Guidance

Use this when Alejandro says something like:

> Tengo el email, busquemos si aparece en mensajes de Instagram para encontrar el usuario.

Mantis should perform the UI search only when Chrome/Instagram is already authenticated and only as observation.

For source-recovery and Omnichannel Coverage Push work, a search-result row is normally just a lead. If a plausible result appears, Mantis should open the conversation read-only to verify whether the visible thread contains the missing bridge. This is allowed because reading an existing thread is not outbound and does not mutate Instagram state.

Required per-contact fields when Instagram UI is a relevant lane:

- `threadOpenedReadOnly`: `true` or `false`,
- `threadOpenDecisionReason`,
- `searchedAnchors`,
- `matchedHandle` or `matchedDisplayName` when visible,
- `bridgeEvidence` when the thread explicitly connects email/phone/name/handle,
- `discardedCandidates` when a plausible search result is rejected.

If Instagram prompts for login, password, profile confirmation, permissions, checkpoint, CAPTCHA, or any risky action, Mantis should not treat the source as merely "skipped". She should:

1. stop before entering credentials or clicking through the prompt,
2. mark the contact/source as `blocked_by_instagram_ui_auth`,
3. preserve the search intent and candidate anchors,
4. ask Alejandro for help with the exact unblock action: open/authenticate Instagram in the browser, then rerun this specific UI search,
5. continue the batch with other read-only sources only after recording the blocker.

This route has high stitching value. A login prompt is a human-auth checkpoint, not a reason to forget the Instagram UI lane.

If a bridge is found, save a concise observation JSON in `~/Documents/Mantis-Reports`, run this command, then pass the resulting evidence packet into the normal CRM vNext stitching/approval flow.

Thread context should be selective. Do not export the whole conversation. Capture only compact, useful facts for CRM enrichment:

- clear location fields,
- product/program interest,
- stated preferences,
- communication tone,
- consent/onboarding context,
- next-step cues Alejandro would reasonably want Mantis to remember.

Sensitive, therapeutic, highly personal, or ambiguous content should stay as review-only context unless Alejandro explicitly approves promoting it into a card fact.

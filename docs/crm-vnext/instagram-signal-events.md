# CRM vNext Instagram Signal Events

Date: 2026-05-21
Status: Implemented local adapter

Related board-level map: `docs/crm-vnext/instagram-signal-os-v0.md`.

## Purpose

`crm:vnext:instagram-signal-events` is the current bridge between Instagram activity and the canonical CRM vNext Signal Event Ledger.

It accepts supplied read-only observations from:

- Instagram Messages UI review by Mantis or Alejandro,
- future Instagram API exports,
- ManyChat exports,
- lead-capture/proxy traces,
- manual Instagram observations.

It does not connect to Instagram. It only normalizes already-collected observations into canonical events that can be passed to:

```bash
npm run crm:vnext:signal-event-pipeline -- --events-file <json>
```

## Local Command

```bash
npm run crm:vnext:instagram-signal-events -- \
  --observations-file ~/Documents/Mantis-Reports/instagram_observations.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_instagram_signal_events.json
```

## Accepted Observation Shape

```json
{
  "observations": [
    {
      "sourceKind": "instagram_messages_ui",
      "eventKind": "dm",
      "instagramHandle": "cielo_gom_g",
      "observedAt": "2026-05-21T10:00:00.000Z",
      "summary": "Intercambio de DM sobre retiro; cuerpo completo no exportado.",
      "confidence": "strong"
    },
    {
      "sourceKind": "instagram_api",
      "eventKind": "story_view",
      "instagramHandle": "cielo_gom_g",
      "quantity": 2,
      "observedAt": "2026-05-21T11:00:00.000Z"
    }
  ]
}
```

Supported event kinds:

- `dm`, `message`, `instagram_dm`
- `story_reply`, `reply_to_story`, `message_reaction`, `dm_reaction` (normalized as `instagram_dm` with surface tags)
- `comment`, `instagram_comment`
- `live_comment`, `mention` (normalized as `instagram_comment` with surface tags)
- `like`, `instagram_like`
- `story_view`, `story_views`, `instagram_story_view`
- `follow`, `new_follow`, `instagram_follow`
- `snapshot`, `engagement_snapshot`, `instagram_engagement_snapshot`
- `media_insight`, `account_insight`, `story_insight`, `profile_visit`, `save`, `share` (normalized as `instagram_engagement_snapshot`)

Aggregate snapshots can include:

```json
{
  "eventKind": "engagement_snapshot",
  "instagramHandle": "cielo_gom_g",
  "metrics": {
    "inboundDm30d": 1,
    "comments30d": 2,
    "likes30d": 6,
    "storyViews30d": 18,
    "follows": true,
    "lastInteractionAt": "2026-05-21T09:00:00.000Z"
  }
}
```

Aggregate insight metrics such as `profileVisits30d`, `reach30d`, `impressions30d`,
`saves30d`, and `shares30d` are preserved on the event metrics. They are not
person-level outreach permission, and only the projection-supported Instagram
fields affect the current heat preview.

## Output

The adapter writes:

- `signalEvents` / `events`: canonical event-shaped records;
- `skippedRecords`: observations with unsupported event kind or no identity anchor;
- a safety receipt.

These events are compatible with the standard pipeline:

```bash
npm run crm:vnext:signal-event-pipeline -- \
  --events-file ~/Documents/Mantis-Reports/crm_vnext_instagram_signal_events.json \
  --source-label "Instagram observations 2026-05-21" \
  --collector Mantis
```

Local writes still require explicit approval:

```bash
npm run crm:vnext:signal-event-pipeline -- \
  --events-file <json> \
  --write-events \
  --write-snapshot \
  --approved-by Alejandro
```

## Safety

Always prohibited:

- opening Instagram from this command,
- live Instagram API calls,
- sending DMs,
- liking/reacting/following/unfollowing,
- mutating person cards,
- writing Fact Store,
- mutating ManyChat LIVE,
- reading or printing credentials,
- treating a warmed score as permission to contact someone.

The command is an adapter, not an automation actor.

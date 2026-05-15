# Hito 51: MailerLite Engagement Adapter v0

Date: 2026-05-15

## What Changed

CRM vNext now has a read-only adapter that turns supplied MailerLite subscriber and campaign activity snapshots into engagement signals.

New command:

```bash
npm run crm:vnext:mailerlite-engagement-signals -- --snapshot-file <json>
```

It feeds the existing scoring preview:

```bash
npm run crm:vnext:engagement-signal-preview -- --signals-file <json>
```

## Why It Matters

This closes the first MailerLite-to-heat-score lane without putting MailerLite credentials inside CRM vNext.

Mantis can gather activity read-only through the healthy MailerLite route, export a compact JSON, and CRM vNext can answer:

```text
Who got warmer, colder, suppressed, or needs review based on recent email behavior?
```

## Safety

No MailerLite live call happens inside the adapter.

No credentials are read or printed.

No subscribers, groups, tags, segments, campaigns, CRM cards, Fact Store entries, or outbound channels are mutated.

The output is planning evidence only. Warmth movement means internal review priority, not permission to contact someone.

## Operator Use

For the current CRM vNext loop:

1. Mantis produces a read-only MailerLite engagement snapshot for target emails.
2. Codex/Mantis converts it with `crm:vnext:mailerlite-engagement-signals`.
3. The resulting signals go into `crm:vnext:engagement-signal-preview`.
4. Unmatched signals return to identity stitching.
5. Suppressed contacts go to suppression review before any email-related action.

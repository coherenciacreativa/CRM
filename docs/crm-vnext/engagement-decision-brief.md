# CRM vNext Engagement Decision Brief

`engagement-decision-brief` turns stored engagement movement into a concise no-send brief for Mantis and Alejandro.

It sits after:

```text
Signal Event Ledger
-> Signal Event Projection
-> Engagement Signal Preview
-> Engagement Snapshot Ledger
-> Engagement Movement Queue
-> Engagement Decision Brief
```

## Surfaces

```text
GET /api/crm-vnext/engagement-decision-brief?limit=5
npm run crm:vnext:engagement-decision-brief
```

Useful CLI export:

```bash
npm run crm:vnext:engagement-decision-brief -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_engagement_decision_brief.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_engagement_decision_brief.md
```

## What It Returns

- bounded candidates from recent engagement movement,
- why each person is in the brief,
- the source family behind the signal,
- the suggested question for Alejandro,
- the internal next step for Mantis,
- approval boundaries and blocked actions.

By default, observation-only rows are excluded. Use `--include-observation-only` or `includeObservationOnly=1` when Mantis needs a wider watchlist.

## Safety

This is read-only/local:

- no outbound messages,
- no CRM card writes,
- no Fact Store writes,
- no score mutation,
- no live API calls,
- no credential access,
- no ManyChat LIVE edits.

The brief can ask Alejandro for context. It is not approval to contact anyone.


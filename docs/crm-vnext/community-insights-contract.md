# Community Insights Contract

Date: 2026-05-08
Status: Implemented as local analytics contract

## Purpose

Community Insights is the dashboard/Mantis layer above Person Card vNext. It turns individual cards into a community-level readout without needing live credentials or external calls.

This is the first internal "command center" surface:

- how many people are known;
- which channels are covered;
- who is omnichannel;
- where identity gaps are;
- how the community is distributed across Semilla/Germinada/Florecida/Cosecha;
- which next actions are accumulating;
- who deserves attention first.

## Inputs

- `PersonCardVNext[]`
- Optional dashboard limits, currently `topLimit`

The input may come from native vNext cards or through the legacy V1 adapter.

## Outputs

```ts
type CommunityInsightsSummary = {
  generatedAt: string;
  totals: {
    cards: number;
    emailPresent: number;
    instagramPresent: number;
    omnichannel: number;
    noTrustedIdentity: number;
  };
  lifecycle: Record<CommunityLifecycleStage, number>;
  nextActions: Record<CommunityNextBestAction, number>;
  priorityBands: {
    high: number;
    medium: number;
    low: number;
  };
  identityGaps: {
    missingEmailWithInstagram: number;
    missingInstagramWithEmail: number;
    lowDataConfidence: number;
  };
  averages: {
    priorityScore: number;
    commercialWarmth: number;
    communityDepth: number;
    relationshipEngagement: number;
    dataConfidence: number;
  };
  productFitCounts: Record<ProductFitKey, number>;
  topPriority: CommunityPriorityPerson[];
};
```

## Dashboard Meaning

- `totals` powers the top KPI row.
- `lifecycle` powers the stage distribution.
- `nextActions` powers Mantis work queues.
- `identityGaps` shows where automation should enrich before selling.
- `productFitCounts` shows which offer families have active signal.
- `topPriority` gives Alejandro and Mantis a short actionable list.

## Safety

- Summary is deterministic and local.
- No external send permission is implied.
- High priority can recommend human review, not automatic outreach.
- Low data confidence remains visible and countable.

## Next Step

Wire this summary into an internal API/dashboard route that can load fixture/local card payloads first, then live CRM sources later.

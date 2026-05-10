# Person Card vNext Contract

Date: 2026-05-08
Status: Draft contract, safe for internal consumers

## Purpose

Person Card vNext is the shared object for Alejandro, Mantis, and the dashboard. It should collect identity, channels, evidence, product participation, scoring, and next action in one stable shape.

The contract is intentionally explicit about confidence and evidence. It should never make an uncertain identity merge look certain.

## Principles

- One card per person, not per channel.
- Never merge by name-only.
- Every meaningful field should be explainable by evidence.
- Scores are advisory, not permission to send.
- Mantis can draft or recommend from this card, but external sends still need the relevant channel policy.

## Minimal Shape

```ts
type PersonCardVNext = {
  schemaVersion: 'person-card-vnext-2026-05-08';
  personId: string;
  displayName: string | null;
  identities: {
    email?: string | null;
    instagramHandle?: string | null;
    instagramUserId?: string | null;
    phone?: string | null;
    city?: string | null;
    country?: string | null;
  };
  channels: {
    email: { present: boolean; status: string | null };
    instagram: { present: boolean; status: string | null };
    whatsapp: { present: boolean; status: string | null };
    telegram: { present: boolean; status: string | null };
  };
  products: {
    yogaClasses90d: number;
    happyCircle90d: number;
    retreatsAttended: number;
    totalSpend: number;
    purchaseCount: number;
    activeClient: boolean;
  };
  scoring: CommunityScoreCard;
  evidence: Array<{ source: string; observedAt: string | null; note?: string }>;
  nextAction: {
    code: CommunityNextBestAction;
    requiresHumanReview: boolean;
    reason: string;
  };
  updatedAt: string;
};
```

## Required Invariants

- `personId` must be stable and non-empty.
- At least one trusted identifier should exist before a card is treated as actionable.
- `evidence` must not be empty for actionable cards.
- `nextAction.requiresHumanReview` must be true for direct follow-up recommendations.
- Email suppression status must block normal email nurture.
- Missing email on an IG-known person should produce `ask_for_email`, not a sales action.

## Example Cases To Keep Covered

- Email-only newsletter reader: high relationshipEngagement, lower commercialWarmth, likely `nurture_by_email`.
- IG-only follower/commenter: `ask_for_email` before deeper automation.
- Omnichannel active buyer: high priority, but still human-reviewed for direct follow-up.
- Suppressed email subscriber: do not recommend normal email nurture.
- Sparse record: `complete_profile`.

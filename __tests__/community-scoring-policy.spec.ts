import { describe, expect, test } from 'vitest';
import {
  COMMUNITY_PRIORITY_SCORE_WEIGHTS,
  COMMUNITY_SCORE_DIMENSIONS,
  COMMUNITY_SIGNAL_IMPACT_POLICY,
  CRM_VNEXT_COMMUNITY_SCORING_POLICY_SCHEMA_VERSION,
  findCommunitySignalImpactPolicy,
  priorityScoreWeightTotal,
} from '../lib/crm/community-scoring-policy.js';

describe('community scoring policy', () => {
  test('declares the living CRM scoring policy version and dimensions', () => {
    expect(CRM_VNEXT_COMMUNITY_SCORING_POLICY_SCHEMA_VERSION).toBe(
      'crm-vnext-community-scoring-policy-2026-05-21',
    );
    expect(COMMUNITY_SCORE_DIMENSIONS.map((dimension) => dimension.key)).toEqual([
      'commercialWarmth',
      'communityDepth',
      'relationshipEngagement',
      'dataConfidence',
    ]);
    expect(COMMUNITY_SCORE_DIMENSIONS.find((dimension) => dimension.key === 'communityDepth')?.doesNotMean)
      .toContain('not the same as purchase intent');
  });

  test('keeps the composite priority weights explicit and normalized', () => {
    expect(COMMUNITY_PRIORITY_SCORE_WEIGHTS).toEqual({
      commercialWarmth: 0.42,
      communityDepth: 0.3,
      relationshipEngagement: 0.2,
      dataConfidence: 0.08,
    });
    expect(priorityScoreWeightTotal()).toBeCloseTo(1, 6);
  });

  test('treats ClassBot yoga as community depth and care before commercial heat', () => {
    const classBotPolicy = findCommunitySignalImpactPolicy('classbot');

    expect(classBotPolicy).toMatchObject({
      id: 'classbot_yoga_activity',
      dimensionImpact: {
        commercialWarmth: 'low',
        communityDepth: 'high',
        relationshipEngagement: 'medium',
      },
    });
    expect(classBotPolicy?.operatorMeaning).toContain('service continuity');
    expect(classBotPolicy?.guardrails).toContain('Do not infer upsell readiness from attendance alone.');
  });

  test('treats newsletter replies and Instagram as stronger relationship signals than passive opens or likes', () => {
    const replyPolicy = findCommunitySignalImpactPolicy('newsletter_reply');
    const mailerLitePolicy = findCommunitySignalImpactPolicy('mailerlite');
    const instagramPolicy = findCommunitySignalImpactPolicy('instagram');

    expect(replyPolicy?.dimensionImpact.relationshipEngagement).toBe('high');
    expect(replyPolicy?.dimensionImpact.commercialWarmth).toBe('medium');
    expect(mailerLitePolicy?.dimensionImpact.commercialWarmth).toBe('low');
    expect(instagramPolicy?.dimensionImpact.relationshipEngagement).toBe('high');
    expect(instagramPolicy?.guardrails).toContain(
      'Capture city/country if explicitly present in the conversation.',
    );
  });

  test('keeps future sources in the same scoring lane instead of parallel CRMs', () => {
    const policyIds = COMMUNITY_SIGNAL_IMPACT_POLICY.map((policy) => policy.id);

    expect(policyIds).toEqual(
      expect.arrayContaining([
        'commerce_purchase_activity',
        'instagram_activity',
        'classbot_yoga_activity',
        'manual_context_activity',
        'restricted_service_context',
      ]),
    );
    expect(findCommunitySignalImpactPolicy('shopify')?.reusableInfrastructure).toContain(
      'lib/crm/crm-vnext-signal-event-projection.js',
    );
    expect(findCommunitySignalImpactPolicy('bhakti_whatsapp')?.id).toBe('classbot_yoga_activity');
  });
});

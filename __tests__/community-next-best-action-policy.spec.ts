import { describe, expect, test } from 'vitest';
import {
  CRM_VNEXT_NEXT_BEST_ACTION_POLICY_SCHEMA_VERSION,
  evaluateCommunityNextBestActionPolicy,
  inferCommunitySignalPolicyIds,
} from '../lib/crm/community-next-best-action-policy.js';

describe('community next best action policy', () => {
  test('declares a stable policy contract', () => {
    expect(CRM_VNEXT_NEXT_BEST_ACTION_POLICY_SCHEMA_VERSION).toBe(
      'crm-vnext-next-best-action-policy-2026-05-21',
    );
    expect(inferCommunitySignalPolicyIds({
      sourceFamilies: ['gmail_reply_activity', 'instagram_activity', 'classbot_activity'],
      reasonCodes: ['email_replies'],
    })).toEqual([
      'classbot_yoga_activity',
      'instagram_activity',
      'newsletter_reply_activity',
    ]);
  });

  test('routes missing identity to stitching before any engagement decision', () => {
    const decision = evaluateCommunityNextBestActionPolicy({
      cardPresent: false,
      sourceFamilies: ['gmail_reply_activity'],
      signals: {
        email: { replies30d: 1 },
      },
    });

    expect(decision).toMatchObject({
      code: 'stitch_identity',
      category: 'identity',
      reviewRequired: true,
      outboundApprovalRequired: true,
    });
    expect(decision.blockedUntilApproval.join(' ')).toContain('Outbound messages');
  });

  test('prioritizes thoughtful email replies as context review', () => {
    const decision = evaluateCommunityNextBestActionPolicy({
      cardPresent: true,
      sourceFamilies: ['gmail_reply_activity'],
      reasonCodes: ['email_replies'],
      signals: {
        email: { replies30d: 1 },
      },
      delta: { priorityScore: 15 },
    });

    expect(decision.code).toBe('review_reply_context');
    expect(decision.category).toBe('context_review');
    expect(decision.signalPolicyIds).toContain('newsletter_reply_activity');
    expect(decision.reason).toContain('richer relationship signal');
  });

  test('routes ClassBot participation to care or retention instead of sales heat', () => {
    const decision = evaluateCommunityNextBestActionPolicy({
      cardPresent: true,
      sourceFamilies: ['classbot_activity'],
      signals: {
        participation: {
          yogaClasses90d: 8,
        },
      },
      score: {
        communityDepth: 70,
        commercialWarmth: 22,
      },
      delta: {
        priorityScore: 18,
        communityDepth: 35,
      },
    });

    expect(decision).toMatchObject({
      code: 'care_or_retention',
      category: 'care',
      reviewRequired: false,
    });
    expect(decision.reason).toContain('not automatic sales heat');
  });

  test('keeps passive MailerLite opens in observation mode', () => {
    const decision = evaluateCommunityNextBestActionPolicy({
      cardPresent: true,
      sourceFamilies: ['mailerlite_subscriber_activity'],
      reasonCodes: ['email_reads_90d'],
      signals: {
        email: {
          opens90d: 7,
          subscriberStatus: 'active',
        },
      },
      delta: { priorityScore: 18, communityDepth: 30 },
    });

    expect(decision.code).toBe('keep_observing_email');
    expect(decision.category).toBe('observation');
    expect(decision.signalPolicyIds).toContain('mailerlite_engagement_activity');
  });

  test('keeps suppression and restricted context behind human review', () => {
    const suppression = evaluateCommunityNextBestActionPolicy({
      cardPresent: true,
      sourceFamilies: ['mailerlite_subscriber_activity'],
      signals: {
        email: { subscriberStatus: 'unsubscribed', opens30d: 3 },
      },
    });
    const restricted = evaluateCommunityNextBestActionPolicy({
      cardPresent: true,
      restrictedContext: true,
      sourceFamilies: ['manual_engagement_snapshot'],
    });

    expect(suppression.code).toBe('respect_suppression');
    expect(suppression.reviewRequired).toBe(true);
    expect(restricted.code).toBe('restricted_human_review');
    expect(restricted.reviewRequired).toBe(true);
  });
});

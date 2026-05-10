import { describe, expect, test } from 'vitest';
import {
  COMMUNITY_STAGE_LABELS,
  scoreCommunityContact,
  type CommunityLifecycleStage,
} from '../lib/crm/community-scoring.js';

const NOW = '2026-05-08T12:00:00.000Z';

describe('community scoring vNext', () => {
  test('keeps the official CRM Vivo lifecycle labels', () => {
    expect(COMMUNITY_STAGE_LABELS).toEqual({
      SEMILLA: 'Semilla',
      GERMINADA: 'Germinada',
      FLORECIDA: 'Florecida',
      COSECHA: 'Cosecha',
    } satisfies Record<CommunityLifecycleStage, string>);
  });

  test('marks sparse records as Semilla and asks to complete profile', () => {
    const card = scoreCommunityContact({ now: NOW });

    expect(card.stage).toBe('SEMILLA');
    expect(card.priorityScore).toBe(0);
    expect(card.dataConfidence).toBeLessThan(35);
    expect(card.nextBestAction).toBe('complete_profile');
    expect(card.risks.map((risk) => risk.code)).toContain('low_data_confidence');
  });

  test('separates deep email relationship from immediate commercial warmth', () => {
    const card = scoreCommunityContact({
      now: NOW,
      identity: {
        hasEmail: true,
        hasCity: true,
        hasCountry: true,
        trustedMatchCount: 1,
        sourceCount: 2,
      },
      email: {
        opens30d: 8,
        clicks30d: 1,
        replies30d: 1,
        lastOpenAt: '2026-05-07T12:00:00.000Z',
        lastClickAt: '2026-05-06T12:00:00.000Z',
        lastReplyAt: '2026-05-05T12:00:00.000Z',
        subscriberStatus: 'active',
      },
    });

    expect(card.relationshipEngagement).toBeGreaterThan(card.commercialWarmth);
    expect(card.communityDepth).toBeGreaterThan(15);
    expect(card.nextBestAction).toBe('nurture_by_email');
    expect(card.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['email_reads', 'email_clicks', 'email_replies']),
    );
  });

  test('scores omnichannel customers with recent purchase history as Cosecha', () => {
    const card = scoreCommunityContact({
      now: NOW,
      existingStage: 'FLORECIDA',
      identity: {
        hasEmail: true,
        hasInstagram: true,
        hasPhone: true,
        hasCity: true,
        hasCountry: true,
        trustedMatchCount: 3,
        sourceCount: 4,
      },
      email: {
        opens30d: 10,
        clicks30d: 3,
        replies30d: 2,
        lastOpenAt: '2026-05-08T08:00:00.000Z',
        lastClickAt: '2026-05-07T12:00:00.000Z',
        lastReplyAt: '2026-05-07T18:00:00.000Z',
      },
      instagram: {
        inboundDm30d: 4,
        comments30d: 2,
        likes30d: 4,
        storyViews30d: 5,
        follows: true,
        lastInteractionAt: '2026-05-08T10:00:00.000Z',
      },
      participation: {
        yogaClasses90d: 5,
        happyCircle90d: 2,
        retreatsAttended: 1,
        lastAttendanceAt: '2026-04-28T12:00:00.000Z',
      },
      purchases: {
        totalSpend: 1800,
        purchaseCount: 3,
        activeClient: true,
        mentorshipSessions: 2,
        retreatsPurchased: 1,
        lastPurchaseAt: '2026-05-01T12:00:00.000Z',
      },
      tags: ['retiro', 'yoga'],
    });

    expect(card.stage).toBe('COSECHA');
    expect(card.priorityScore).toBeGreaterThanOrEqual(85);
    expect(card.commercialWarmth).toBeGreaterThanOrEqual(80);
    expect(card.dataConfidence).toBe(100);
    expect(card.nextBestAction).toBe('human_follow_up');
    expect(card.productFit.retreats).toBeGreaterThanOrEqual(70);
    expect(card.reasons.map((reason) => reason.code)).toContain('omnichannel_identity');
  });

  test('preserves a trusted existing stage when current score is lower', () => {
    const card = scoreCommunityContact({
      now: NOW,
      existingStage: 'GERMINADA',
      identity: {
        hasInstagram: true,
        trustedMatchCount: 1,
        sourceCount: 1,
      },
      instagram: {
        follows: true,
        likes30d: 1,
        lastInteractionAt: '2026-04-20T12:00:00.000Z',
      },
    });

    expect(card.priorityScore).toBeLessThan(45);
    expect(card.stage).toBe('GERMINADA');
    expect(card.nextBestAction).toBe('ask_for_email');
  });

  test('suppressed email status lowers commercial action and surfaces risk', () => {
    const card = scoreCommunityContact({
      now: NOW,
      identity: {
        hasEmail: true,
        trustedMatchCount: 1,
        sourceCount: 2,
      },
      email: {
        opens30d: 9,
        clicks30d: 4,
        replies30d: 2,
        lastOpenAt: '2026-05-08T08:00:00.000Z',
        lastClickAt: '2026-05-08T09:00:00.000Z',
        subscriberStatus: 'unsubscribed',
      },
    });

    expect(card.nextBestAction).toBe('respect_suppression');
    expect(card.risks.map((risk) => risk.code)).toContain('email_suppressed');
    expect(card.commercialWarmth).toBeLessThan(card.relationshipEngagement);
  });
});

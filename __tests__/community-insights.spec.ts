import { describe, expect, test } from 'vitest';
import {
  summarizeCommunityInsights,
  summarizeLegacyPersonCardsV1AsCommunityInsights,
} from '../lib/crm/community-insights.js';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-08T12:00:00.000Z';

describe('community insights', () => {
  test('summarizes dashboard-ready metrics from vNext person cards', () => {
    const cards = [
      buildPersonCardVNext({
        personId: 'ig:only_ig',
        now: NOW,
        identities: { instagramHandle: 'only_ig' },
        scoring: {
          instagram: {
            follows: true,
            likes30d: 2,
            lastInteractionAt: '2026-05-08T10:00:00.000Z',
          },
        },
        evidence: [{ source: 'ig-ui-signals-state', observedAt: NOW }],
      }),
      buildPersonCardVNext({
        personId: 'email:reader@example.com',
        now: NOW,
        identities: { email: 'reader@example.com' },
        scoring: {
          email: {
            opens30d: 6,
            clicks30d: 1,
            lastOpenAt: '2026-05-07T12:00:00.000Z',
          },
        },
        evidence: [{ source: 'mailer-engagement-snapshot', observedAt: NOW }],
      }),
      buildPersonCardVNext({
        personId: 'person:buyer',
        now: NOW,
        identities: {
          email: 'buyer@example.com',
          instagramHandle: 'buyer',
          phone: '+573001112233',
          city: 'Bogota',
          country: 'Colombia',
        },
        scoring: {
          email: {
            opens30d: 10,
            clicks30d: 4,
            replies30d: 2,
            lastOpenAt: '2026-05-08T08:00:00.000Z',
            lastClickAt: '2026-05-07T08:00:00.000Z',
          },
          instagram: {
            inboundDm30d: 5,
            comments30d: 3,
            likes30d: 8,
            follows: true,
            lastInteractionAt: '2026-05-08T09:00:00.000Z',
          },
          participation: {
            retreatsAttended: 1,
            lastAttendanceAt: '2026-04-20T12:00:00.000Z',
          },
          purchases: {
            totalSpend: 2500,
            purchaseCount: 4,
            activeClient: true,
            retreatsPurchased: 1,
            lastPurchaseAt: '2026-05-01T12:00:00.000Z',
          },
          tags: ['retiro'],
        },
        evidence: [{ source: 'crm-fixture', observedAt: NOW }],
      }),
    ];

    const summary = summarizeCommunityInsights(cards, { now: NOW, topLimit: 2 });

    expect(summary.generatedAt).toBe(NOW);
    expect(summary.totals).toEqual({
      cards: 3,
      emailPresent: 2,
      instagramPresent: 2,
      omnichannel: 1,
      noTrustedIdentity: 0,
    });
    expect(summary.identityGaps.missingEmailWithInstagram).toBe(1);
    expect(summary.identityGaps.missingInstagramWithEmail).toBe(1);
    expect(summary.nextActions.ask_for_email).toBe(1);
    expect(summary.nextActions.nurture_by_email).toBe(1);
    expect(summary.nextActions.human_follow_up).toBe(1);
    expect(summary.priorityBands.high).toBe(1);
    expect(summary.topPriority).toHaveLength(2);
    expect(summary.topPriority[0].personId).toBe('person:buyer');
    expect(summary.topPriority[0].requiresHumanReview).toBe(true);
    expect(summary.topPriority[0].primaryProductFit.key).toBe('retreats');
  });

  test('returns stable zeroed summaries for empty inputs', () => {
    const summary = summarizeCommunityInsights([], { now: NOW });

    expect(summary.totals.cards).toBe(0);
    expect(summary.lifecycle).toEqual({ SEMILLA: 0, GERMINADA: 0, FLORECIDA: 0, COSECHA: 0 });
    expect(summary.averages.priorityScore).toBe(0);
    expect(summary.topPriority).toEqual([]);
  });

  test('can summarize legacy V1 payloads through the adapter', () => {
    const summary = summarizeLegacyPersonCardsV1AsCommunityInsights(
      {
        generatedAt: NOW,
        cards: [
          {
            personId: 'ig:legacy',
            identities: { igHandle: 'legacy' },
            channels: { instagram: true },
            engagement: {
              ig: {
                stage: 'FLORECIDA',
                lastLeadAt: '2026-05-07T12:00:00.000Z',
                fromUiSignals: true,
              },
            },
            lifecycleStageGuess: 'FLORECIDA',
            confidence: 0.8,
            evidence: ['lead-state'],
          },
        ],
      },
      { now: NOW },
    );

    expect(summary.totals.cards).toBe(1);
    expect(summary.lifecycle.FLORECIDA).toBe(1);
    expect(summary.identityGaps.missingEmailWithInstagram).toBe(1);
    expect(summary.topPriority[0].personId).toBe('ig:legacy');
  });
});

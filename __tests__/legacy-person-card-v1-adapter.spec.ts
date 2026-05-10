import { describe, expect, test } from 'vitest';
import {
  buildPersonCardVNextFromLegacyV1,
  buildPersonCardsVNextFromLegacyV1Payload,
} from '../lib/crm/legacy-person-card-v1-adapter.js';

const NOW = '2026-05-08T12:00:00.000Z';

describe('legacy person card v1 adapter', () => {
  test('maps omnichannel V1 card into Person Card vNext without losing evidence', () => {
    const card = buildPersonCardVNextFromLegacyV1(
      {
        personId: 'ig:sample_person',
        identities: {
          igHandle: 'Sample_Person',
          email: 'sample@example.com',
        },
        channels: {
          instagram: true,
          email: true,
        },
        engagement: {
          ig: {
            stage: 'GERMINADA',
            lastLeadAt: '2026-05-07T12:00:00.000Z',
            leadStateConfidence: 0.9,
            fromIgApi: true,
            fromUiSignals: true,
          },
          email: {
            opens30d: 4,
            clicks30d: 1,
            lastOpenAt: '2026-05-06T12:00:00.000Z',
            lastClickAt: '2026-05-05T12:00:00.000Z',
          },
        },
        lifecycleStageGuess: 'GERMINADA',
        confidence: 0.9,
        updatedAt: NOW,
        evidence: ['lead-state', 'mailer-engagement-snapshot'],
      },
      { now: NOW },
    );

    expect(card.personId).toBe('ig:sample_person');
    expect(card.identities.instagramHandle).toBe('sample_person');
    expect(card.identities.email).toBe('sample@example.com');
    expect(card.channels.instagram.present).toBe(true);
    expect(card.channels.email.present).toBe(true);
    expect(card.scoring.stage).toBe('GERMINADA');
    expect(card.scoring.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['email_reads', 'email_clicks', 'ig_dm', 'omnichannel_identity']),
    );
    expect(card.evidence.map((item) => item.source)).toEqual(['lead-state', 'mailer-engagement-snapshot']);
  });

  test('keeps IG-only legacy cards focused on email capture before sales follow-up', () => {
    const card = buildPersonCardVNextFromLegacyV1(
      {
        personId: 'ig:only_ig',
        identities: {
          igHandle: 'only_ig',
        },
        channels: {
          instagram: true,
          email: false,
        },
        engagement: {
          ig: {
            stage: 'SEMILLA',
            lastLeadAt: '2026-05-08T10:00:00.000Z',
            fromUiSignals: true,
          },
          email: {
            opens30d: 0,
            clicks30d: 0,
          },
        },
        lifecycleStageGuess: 'SEMILLA',
        confidence: 0.6,
        updatedAt: NOW,
        evidence: ['ig-ui-signals-state'],
      },
      { now: NOW },
    );

    expect(card.identities.email).toBeNull();
    expect(card.channels.email.present).toBe(false);
    expect(card.nextAction.code).toBe('ask_for_email');
    expect(card.nextAction.requiresHumanReview).toBe(false);
  });

  test('builds a payload batch and preserves generatedAt as the default timestamp', () => {
    const cards = buildPersonCardsVNextFromLegacyV1Payload({
      generatedAt: NOW,
      cards: [
        {
          personId: 'email:reader@example.com',
          identities: { email: 'reader@example.com' },
          channels: { email: true },
          engagement: {
            email: {
              opens30d: 6,
              clicks30d: 1,
              lastOpenAt: '2026-05-07T12:00:00.000Z',
            },
          },
          evidence: ['mailer-engagement-snapshot'],
        },
      ],
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].updatedAt).toBe(NOW);
    expect(cards[0].nextAction.code).toBe('nurture_by_email');
  });

  test('rejects malformed legacy cards without stable person id', () => {
    expect(() => buildPersonCardVNextFromLegacyV1({ identities: { email: 'x@example.com' } })).toThrow(
      'Legacy Person Card V1 requires personId to build vNext card',
    );
  });
});

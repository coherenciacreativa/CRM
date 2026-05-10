import { describe, expect, test } from 'vitest';
import {
  PERSON_CARD_VNEXT_SCHEMA_VERSION,
  buildPersonCardVNext,
} from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-08T12:00:00.000Z';

describe('person card vNext contract', () => {
  test('builds a stable omnichannel card with scoring and evidence', () => {
    const card = buildPersonCardVNext({
      personId: 'person:ana',
      displayName: ' Ana ',
      now: NOW,
      identities: {
        email: 'ana@example.com',
        instagramHandle: '@AnaYoga',
        city: 'Medellin',
        country: 'Colombia',
      },
      channels: {
        emailStatus: 'active',
        instagramStatus: 'known',
      },
      scoring: {
        email: {
          opens30d: 5,
          clicks30d: 1,
          lastOpenAt: '2026-05-07T12:00:00.000Z',
        },
        instagram: {
          comments30d: 2,
          likes30d: 3,
          follows: true,
          lastInteractionAt: '2026-05-07T11:00:00.000Z',
        },
        participation: {
          yogaClasses90d: 3,
          happyCircle90d: 1,
        },
      },
      evidence: [
        { source: 'mailer-engagement-snapshot', observedAt: NOW },
        { source: 'ig-ui-signals-state', observedAt: NOW },
      ],
    });

    expect(card.schemaVersion).toBe(PERSON_CARD_VNEXT_SCHEMA_VERSION);
    expect(card.displayName).toBe('Ana');
    expect(card.identities.instagramHandle).toBe('anayoga');
    expect(card.channels.email.present).toBe(true);
    expect(card.channels.instagram.present).toBe(true);
    expect(card.scoring.dataConfidence).toBeGreaterThanOrEqual(70);
    expect(card.evidence).toHaveLength(2);
  });

  test('requires a non-empty stable person id', () => {
    expect(() =>
      buildPersonCardVNext({
        personId: '   ',
        now: NOW,
      }),
    ).toThrow('PersonCardVNext requires a stable personId');
  });

  test('keeps direct follow-up behind human review', () => {
    const card = buildPersonCardVNext({
      personId: 'person:buyer',
      now: NOW,
      identities: {
        email: 'buyer@example.com',
        instagramUserId: 'ig-123',
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
          lastReplyAt: '2026-05-07T12:00:00.000Z',
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
          mentorshipSessions: 3,
          lastPurchaseAt: '2026-05-01T12:00:00.000Z',
        },
      },
      evidence: [{ source: 'crm-fixture', observedAt: NOW }],
    });

    expect(card.nextAction.code).toBe('human_follow_up');
    expect(card.nextAction.requiresHumanReview).toBe(true);
  });
});

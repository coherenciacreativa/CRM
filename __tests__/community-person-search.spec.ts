import { describe, expect, test } from 'vitest';
import { searchCommunityPersonCards } from '../lib/crm/community-person-search.js';
import { buildPersonCardVNext, type PersonCardVNext } from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-08T12:00:00.000Z';

const buildCard = (input: Parameters<typeof buildPersonCardVNext>[0]): PersonCardVNext =>
  buildPersonCardVNext({ now: NOW, ...input });

const cards = (): PersonCardVNext[] => [
  buildCard({
    personId: 'email:ana@example.com',
    displayName: 'Ana Gomez',
    identities: {
      email: 'ana@example.com',
      instagramHandle: 'ana.yoga',
      city: 'Bogota',
      country: 'Colombia',
    },
    scoring: {
      existingStage: 'GERMINADA',
      email: {
        opens30d: 9,
        clicks30d: 2,
        lastOpenAt: '2026-05-07T12:00:00.000Z',
      },
      participation: {
        yogaClasses90d: 4,
        happyCircle90d: 2,
        lastAttendanceAt: '2026-05-06T12:00:00.000Z',
      },
      tags: ['yoga'],
    },
    evidence: [{ source: 'mailer-engagement' }, { source: 'attendance' }],
  }),
  buildCard({
    personId: 'ig:luisa',
    displayName: 'Luisa',
    identities: {
      instagramHandle: 'luisa.mente',
      country: 'Mexico',
    },
    scoring: {
      instagram: {
        inboundDm30d: 2,
        comments30d: 2,
        likes30d: 4,
        follows: true,
        lastInteractionAt: '2026-05-07T12:00:00.000Z',
      },
      tags: ['retiro'],
    },
    evidence: [{ source: 'ig-ui-signal' }],
  }),
  buildCard({
    personId: 'email:caro@example.com',
    displayName: 'Carolina',
    identities: {
      email: 'caro@example.com',
      city: 'Medellin',
      country: 'Colombia',
    },
    scoring: {
      email: {
        opens30d: 1,
      },
    },
    evidence: [{ source: 'mailer-lite' }],
  }),
  buildCard({
    personId: 'email:suppressed@example.com',
    displayName: 'Suppressed Reader',
    identities: {
      email: 'suppressed@example.com',
    },
    channels: {
      emailStatus: 'unsubscribed',
    },
    scoring: {
      email: {
        subscriberStatus: 'unsubscribed',
        opens30d: 8,
      },
    },
    evidence: [{ source: 'mailer-suppression' }],
  }),
];

describe('community person search', () => {
  test('searches across identity fields with normalized text', () => {
    const result = searchCommunityPersonCards(cards(), { query: 'bogota ana' });

    expect(result.total).toBe(4);
    expect(result.matched).toBe(1);
    expect(result.people[0].personId).toBe('email:ana@example.com');
  });

  test('filters identity gaps for Instagram profiles missing email', () => {
    const result = searchCommunityPersonCards(cards(), {
      channel: 'missing_email_with_instagram',
      nextAction: 'ask_for_email',
    });

    expect(result.matched).toBe(1);
    expect(result.people[0].personId).toBe('ig:luisa');
    expect(result.people[0].nextAction).toBe('ask_for_email');
  });

  test('filters by product fit and minimum score', () => {
    const result = searchCommunityPersonCards(cards(), {
      productFit: 'retreats',
      minProductFit: 30,
    });

    expect(result.people.map((person) => person.personId)).toEqual(['ig:luisa']);
  });

  test('filters by stage and priority threshold', () => {
    const result = searchCommunityPersonCards(cards(), {
      query: 'ana',
      stage: 'GERMINADA',
      minPriority: 1,
    });

    expect(result.people.map((person) => person.personId)).toEqual(['email:ana@example.com']);
  });

  test('sorts by priority and respects limit', () => {
    const result = searchCommunityPersonCards(cards(), { limit: 2 });

    expect(result.returned).toBe(2);
    expect(result.people).toHaveLength(2);
    expect(result.people[0].priorityScore).toBeGreaterThanOrEqual(result.people[1].priorityScore);
  });

  test('filters rows that require human review', () => {
    const result = searchCommunityPersonCards(cards(), { requiresHumanReview: true });

    expect(result.people.map((person) => person.personId)).toEqual(['email:suppressed@example.com']);
    expect(result.people[0].requiresHumanReview).toBe(true);
  });
});

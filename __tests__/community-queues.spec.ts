import { describe, expect, test } from 'vitest';
import {
  buildCommunityQueues,
  COMMUNITY_QUEUE_DEFINITIONS,
  summarizeCommunityQueues,
} from '../lib/crm/community-queues.js';
import { buildPersonCardVNext, type PersonCardVNext } from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-08T12:00:00.000Z';

const buildCard = (input: Parameters<typeof buildPersonCardVNext>[0]): PersonCardVNext =>
  buildPersonCardVNext({ now: NOW, ...input });

describe('community queues', () => {
  test('builds the default Mantis queue set', () => {
    const queues = buildCommunityQueues([]);

    expect(queues.map((queue) => queue.id)).toEqual(COMMUNITY_QUEUE_DEFINITIONS.map((queue) => queue.id));
    expect(queues.every((queue) => queue.result.total === 0)).toBe(true);
  });

  test('routes Instagram-known people missing email into the IG email-capture queue', () => {
    const card = buildCard({
      personId: 'ig:luisa',
      identities: { instagramHandle: 'luisa.mente' },
      scoring: {
        instagram: {
          follows: true,
          comments30d: 1,
          likes30d: 3,
        },
      },
      evidence: [{ source: 'ig-ui-signal' }],
    });

    const queue = buildCommunityQueues([card]).find((item) => item.id === 'ig_without_email');

    expect(queue?.result.matched).toBe(1);
    expect(queue?.result.people[0].personId).toBe('ig:luisa');
  });

  test('keeps human-review rows in the review queue', () => {
    const card = buildCard({
      personId: 'email:suppressed@example.com',
      identities: { email: 'suppressed@example.com' },
      channels: { emailStatus: 'unsubscribed' },
      scoring: {
        email: {
          subscriberStatus: 'unsubscribed',
          opens30d: 4,
        },
      },
      evidence: [{ source: 'mailer-suppression' }],
    });

    const queue = buildCommunityQueues([card]).find((item) => item.id === 'human_review_required');

    expect(queue?.result.matched).toBe(1);
    expect(queue?.result.people[0].requiresHumanReview).toBe(true);
  });

  test('summarizes queues without exposing people rows', () => {
    const queues = buildCommunityQueues([
      buildCard({
        personId: 'ig:luisa',
        identities: { instagramHandle: 'luisa.mente' },
        scoring: { instagram: { follows: true, likes30d: 2 } },
        evidence: [{ source: 'ig-ui-signal' }],
      }),
    ]);

    const summary = summarizeCommunityQueues(queues);

    expect(summary[0]).toMatchObject({
      id: 'ig_without_email',
      counts: { total: 1, matched: 1, returned: 1 },
    });
    expect(summary[0]).not.toHaveProperty('result');
    expect(summary[0]).not.toHaveProperty('people');
  });
});

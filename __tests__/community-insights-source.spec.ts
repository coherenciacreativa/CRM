import { describe, expect, test } from 'vitest';
import {
  parseLegacyPersonCardV1ByPersonId,
  parseLegacyPersonCardsV1AsPersonCards,
  parseLegacyPersonCardsV1Insights,
} from '../lib/crm/community-insights-source.js';

const NOW = '2026-05-08T12:00:00.000Z';

describe('community insights source', () => {
  test('parses legacy Person Cards V1 JSON into source metadata and summary', () => {
    const result = parseLegacyPersonCardsV1Insights(
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'ig:reader',
            identities: { igHandle: 'reader' },
            channels: { instagram: true },
            engagement: {
              ig: {
                stage: 'SEMILLA',
                lastLeadAt: '2026-05-07T12:00:00.000Z',
              },
            },
            lifecycleStageGuess: 'SEMILLA',
            evidence: ['lead-state'],
          },
        ],
      }),
      '/tmp/person-cards-v1.json',
      { now: NOW },
    );

    expect(result.ok).toBe(true);
    expect(result.source).toEqual({
      kind: 'legacy-person-cards-v1',
      path: '/tmp/person-cards-v1.json',
      generatedAt: NOW,
      cards: 1,
    });
    expect(result.summary.totals.cards).toBe(1);
    expect(result.summary.identityGaps.missingEmailWithInstagram).toBe(1);
  });

  test('rejects invalid JSON and malformed payloads', () => {
    expect(() => parseLegacyPersonCardsV1Insights('{nope', '/tmp/bad.json')).toThrow(
      'invalid_legacy_person_cards_json',
    );
    expect(() => parseLegacyPersonCardsV1Insights(JSON.stringify({ cards: null }), '/tmp/bad.json')).toThrow(
      'invalid_legacy_person_cards_payload',
    );
  });

  test('parses legacy cards into vNext person cards', () => {
    const result = parseLegacyPersonCardsV1AsPersonCards(
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'email:reader@example.com',
            identities: { email: 'reader@example.com' },
            channels: { email: true },
            engagement: { email: { opens30d: 4 } },
            evidence: ['mailer-engagement-snapshot'],
          },
        ],
      }),
      '/tmp/person-cards-v1.json',
      { now: NOW },
    );

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].schemaVersion).toBe('person-card-vnext-2026-05-08');
    expect(result.cards[0].identities.email).toBe('reader@example.com');
  });

  test('finds one vNext person card by exact personId', () => {
    const result = parseLegacyPersonCardV1ByPersonId(
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'ig:wrong',
            identities: { igHandle: 'wrong' },
            channels: { instagram: true },
          },
          {
            personId: 'ig:reader',
            identities: { igHandle: 'reader' },
            channels: { instagram: true },
            engagement: {
              ig: {
                stage: 'GERMINADA',
                lastLeadAt: '2026-05-07T12:00:00.000Z',
              },
            },
            evidence: ['lead-state'],
          },
        ],
      }),
      '/tmp/person-cards-v1.json',
      'ig:reader',
      { now: NOW },
    );

    expect(result.card?.personId).toBe('ig:reader');
    expect(result.card?.identities.instagramHandle).toBe('reader');
    expect(result.source.cards).toBe(2);
  });

  test('returns null when an exact personId is not present', () => {
    const result = parseLegacyPersonCardV1ByPersonId(
      JSON.stringify({ generatedAt: NOW, cards: [{ personId: 'ig:reader' }] }),
      '/tmp/person-cards-v1.json',
      'ig:missing',
      { now: NOW },
    );

    expect(result.card).toBeNull();
  });
});

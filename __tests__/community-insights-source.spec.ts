import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  loadPersonCardVNextByPersonId,
  parseLegacyPersonCardV1ByPersonId,
  parseLegacyPersonCardsV1AsPersonCards,
  parseLegacyPersonCardsV1Insights,
  parseCrmVNextPersonCardStoreAsPersonCards,
  parseCrmVNextPersonCardStoreByPersonId,
  parseCrmVNextPersonCardStoreInsights,
  publicPersonCardsVNextSource,
} from '../lib/crm/community-insights-source.js';
import { CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION } from '../lib/crm/crm-vnext-card-write-apply.js';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext.js';

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

  test('parses vNext person-card store as the preferred read source', () => {
    const card = buildPersonCardVNext({
      personId: 'email:store@example.com',
      displayName: 'Store Reader',
      now: NOW,
      identities: { email: 'store@example.com' },
      evidence: [{ source: 'crm-vnext-card-write-apply', observedAt: NOW }],
    });
    const storeJson = JSON.stringify({
      schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
      generatedAt: NOW,
      base: {
        kind: 'vnext-card-store',
        sourceKind: 'legacy-person-cards-v1-derived',
        cardsBeforeApply: 728,
      },
      cards: [card],
      mergeReviewQueue: [],
      provenance: [],
    });

    const cardsResult = parseCrmVNextPersonCardStoreAsPersonCards(storeJson, '/tmp/person-cards-vnext.json');
    const insightsResult = parseCrmVNextPersonCardStoreInsights(storeJson, '/tmp/person-cards-vnext.json');
    const exactResult = parseCrmVNextPersonCardStoreByPersonId(
      storeJson,
      '/tmp/person-cards-vnext.json',
      'email:store@example.com',
    );

    expect(cardsResult.source.kind).toBe('vnext-person-card-store');
    expect(cardsResult.source.cards).toBe(1);
    expect(cardsResult.cards[0].displayName).toBe('Store Reader');
    expect(insightsResult.summary.totals.cards).toBe(1);
    expect(exactResult.card?.personId).toBe('email:store@example.com');
    expect(publicPersonCardsVNextSource(cardsResult.source)).toEqual({
      kind: 'vnext-person-card-store',
      generatedAt: NOW,
      cards: 1,
      base: {
        kind: 'vnext-card-store',
        sourceKind: 'legacy-person-cards-v1-derived',
        cardsBeforeApply: 728,
      },
    });
  });

  test('loads vNext store when present but honors explicit legacy preference', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-source-'));
    const legacyPath = join(dir, 'person-cards-v1.json');
    const cardStorePath = join(dir, 'person-cards-vnext.json');
    const storeCard = buildPersonCardVNext({
      personId: 'email:store@example.com',
      now: NOW,
      identities: { email: 'store@example.com' },
    });

    try {
      await writeFile(
        legacyPath,
        JSON.stringify({
          generatedAt: NOW,
          cards: [
            {
              personId: 'email:legacy@example.com',
              identities: { email: 'legacy@example.com' },
              channels: { email: true },
            },
          ],
        }),
        'utf8',
      );
      await writeFile(
        cardStorePath,
        JSON.stringify({
          schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
          generatedAt: NOW,
          base: {
            kind: 'vnext-card-store',
            sourceKind: 'legacy-person-cards-v1-derived',
            cardsBeforeApply: 1,
          },
          cards: [storeCard],
          mergeReviewQueue: [],
          provenance: [],
        }),
        'utf8',
      );

      const preferred = await loadPersonCardVNextByPersonId('email:store@example.com', {
        legacyPath,
        cardStorePath,
      });
      const legacy = await loadPersonCardVNextByPersonId('email:legacy@example.com', {
        legacyPath,
        cardStorePath,
        preferStore: false,
      });

      expect(preferred.source.kind).toBe('vnext-person-card-store');
      expect(preferred.card?.personId).toBe('email:store@example.com');
      expect(legacy.source.kind).toBe('legacy-person-cards-v1');
      expect(legacy.card?.personId).toBe('email:legacy@example.com');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

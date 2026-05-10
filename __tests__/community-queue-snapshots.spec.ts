import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import {
  buildCommunityQueueSnapshot,
  parseCommunityQueueSnapshot,
  readCommunityQueueSnapshot,
  snapshotToPreviousMatched,
  writeCommunityQueueSnapshot,
} from '../lib/crm/community-queue-snapshots.js';
import type { CommunityQueueSummary } from '../lib/crm/community-queues.js';

const NOW = '2026-05-09T02:00:00.000Z';

const queues: CommunityQueueSummary[] = [
  {
    id: 'ig_without_email',
    title: 'IG without email',
    purpose: 'test',
    operatorNote: 'test',
    filters: { limit: 12 },
    counts: {
      total: 728,
      matched: 98,
      returned: 12,
    },
  },
  {
    id: 'identity_stitching',
    title: 'Identity stitching',
    purpose: 'test',
    operatorNote: 'test',
    filters: { limit: 12 },
    counts: {
      total: 728,
      matched: 625,
      returned: 12,
    },
  },
];

describe('community queue snapshots', () => {
  test('builds a snapshot without local source paths', () => {
    const snapshot = buildCommunityQueueSnapshot(
      queues,
      {
        kind: 'legacy-person-cards-v1',
        path: '/Users/example/person-cards-v1.json',
        generatedAt: NOW,
        cards: 728,
      },
      { now: NOW },
    );

    expect(snapshot).toMatchObject({
      schemaVersion: 'community-queue-snapshot-2026-05-09',
      generatedAt: NOW,
      source: {
        kind: 'legacy-person-cards-v1',
        generatedAt: NOW,
        cards: 728,
      },
      queues: [
        { id: 'ig_without_email', matched: 98, returned: 12, total: 728 },
        { id: 'identity_stitching', matched: 625, returned: 12, total: 728 },
      ],
    });
    expect(snapshot.source).not.toHaveProperty('path');
  });

  test('keeps vNext store source metadata while redacting local paths', () => {
    const snapshot = buildCommunityQueueSnapshot(
      queues,
      {
        kind: 'vnext-person-card-store',
        path: '/Users/example/.crm-vnext/person-card-store/person-cards-vnext.json',
        generatedAt: NOW,
        cards: 734,
        base: {
          kind: 'vnext-card-store',
          sourceKind: 'legacy-person-cards-v1-derived',
          cardsBeforeApply: 728,
        },
      },
      { now: NOW },
    );

    expect(snapshot.source).toEqual({
      kind: 'vnext-person-card-store',
      generatedAt: NOW,
      cards: 734,
      base: {
        kind: 'vnext-card-store',
        sourceKind: 'legacy-person-cards-v1-derived',
        cardsBeforeApply: 728,
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain('/Users/example');
  });

  test('turns a snapshot into previous matched counts for status evaluation', () => {
    const snapshot = buildCommunityQueueSnapshot(
      queues,
      { kind: 'legacy-person-cards-v1', path: '/tmp/cards.json', generatedAt: NOW, cards: 728 },
      { now: NOW },
    );

    expect(snapshotToPreviousMatched(snapshot)).toEqual({
      ig_without_email: 98,
      identity_stitching: 625,
    });
  });

  test('round-trips snapshots through disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-snapshot-'));
    const filePath = join(dir, 'queue-snapshot.json');
    const snapshot = buildCommunityQueueSnapshot(
      queues,
      { kind: 'legacy-person-cards-v1', path: '/tmp/cards.json', generatedAt: NOW, cards: 728 },
      { now: NOW },
    );

    try {
      await writeCommunityQueueSnapshot(filePath, snapshot);
      await expect(readCommunityQueueSnapshot(filePath)).resolves.toEqual(snapshot);
      await expect(readCommunityQueueSnapshot(join(dir, 'missing.json'))).resolves.toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('rejects invalid snapshots', () => {
    expect(() => parseCommunityQueueSnapshot('{nope')).toThrow('invalid_community_queue_snapshot_json');
    expect(() => parseCommunityQueueSnapshot(JSON.stringify({ queues: [] }))).toThrow(
      'invalid_community_queue_snapshot_payload',
    );
  });
});

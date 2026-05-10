import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CommunityQueueId, CommunityQueueSummary } from './community-queues';
import type { CommunityQueuePreviousSnapshot } from './community-queue-status';
import type { PersonCardsVNextSourceResult } from './community-insights-source';

export const COMMUNITY_QUEUE_SNAPSHOT_SCHEMA_VERSION = 'community-queue-snapshot-2026-05-09' as const;

export type CommunityQueueSnapshot = {
  schemaVersion: typeof COMMUNITY_QUEUE_SNAPSHOT_SCHEMA_VERSION;
  generatedAt: string;
  source: Omit<PersonCardsVNextSourceResult['source'], 'path'>;
  queues: Array<{
    id: CommunityQueueId;
    matched: number;
    returned: number;
    total: number;
  }>;
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

export const buildCommunityQueueSnapshot = (
  queues: CommunityQueueSummary[],
  source: PersonCardsVNextSourceResult['source'],
  options: { now?: string | Date | null } = {},
): CommunityQueueSnapshot => ({
  schemaVersion: COMMUNITY_QUEUE_SNAPSHOT_SCHEMA_VERSION,
  generatedAt: isoNow(options.now),
  source: {
    kind: source.kind,
    generatedAt: source.generatedAt,
    cards: source.cards,
  },
  queues: queues.map((queue) => ({
    id: queue.id,
    matched: queue.counts.matched,
    returned: queue.counts.returned,
    total: queue.counts.total,
  })),
});

export const snapshotToPreviousMatched = (
  snapshot: CommunityQueueSnapshot | null,
): CommunityQueuePreviousSnapshot => {
  if (!snapshot) return {};
  return snapshot.queues.reduce((acc, queue) => {
    acc[queue.id] = queue.matched;
    return acc;
  }, {} as CommunityQueuePreviousSnapshot);
};

export const parseCommunityQueueSnapshot = (jsonText: string): CommunityQueueSnapshot => {
  let payload: unknown;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new Error('invalid_community_queue_snapshot_json');
  }

  const snapshot = payload as Partial<CommunityQueueSnapshot>;
  if (
    !snapshot
    || snapshot.schemaVersion !== COMMUNITY_QUEUE_SNAPSHOT_SCHEMA_VERSION
    || typeof snapshot.generatedAt !== 'string'
    || !snapshot.source
    || !Array.isArray(snapshot.queues)
  ) {
    throw new Error('invalid_community_queue_snapshot_payload');
  }

  return {
    schemaVersion: COMMUNITY_QUEUE_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: snapshot.generatedAt,
    source: {
      kind: snapshot.source.kind,
      generatedAt: snapshot.source.generatedAt ?? null,
      cards: cleanNumber(snapshot.source.cards),
    },
    queues: snapshot.queues.map((queue) => ({
      id: queue.id,
      matched: cleanNumber(queue.matched),
      returned: cleanNumber(queue.returned),
      total: cleanNumber(queue.total),
    })),
  };
};

export const readCommunityQueueSnapshot = async (filePath: string): Promise<CommunityQueueSnapshot | null> => {
  try {
    const jsonText = await readFile(filePath, 'utf8');
    return parseCommunityQueueSnapshot(jsonText);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

export const writeCommunityQueueSnapshot = async (
  filePath: string,
  snapshot: CommunityQueueSnapshot,
): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
};

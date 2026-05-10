import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import handler from '../pages/api/crm-vnext/community-queues.js';
import {
  buildCommunityQueueSnapshot,
  writeCommunityQueueSnapshot,
} from '../lib/crm/community-queue-snapshots.js';

const NOW = '2026-05-08T12:00:00.000Z';

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CRM_VNEXT_INSIGHTS_TOKEN: process.env.CRM_VNEXT_INSIGHTS_TOKEN,
  CRM_VNEXT_PERSON_CARDS_V1_PATH: process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH,
};

const mockRes = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };
  return response;
};

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (originalEnv.CRM_VNEXT_INSIGHTS_TOKEN === undefined) delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  else process.env.CRM_VNEXT_INSIGHTS_TOKEN = originalEnv.CRM_VNEXT_INSIGHTS_TOKEN;
  if (originalEnv.CRM_VNEXT_PERSON_CARDS_V1_PATH === undefined) delete process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH;
  else process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH = originalEnv.CRM_VNEXT_PERSON_CARDS_V1_PATH;
});

describe('/api/crm-vnext/community-queues', () => {
  test('serves read-only local queue summaries in non-production mode', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-queues-'));
    const filePath = join(dir, 'person-cards-v1.json');
    const previousSnapshotPath = join(dir, 'previous-queue-snapshot.json');
    await writeFile(
      filePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'ig:reader',
            identities: { igHandle: 'reader' },
            channels: { instagram: true },
            confidence: 0.8,
            engagement: {
              ig: {
                stage: 'SEMILLA',
                lastLeadAt: '2026-05-07T12:00:00.000Z',
              },
            },
            evidence: ['ig-ui-signal'],
          },
          {
            personId: 'email:subscriber@example.com',
            identities: { email: 'subscriber@example.com' },
            channels: { email: true },
            engagement: {
              email: {
                opens30d: 9,
                clicks30d: 2,
                lastOpenAt: '2026-05-07T12:00:00.000Z',
              },
            },
            evidence: ['mailer-engagement-snapshot'],
          },
        ],
      }),
      'utf8',
    );
    await writeCommunityQueueSnapshot(
      previousSnapshotPath,
      buildCommunityQueueSnapshot(
        [
          {
            id: 'ig_without_email',
            title: 'IG without email',
            purpose: 'test',
            operatorNote: 'test',
            filters: { limit: 12 },
            counts: {
              total: 2,
              matched: 0,
              returned: 0,
            },
          },
        ],
        {
          kind: 'legacy-person-cards-v1',
          path: filePath,
          generatedAt: NOW,
          cards: 2,
        },
        { now: '2026-05-08T11:00:00.000Z' },
      ),
    );

    try {
      process.env.NODE_ENV = 'test';
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: 'GET',
          query: { sourcePath: filePath, previousSnapshotPath },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      expect((res.body as { source: { cards: number } }).source.cards).toBe(2);
      expect((res.body as { source: { path?: string } }).source).not.toHaveProperty('path');
      const queues = (res.body as { queues: Array<{ id: string; counts: { matched: number } }> }).queues;
      expect(queues.find((queue) => queue.id === 'ig_without_email')?.counts.matched).toBe(1);
      expect(queues.find((queue) => queue.id === 'identity_stitching')?.counts.matched).toBe(1);
      expect(queues[0]).not.toHaveProperty('result');
      expect(queues[0]).not.toHaveProperty('people');
      expect((res.body as { status: { totals: { queues: number }; statuses: unknown[] } }).status.totals.queues).toBe(5);
      expect((res.body as { status: { statuses: Array<{ id: string; level: string }> } }).status.statuses).toContainEqual(
        expect.objectContaining({ id: 'ig_without_email', level: 'watch', deltaMatched: 1 }),
      );
      expect((res.body as { snapshot: { previousLoaded: boolean; previousGeneratedAt: string | null } }).snapshot).toMatchObject({
        previousLoaded: true,
        previousGeneratedAt: '2026-05-08T11:00:00.000Z',
      });
      expect((res.body as { snapshot: { current: { source: object } } }).snapshot.current.source).not.toHaveProperty('path');
      expect(JSON.stringify(res.body)).not.toContain(filePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('fails closed in production when no internal token is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({ method: 'GET', query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: 'internal_token_not_configured' });
  });

  test('allows local loopback queue checks without a token', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-loopback-'));
    const filePath = join(dir, 'person-cards-v1.json');
    const previousSnapshotPath = join(dir, 'previous-queue-snapshot.json');
    await writeFile(
      filePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'ig:reader',
            identities: { igHandle: 'reader' },
            channels: { instagram: true },
            evidence: ['ig-ui-signal'],
          },
        ],
      }),
      'utf8',
    );
    await writeCommunityQueueSnapshot(
      previousSnapshotPath,
      buildCommunityQueueSnapshot(
        [
          {
            id: 'ig_without_email',
            title: 'IG without email',
            purpose: 'test',
            operatorNote: 'test',
            filters: { limit: 12 },
            counts: {
              total: 1,
              matched: 1,
              returned: 1,
            },
          },
        ],
        {
          kind: 'legacy-person-cards-v1',
          path: filePath,
          generatedAt: NOW,
          cards: 1,
        },
        { now: '2026-05-08T11:00:00.000Z' },
      ),
    );

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: 'GET',
          query: { sourcePath: filePath, previousSnapshotPath },
          headers: { host: 'localhost:3000' },
          socket: { remoteAddress: '::1' },
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      expect((res.body as { source: { cards: number } }).source.cards).toBe(1);
      expect((res.body as { snapshot: { previousLoaded: boolean } }).snapshot.previousLoaded).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('requires the configured token when one exists', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CRM_VNEXT_INSIGHTS_TOKEN = 'test-token';
    const res = mockRes();

    await handler({ method: 'GET', query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ ok: false, error: 'unauthorized' });
  });

  test('rejects non-GET methods', async () => {
    const res = mockRes();

    await handler({ method: 'POST', query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: 'method_not_allowed' });
  });
});

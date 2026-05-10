import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import handler from '../pages/api/crm-vnext/community-insights.js';

const NOW = '2026-05-08T12:00:00.000Z';

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
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

describe('/api/crm-vnext/community-insights', () => {
  test('serves local legacy insights in non-production mode', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-'));
    const filePath = join(dir, 'person-cards-v1.json');
    await writeFile(
      filePath,
      JSON.stringify({
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
      }),
      'utf8',
    );

    try {
      process.env.NODE_ENV = 'test';
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: 'GET',
          query: { sourcePath: filePath, topLimit: '1' },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      expect((res.body as { summary: { totals: { cards: number } } }).summary.totals.cards).toBe(1);
      expect((res.body as { summary: { topPriority: unknown[] } }).summary.topPriority).toHaveLength(1);
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

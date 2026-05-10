import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import handler from '../pages/api/crm-vnext/engagement-signal-preview.js';

const NOW = '2026-05-11T12:00:00.000Z';

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CRM_VNEXT_INSIGHTS_TOKEN: process.env.CRM_VNEXT_INSIGHTS_TOKEN,
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
});

describe('/api/crm-vnext/engagement-signal-preview', () => {
  test('serves a read-only engagement scoring preview from supplied signals', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-engagement-'));
    const sourcePath = join(dir, 'person-cards-v1.json');
    await writeFile(
      sourcePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'email:reader@example.com',
            displayName: 'Reader Example',
            identities: { email: 'reader@example.com' },
            channels: { email: true, emailStatus: 'active' },
            engagement: { email: { opens30d: 0, clicks30d: 0 } },
            evidence: ['existing-card'],
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
          method: 'POST',
          query: { sourcePath, preferStore: '0' },
          headers: {},
          body: {
            signals: [
              {
                sourceKind: 'mailerlite_campaign_activity',
                sourceId: 'ml-reader',
                email: 'reader@example.com',
                opens30d: 10,
                clicks30d: 2,
                observedAt: '2026-05-11T10:00:00.000Z',
                lastOpenAt: '2026-05-11T09:00:00.000Z',
                subscriberStatus: 'active',
              },
            ],
          },
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      const body = res.body as {
        liveSources: Record<string, boolean>;
        source: { kind: string; cards: number };
        preview: {
          mode: string;
          summary: { matchedSignals: number; cardsPreviewed: number; operationsExecuted: number };
          previewItems: Array<{ movement: string; operationsExecuted: number }>;
          safety: { liveApiCallsProhibited: boolean; outboundProhibited: boolean };
        };
      };
      expect(body.source).toEqual({ kind: 'legacy-person-cards-v1', generatedAt: NOW, cards: 1 });
      expect(body.liveSources).toEqual({
        mailerLiteLiveApiCalled: false,
        gmailLiveApiCalled: false,
        instagramLiveApiCalled: false,
        manyChatLiveApiCalled: false,
      });
      expect(body.preview.mode).toBe('read_only_engagement_signal_preview');
      expect(body.preview.summary).toMatchObject({
        matchedSignals: 1,
        cardsPreviewed: 1,
        operationsExecuted: 0,
      });
      expect(body.preview.previewItems[0]).toMatchObject({
        movement: 'warmer',
        operationsExecuted: 0,
      });
      expect(body.preview.safety).toMatchObject({
        liveApiCallsProhibited: true,
        outboundProhibited: true,
      });
      expect(JSON.stringify(res.body)).not.toContain(sourcePath);
      expect(JSON.stringify(res.body)).not.toContain('/Users/');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('rejects non-POST methods', async () => {
    const res = mockRes();

    await handler({ method: 'GET', query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: 'method_not_allowed' });
  });
});

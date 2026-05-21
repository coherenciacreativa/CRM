import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import handler from '../pages/api/crm-vnext/daily-operator-handoff.js';

const NOW = '2026-05-21T17:20:00.000Z';

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
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

describe('/api/crm-vnext/daily-operator-handoff', () => {
  test('serves a read-only daily operator handoff from local sources', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-daily-handoff-'));
    const sourcePath = join(dir, 'person-cards-v1.json');
    const ledgerPath = join(dir, 'engagement-ledger.jsonl');
    const factStorePath = join(dir, 'facts.jsonl');
    const contextFactLedgerPath = join(dir, 'context-facts.jsonl');
    await writeFile(
      sourcePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: 'email:reader@example.com',
            identities: { email: 'reader@example.com' },
            channels: { email: true },
            engagement: { email: { opens30d: 3 } },
            evidence: ['mailer-engagement-snapshot'],
          },
        ],
      }),
      'utf8',
    );
    await writeFile(ledgerPath, '', 'utf8');
    await writeFile(factStorePath, '', 'utf8');
    await writeFile(contextFactLedgerPath, '', 'utf8');

    try {
      process.env.NODE_ENV = 'test';
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: 'GET',
          query: {
            sourcePath,
            ledgerPath,
            factStorePath,
            contextFactLedgerPath,
            skipResolutionLoop: '1',
          },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      const handoff = (res.body as { handoff: { mode: string; safety: { outboundProhibited: boolean }; summary: { operationsExecuted: number } } }).handoff;
      expect(handoff.mode).toBe('read_only_daily_operator_handoff');
      expect(handoff.summary.operationsExecuted).toBe(0);
      expect(handoff.safety.outboundProhibited).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain(sourcePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('rejects non-GET methods', async () => {
    const res = mockRes();

    await handler({ method: 'POST', query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: 'method_not_allowed' });
  });
});

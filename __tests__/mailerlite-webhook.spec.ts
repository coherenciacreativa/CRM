import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  MailerLiteWebhookEvent,
  MailerLiteWebhookPayload,
} from '../pages/api/mailerlite/webhook.ts';

const sbInsertMock = vi.fn();
const sbReadyMock = vi.fn(() => true);
const sbSelectMock = vi.fn(async () => ({ ok: true, json: [] }));

vi.mock('../lib/utils/sb.ts', () => ({
  sbInsert: sbInsertMock,
  sbReady: sbReadyMock,
  sbSelect: sbSelectMock,
}));

const webhookModule = await import('../pages/api/mailerlite/webhook.ts');
const { buildExternalId } = webhookModule;
const handler = webhookModule.default;

type NextApiRequest = import('next').NextApiRequest;
type NextApiResponse = import('next').NextApiResponse;

function createRequest(body: unknown): NextApiRequest {
  const json = JSON.stringify(body);
  const iterable = {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(json);
    },
  };
  return {
    ...iterable,
    method: 'POST',
    headers: {},
  } as unknown as NextApiRequest;
}

function createResponse() {
  const result: { statusCode: number; json: unknown } = { statusCode: 200, json: undefined };
  const res = {
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    json(data: unknown) {
      result.json = data;
      return res;
    },
    setHeader: vi.fn(),
  } as unknown as NextApiResponse;
  return { res, result };
}

beforeEach(() => {
  sbInsertMock.mockReset();
  sbSelectMock.mockReset();
  sbReadyMock.mockReset();
  sbReadyMock.mockReturnValue(true);
  sbSelectMock.mockResolvedValue({ ok: true, json: [] });
  sbInsertMock.mockResolvedValue({ ok: true, status: 201, json: {} });
});

describe('MailerLite webhook external id builder', () => {
  test('uses provided identifiers when present', () => {
    const payload: MailerLiteWebhookEvent = {
      event: 'campaign.sent',
      data: {
        event_id: 'evt-123',
        subscriber_id: 'sub-1',
      },
    };

    const id = buildExternalId(payload, 'person@example.com', payload.event, '2024-01-01T00:00:00.000Z');

    expect(id).toBe('evt-123');
  });

  test('falls back to composite id when only subscriber information is available', () => {
    const payload: MailerLiteWebhookEvent = {
      event: 'automation.email.sent',
      data: {
        subscriber_id: 123,
        subscriber_email: 'welcome@example.com',
      },
    };

    const id = buildExternalId(payload, undefined, payload.event, '2024-01-01T00:00:01.000Z');

    expect(id).toContain('automation.email.sent');
    expect(id).toContain('123');
    expect(id).toContain('welcome@example.com');
  });

  test('generates distinct ids for repeated subscriber automation events', () => {
    const payload: MailerLiteWebhookEvent = {
      event: 'automation.email.sent',
      data: {
        subscriber: { id: 'abc' },
      },
    };

    const first = buildExternalId(payload, 'person@example.com', payload.event, '2024-01-01T00:00:01.000Z');
    const second = buildExternalId(payload, 'person@example.com', payload.event, '2024-01-01T00:00:02.000Z');

    expect(first).not.toBe(second);
  });
});

describe('MailerLite webhook handler', () => {
  test('processes single type-only event payloads', async () => {
    const payload: MailerLiteWebhookPayload = {
      type: 'campaign.opened',
      data: {
        campaign: { name: 'Weekly Update' },
        subscriber_email: 'reader@example.com',
      },
    };

    const req = createRequest(payload);
    const { res, result } = createResponse();

    await handler(req, res);

    expect(result.statusCode).toBe(200);
    expect(result.json).toEqual({ ok: true, processed: 1, deduplicated: 0 });
    expect(sbInsertMock).toHaveBeenCalledTimes(1);
    const [, record] = sbInsertMock.mock.calls[0] as [string, any];
    expect(record.type).toBe('newsletter_open');
    expect(record.meta.event).toBe('campaign.opened');
  });

  test('processes batched payloads sequentially', async () => {
    const payload: MailerLiteWebhookPayload = {
      events: [
        {
          event: 'campaign.sent',
          data: {
            campaign: { name: 'Weekly Update' },
            subscriber_email: 'reader@example.com',
          },
        },
        {
          type: 'campaign.opened',
          data: {
            subscriber_email: 'reader@example.com',
          },
        },
      ],
    };

    const req = createRequest(payload);
    const { res, result } = createResponse();

    await handler(req, res);

    expect(result.statusCode).toBe(200);
    expect(result.json).toEqual({ ok: true, processed: 2, deduplicated: 0 });
    expect(sbInsertMock).toHaveBeenCalledTimes(2);
    const firstRecord = (sbInsertMock.mock.calls[0] as [string, any])[1];
    const secondRecord = (sbInsertMock.mock.calls[1] as [string, any])[1];
    expect(firstRecord.type).toBe('newsletter_sent');
    expect(secondRecord.type).toBe('newsletter_open');
  });
});

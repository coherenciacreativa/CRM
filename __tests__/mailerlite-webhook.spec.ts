import crypto from 'node:crypto';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import type { MailerLiteWebhookPayload } from '../pages/api/mailerlite/webhook.ts';

type WebhookModule = typeof import('../pages/api/mailerlite/webhook.ts');

let buildExternalId: WebhookModule['buildExternalId'];
let verifySignature: WebhookModule['verifySignature'];

beforeAll(async () => {
  process.env.MAILERLITE_WEBHOOK_SECRET = 'test-secret';
  vi.resetModules();
  ({ buildExternalId, verifySignature } = await import('../pages/api/mailerlite/webhook.ts'));
});

describe('MailerLite webhook external id builder', () => {
  test('uses provided identifiers when present', () => {
    const payload: MailerLiteWebhookPayload = {
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
    const payload: MailerLiteWebhookPayload = {
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
    const payload: MailerLiteWebhookPayload = {
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

describe('MailerLite webhook signature verification', () => {
  test('accepts the Signature header alias', () => {
    const payload = { event: 'campaign.sent' } satisfies MailerLiteWebhookPayload;
    const raw = Buffer.from(JSON.stringify(payload));
    const digest = crypto.createHmac('sha256', 'test-secret').update(raw).digest('hex');

    const valid = verifySignature(raw, {
      signature: `sha256=${digest}`,
    });

    expect(valid).toBe(true);
  });
});

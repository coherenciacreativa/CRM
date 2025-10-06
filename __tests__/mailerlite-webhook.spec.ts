import crypto from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  buildExternalId,
  normalizeEvents,
  verifySignature,
  type MailerLiteWebhookEnvelope,
  type MailerLiteWebhookPayload,
} from '../pages/api/mailerlite/webhook.ts';

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

  test('includes top-level subscriber details when present', () => {
    const payload: MailerLiteWebhookPayload = {
      type: 'subscriber.automation_triggered',
      subscriber: {
        id: 'sub-top',
        email: 'top@example.com',
      },
    };

    const id = buildExternalId(payload, undefined, payload.type, '2024-01-01T00:00:03.000Z');

    expect(id).toContain('subscriber.automation_triggered');
    expect(id).toContain('sub-top');
    expect(id).toContain('top@example.com');
  });
});

describe('MailerLite webhook helpers', () => {
  test('normalizes batched and single events', () => {
    const single: MailerLiteWebhookEnvelope = {
      type: 'campaign.open',
    };

    expect(normalizeEvents(single)).toEqual([single]);

    const eventA: MailerLiteWebhookPayload = { type: 'campaign.open' };
    const eventB: MailerLiteWebhookPayload = { event: 'campaign.sent' };
    const batched: MailerLiteWebhookEnvelope = { events: [eventA, eventB] };

    expect(normalizeEvents(batched)).toEqual([eventA, eventB]);
  });

  test('accepts new MailerLite Signature header', () => {
    const secret = 'test-secret';
    const body = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8');
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    const verified = verifySignature(body, undefined, undefined, signature, secret);

    expect(verified).toBe(true);
  });
});

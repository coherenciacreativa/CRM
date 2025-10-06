import { describe, expect, test } from 'vitest';
import { buildExternalId, type MailerLiteWebhookPayload } from '../pages/api/mailerlite/webhook.ts';

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

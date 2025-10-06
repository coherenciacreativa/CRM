import { describe, expect, test } from 'vitest';
import {
  buildExternalId,
  extractCampaignDetails,
  extractEmail,
  extractSubscriberId,
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

  test('generates stable composite ids when only top-level subscriber information is provided', () => {
    const payload: MailerLiteWebhookPayload = {
      event: 'campaign.opened',
      subscriber: {
        id: 'top-level-1',
        email: 'top@example.com',
      },
    };

    const id = buildExternalId(payload, extractEmail(payload), payload.event, '2024-01-01T00:00:03.000Z');

    expect(id).toContain('campaign.opened');
    expect(id).toContain('top-level-1');
    expect(id).toContain('top@example.com');
  });
});

describe('MailerLite webhook extraction helpers', () => {
  test('extractEmail uses top-level subscriber email when data is missing', () => {
    const payload: MailerLiteWebhookPayload = {
      event: 'campaign.sent',
      subscriber: {
        email: 'root-subscriber@example.com',
      },
    };

    expect(extractEmail(payload)).toBe('root-subscriber@example.com');
  });

  test('extractSubscriberId falls back to top-level subscriber identifiers', () => {
    const payload: MailerLiteWebhookPayload = {
      event: 'campaign.sent',
      subscriber_id: 'subscriber-007',
      subscriber: {
        id: 'subscriber-object',
      },
    };

    expect(extractSubscriberId(payload)).toBe('subscriber-007');
  });

  test('extractCampaignDetails reads from top-level campaign fields', () => {
    const payload: MailerLiteWebhookPayload = {
      event: 'campaign.sent',
      campaign: {
        id: 'cmp-root-123',
        name: 'Top Level Launch',
        subject: 'New release',
      },
    };

    const { campaignId, campaignName, subject } = extractCampaignDetails(payload);

    expect(campaignId).toBe('cmp-root-123');
    expect(campaignName).toBe('Top Level Launch');
    expect(subject).toBe('New release');
  });
});

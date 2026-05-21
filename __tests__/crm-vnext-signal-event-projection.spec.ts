import { describe, expect, test } from 'vitest';
import {
  buildCrmSignalEventProjection,
  projectSignalEventToEngagementSignal,
} from '../lib/crm/crm-vnext-signal-event-projection.js';
import { buildCrmVNextEngagementSignalPreview } from '../lib/crm/crm-vnext-engagement-signal-preview.js';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-21T12:00:00.000Z';

const event = (overrides: Record<string, unknown>) => ({
  schemaVersion: 'crm-vnext-stored-signal-event-2026-05-21',
  eventId: 'signal_event_test',
  batchId: 'batch_test',
  capturedAt: NOW,
  observedAt: NOW,
  source: { kind: 'manual', sourceId: 'source-test' },
  subject: { personId: 'email:ana@example.com', email: 'ana@example.com', instagramHandle: null, phone: null },
  event: { kind: 'manual_observation', channel: 'manual', direction: 'internal', quantity: 1, metrics: {}, tags: [] },
  evidence: { summary: null, sourceIds: [], rawBodyExported: false },
  sensitivity: { restricted: false, reasonCodes: [] },
  safety: {
    cardMutationExecuted: false,
    factStoreWriteExecuted: false,
    outboundExecuted: false,
    liveApiCallsExecuted: false,
    credentialReadExecuted: false,
    scoreMutationExecuted: false,
  },
  ...overrides,
});

describe('CRM vNext signal event projection', () => {
  test('projects future-friendly sources into engagement preview signals', () => {
    const report = buildCrmSignalEventProjection({
      now: NOW,
      events: [
        event({
          eventId: 'shopify-digital-1',
          source: { kind: 'shopify', sourceId: 'order-1' },
          event: {
            kind: 'purchase',
            channel: 'commerce',
            direction: 'inbound',
            quantity: 1,
            metrics: { amount: 49, productKind: 'digital' },
            tags: ['curso de meditacion'],
          },
        }),
        event({
          eventId: 'bhakti-whatsapp-1',
          source: { kind: 'bhakti_whatsapp', sourceId: 'delivery-1' },
          event: {
            kind: 'recording_delivery',
            channel: 'whatsapp',
            direction: 'outbound',
            quantity: 2,
            metrics: {},
            tags: ['grabacion clase'],
          },
        }),
        event({
          eventId: 'classbot-attendance-1',
          source: { kind: 'classbot', sourceId: 'attendance-1' },
          event: {
            kind: 'class_attendance',
            channel: 'classbot',
            direction: 'internal',
            quantity: 1,
            metrics: {},
            tags: ['yoga'],
          },
        }),
      ],
    });

    expect(report.summary).toMatchObject({
      signalsGenerated: 3,
      skippedEvents: 0,
      bySourceKind: {
        shopify_activity: 1,
        bhakti_whatsapp_activity: 1,
        classbot_activity: 1,
      },
    });
    expect(report.signals[0]).toMatchObject({
      sourceKind: 'shopify_activity',
      purchaseActivity: {
        totalSpend: 49,
        purchaseCount: 1,
        activeClient: true,
        digitalProductsPurchased: 1,
      },
    });
    expect(report.signals[1]).toMatchObject({
      sourceKind: 'bhakti_whatsapp_activity',
      whatsappAutomationDeliveries30d: 2,
    });
    expect(report.signals[2]).toMatchObject({
      sourceKind: 'classbot_activity',
      participationActivity: {
        yogaClasses90d: 1,
      },
    });
    expect(report.safety.liveApiCallsProhibited).toBe(true);
  });

  test('skips restricted events by default', () => {
    const { signal, skipped } = projectSignalEventToEngagementSignal(event({
      eventId: 'therapy-purchase-1',
      event: {
        kind: 'purchase',
        channel: 'commerce',
        direction: 'inbound',
        quantity: 1,
        metrics: { amount: 200, productKind: 'therapy' },
        tags: ['therapy'],
      },
      sensitivity: { restricted: true, reasonCodes: ['restricted_service'] },
    }), { now: NOW });

    expect(signal).toBeNull();
    expect(skipped).toMatchObject({
      eventId: 'therapy-purchase-1',
      reason: 'restricted_review_only',
    });
  });

  test('projected events can feed engagement preview without mutating cards', () => {
    const card = buildPersonCardVNext({
      personId: 'email:ana@example.com',
      displayName: 'Ana Example',
      now: NOW,
      identities: { email: 'ana@example.com' },
      channels: { emailStatus: 'active' },
      evidence: [{ source: 'existing-card', observedAt: NOW }],
    });

    const projection = buildCrmSignalEventProjection({
      now: NOW,
      events: [
        event({
          eventId: 'gmail-reply-1',
          source: { kind: 'gmail_reply_activity', sourceId: 'reply-1' },
          event: { kind: 'email_reply', channel: 'email', direction: 'inbound', quantity: 1, metrics: {}, tags: [] },
        }),
        event({
          eventId: 'instagram-story-1',
          source: { kind: 'instagram_ui', sourceId: 'story-1' },
          subject: { personId: 'email:ana@example.com', email: 'ana@example.com', instagramHandle: 'ana_ig', phone: null },
          event: { kind: 'instagram_story_view', channel: 'instagram', direction: 'inbound', quantity: 4, metrics: {}, tags: [] },
        }),
        event({
          eventId: 'shopify-retreat-1',
          source: { kind: 'shopify', sourceId: 'order-retreat-1' },
          event: {
            kind: 'purchase',
            channel: 'commerce',
            direction: 'inbound',
            quantity: 1,
            metrics: { amount: 700, productKind: 'retreat' },
            tags: ['retiro'],
          },
        }),
      ],
    });

    const preview = buildCrmVNextEngagementSignalPreview({
      now: NOW,
      cards: [card],
      signals: projection.signals,
    });

    expect(preview.summary).toMatchObject({
      signalsRead: 3,
      matchedSignals: 3,
      cardsPreviewed: 1,
      warmedCards: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(preview.previewItems[0].after.priorityScore).toBeGreaterThan(preview.previewItems[0].before.priorityScore);
    expect(preview.previewItems[0].aggregatedSignals).toMatchObject({
      instagram: { storyViews30d: 4 },
      purchases: { totalSpend: 700, purchaseCount: 1, retreatsPurchased: 1 },
    });
    expect(preview.previewItems[0].operationsExecuted).toBe(0);
  });
});

import { describe, expect, test } from 'vitest';
import { buildCrmVNextMailerLiteEngagementSignals } from '../lib/crm/crm-vnext-mailerlite-engagement-signals.js';

const NOW = '2026-05-15T12:00:00.000Z';

describe('buildCrmVNextMailerLiteEngagementSignals', () => {
  test('converts subscriber rows into engagement-preview signals without live calls', () => {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      now: NOW,
      snapshot: {
        subscribers: [
          {
            id: 'sub-1',
            email: 'Reader@Example.com',
            status: 'Subscribed',
            opens_30d: '8',
            clicks_30d: 2,
            last_open_at: '2026-05-14T10:00:00.000Z',
            last_click_at: '2026-05-13T10:00:00.000Z',
            aggregate: {
              sent: 14,
              opens_count: 10,
              clicks_count: 1,
              open_rate: 71.43,
              click_rate: 7.14,
              subscribedAt: '2025-08-30T02:12:22.000Z',
            },
            groups: [{ name: 'Newsletter' }, { name: 'Estudiantes' }],
          },
        ],
      },
    });

    expect(report.mode).toBe('read_only_mailerlite_engagement_signal_adapter');
    expect(report.summary).toMatchObject({
      recordsRead: 1,
      signalsGenerated: 1,
      subscriberSignals: 1,
      campaignSignals: 0,
      liveApiCallsPerformed: false,
      credentialsRead: false,
      operationsExecuted: 0,
    });
    expect(report.safety.mailerLiteMutationProhibited).toBe(true);
    expect(report.signals[0]).toMatchObject({
      sourceKind: 'mailerlite_subscriber_activity',
      email: 'reader@example.com',
      opens30d: 8,
      clicks30d: 2,
      lifetimeOpens: 10,
      lifetimeClicks: 1,
      lifetimeSent: 14,
      openRate: 71.43,
      clickRate: 7.14,
      lastOpenAt: '2026-05-14T10:00:00.000Z',
      lastClickAt: '2026-05-13T10:00:00.000Z',
      subscribedAt: '2025-08-30T02:12:22.000Z',
      subscriberStatus: 'active',
      tags: ['Newsletter', 'Estudiantes'],
    });
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  test('aggregates recent nested campaign activity into campaign signals', () => {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      now: NOW,
      windowDays: 30,
      snapshot: {
        records: [
          {
            email: 'viviana@example.com',
            subscriber_status: 'active',
            campaignActivity: [
              { campaign_id: 'recent-open', opened_at: '2026-05-14T10:00:00.000Z' },
              { campaign_id: 'old-open', opened_at: '2026-03-01T10:00:00.000Z' },
              { campaign_id: 'recent-click', clicked_at: '2026-05-13T09:00:00.000Z' },
            ],
          },
        ],
      },
    });

    expect(report.summary).toMatchObject({
      recordsRead: 1,
      signalsGenerated: 1,
      subscriberSignals: 0,
      campaignSignals: 1,
    });
    expect(report.signals[0]).toMatchObject({
      sourceKind: 'mailerlite_campaign_activity',
      email: 'viviana@example.com',
      opens30d: 1,
      clicks30d: 1,
      opens90d: 2,
      clicks90d: 1,
      lastOpenAt: '2026-05-14T10:00:00.000Z',
      lastClickAt: '2026-05-13T09:00:00.000Z',
    });
  });

  test('keeps suppressions as signals and skips records with no match identity', () => {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      now: NOW,
      snapshot: {
        rows: [
          {
            email: 'suppressed@example.com',
            email_subscriber_status: 'Unsubscribed',
            opens30d: 4,
            sourceId: '/Users/alejandrogomez/private/raw-export.json',
          },
          {
            status: 'active',
            opens30d: 3,
          },
        ],
      },
    });

    expect(report.summary).toMatchObject({
      recordsRead: 2,
      signalsGenerated: 1,
      skippedRecords: 1,
      suppressedSubscribers: 1,
    });
    expect(report.signals[0]).toMatchObject({
      email: 'suppressed@example.com',
      subscriberStatus: 'unsubscribed',
      opens30d: 4,
    });
    expect(report.skippedRecords[0]).toMatchObject({ reason: 'missing_match_identity' });
    expect(JSON.stringify(report)).not.toContain('/Users/');
    expect(report.signals[0].sourceId).toContain('[local-path]');
  });
});

import { describe, expect, test } from 'vitest';
import {
  buildCrmVNextEngagementSignalPreview,
} from '../lib/crm/crm-vnext-engagement-signal-preview.js';
import { buildPersonCardVNext } from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-11T12:00:00.000Z';

describe('buildCrmVNextEngagementSignalPreview', () => {
  test('previews MailerLite and Gmail engagement as warmth movement without writes', () => {
    const card = buildPersonCardVNext({
      personId: 'email:reader@example.com',
      displayName: 'Reader Example',
      now: NOW,
      identities: { email: 'reader@example.com' },
      channels: { emailStatus: 'active' },
      evidence: [{ source: 'existing-card', observedAt: NOW }],
    });

    const report = buildCrmVNextEngagementSignalPreview({
      now: NOW,
      cards: [card],
      signals: [
        {
          sourceKind: 'mailerlite_campaign_activity',
          sourceId: 'ml-campaign-reader',
          email: 'reader@example.com',
          observedAt: '2026-05-11T10:00:00.000Z',
          opens30d: 12,
          clicks30d: 3,
          opens90d: 20,
          lifetimeOpens: 42,
          lifetimeClicks: 4,
          lifetimeSent: 50,
          openRate: 84,
          lastOpenAt: '2026-05-11T09:00:00.000Z',
          lastClickAt: '2026-05-10T09:00:00.000Z',
          subscribedAt: '2025-08-30T09:00:00.000Z',
          subscriberStatus: 'active',
        },
        {
          sourceKind: 'gmail_reply_activity',
          sourceId: 'gmail-reply-reader',
          email: 'reader@example.com',
          observedAt: '2026-05-11T11:00:00.000Z',
          replies30d: 1,
          lastReplyAt: '2026-05-11T11:00:00.000Z',
        },
      ],
    });

    expect(report.mode).toBe('read_only_engagement_signal_preview');
    expect(report.summary).toMatchObject({
      cardsAvailable: 1,
      signalsRead: 2,
      matchedSignals: 2,
      unmatchedSignals: 0,
      cardsPreviewed: 1,
      warmedCards: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(report.safety.liveApiCallsProhibited).toBe(true);
    expect(report.safety.cardMutationProhibited).toBe(true);

    const item = report.previewItems[0];
    expect(item.match).toMatchObject({ matchedBy: 'email', signalCount: 2 });
    expect(item.after.priorityScore).toBeGreaterThan(item.before.priorityScore);
    expect(item.after.relationshipEngagement).toBeGreaterThan(item.before.relationshipEngagement);
    expect(item.newReasonCodes).toEqual(expect.arrayContaining(['email_reads', 'email_clicks', 'email_replies']));
    expect(item.aggregatedSignals.email).toMatchObject({
      opens90d: 20,
      lifetimeOpens: 42,
      lifetimeClicks: 4,
      lifetimeSent: 50,
      openRate: 84,
      subscribedAt: '2025-08-30T09:00:00.000Z',
    });
    expect(item.recommendedQueue).toBe('email_nurture_candidate');
    expect(item.operationsExecuted).toBe(0);
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  test('surfaces email suppression as a review queue without treating warmth as permission', () => {
    const card = buildPersonCardVNext({
      personId: 'email:suppressed@example.com',
      displayName: 'Suppressed Reader',
      now: NOW,
      identities: { email: 'suppressed@example.com' },
      channels: { emailStatus: 'active' },
      evidence: [{ source: 'existing-card', observedAt: NOW }],
    });

    const report = buildCrmVNextEngagementSignalPreview({
      now: NOW,
      cards: [card],
      signals: [
        {
          sourceKind: 'mailerlite_subscriber_activity',
          sourceId: 'ml-suppressed-reader',
          email: 'suppressed@example.com',
          observedAt: '2026-05-11T10:00:00.000Z',
          opens30d: 8,
          clicks30d: 1,
          subscriberStatus: 'unsubscribed',
        },
      ],
    });

    expect(report.summary.suppressionReviews).toBe(1);
    expect(report.previewItems[0].recommendedQueue).toBe('suppression_review');
    expect(report.previewItems[0].after.nextBestAction).toBe('respect_suppression');
    expect(report.previewItems[0].newRiskCodes).toContain('email_suppressed');
    expect(report.previewItems[0].safeNextStep).toContain('Respect suppression');
  });

  test('does not cool a rich card from a narrow non-suppression source batch', () => {
    const card = buildPersonCardVNext({
      personId: 'email:macarena@example.com',
      displayName: 'Macarena',
      now: NOW,
      identities: { email: 'macarena@example.com', instagramHandle: 'macarena_ig', phone: '+56912345678' },
      channels: { emailStatus: 'active' },
      scoring: {
        email: {
          opens30d: 6,
          opens90d: 12,
          lifetimeOpens: 30,
          subscriberStatus: 'active',
        },
        instagram: {
          storyViews30d: 8,
          comments30d: 1,
          follows: true,
        },
        participation: {
          yogaClasses90d: 2,
          lastAttendanceAt: '2026-05-01T12:00:00.000Z',
        },
      },
      evidence: [
        { source: 'existing-card', observedAt: NOW },
        { source: 'instagram', observedAt: NOW },
        { source: 'classbot', observedAt: NOW },
      ],
    });

    const report = buildCrmVNextEngagementSignalPreview({
      now: NOW,
      cards: [card],
      signals: [
        {
          sourceKind: 'gmail_reply_activity',
          sourceId: 'gmail-old-reply',
          email: 'macarena@example.com',
          observedAt: '2026-03-01T12:00:00.000Z',
          replies30d: 0,
          lastReplyAt: '2026-03-01T12:00:00.000Z',
        },
      ],
    });

    expect(report.summary.cooledCards).toBe(0);
    expect(report.previewItems[0].movement).toBe('unchanged');
    expect(report.previewItems[0].after.priorityScore).toBeGreaterThanOrEqual(
      report.previewItems[0].before.priorityScore,
    );
    expect(report.previewItems[0].after.relationshipEngagement).toBeGreaterThanOrEqual(
      report.previewItems[0].before.relationshipEngagement,
    );
  });

  test('keeps unmatched engagement signals in an identity-stitching queue', () => {
    const card = buildPersonCardVNext({
      personId: 'email:known@example.com',
      displayName: 'Known Person',
      now: NOW,
      identities: { email: 'known@example.com' },
      evidence: [{ source: 'existing-card', observedAt: NOW }],
    });

    const report = buildCrmVNextEngagementSignalPreview({
      now: NOW,
      cards: [card],
      signals: [
        {
          sourceKind: 'instagram_activity',
          sourceId: 'ig-unknown',
          instagramHandle: '@unknown_handle',
          observedAt: '2026-05-11T10:00:00.000Z',
          likes30d: 5,
          comments30d: 1,
        },
      ],
    });

    expect(report.summary).toMatchObject({
      signalsRead: 1,
      matchedSignals: 0,
      unmatchedSignals: 1,
      cardsPreviewed: 0,
      operationsExecuted: 0,
    });
    expect(report.unmatchedSignals[0]).toMatchObject({
      sourceKind: 'instagram_activity',
      instagramHandle: 'unknown_handle',
      reason: 'no_matching_card',
    });
    expect(report.unmatchedSignals[0].safeNextStep).toContain('identity stitching');
  });
});

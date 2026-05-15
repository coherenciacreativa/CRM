import { describe, expect, test } from 'vitest';
import { buildCrmVNextGmailReplyEngagementSignals } from '../lib/crm/crm-vnext-gmail-reply-engagement-signals.js';

const NOW = '2026-05-15T12:00:00.000Z';

describe('buildCrmVNextGmailReplyEngagementSignals', () => {
  test('converts strong human reply metadata into Gmail engagement signals without live calls', () => {
    const report = buildCrmVNextGmailReplyEngagementSignals({
      now: NOW,
      snapshot: {
        representativeExamples: [
          {
            messageId: 'gmail-msg-1',
            threadId: 'thread-1',
            date: '2026-05-14T10:00:00.000Z',
            from: { name: 'Reader Example', email: 'Reader@Example.com' },
            subject: 'Re: What to do when I do not want to do?',
            matchedNewsletterOrCampaign: 'What to do when I do not want to do?',
            replyConfidence: 'strong',
            candidateType: 'human_reply_candidate',
            reasonCodes: [
              'human_sender',
              'to_discovered_reply_address',
              'in_reply_to_or_references_mlsend',
              'reply_subject_prefix',
            ],
            selectedHeaders: { deliveredTo: '/Users/alejandrogomez/private-path' },
            redactedSnippet: 'Short redacted snippet from /Users/alejandrogomez/raw-mail.eml',
          },
        ],
      },
    });

    expect(report.mode).toBe('read_only_gmail_reply_engagement_signal_adapter');
    expect(report.summary).toMatchObject({
      recordsRead: 1,
      signalsGenerated: 1,
      replyActivities: 1,
      skippedRecords: 0,
      strongSignals: 1,
      liveApiCallsPerformed: false,
      credentialsRead: false,
      rawBodiesExported: false,
      operationsExecuted: 0,
    });
    expect(report.safety.gmailMutationProhibited).toBe(true);
    expect(report.safety.rawBodyExportProhibited).toBe(true);
    expect(report.signals[0]).toMatchObject({
      sourceKind: 'gmail_reply_activity',
      email: 'reader@example.com',
      observedAt: '2026-05-14T10:00:00.000Z',
      replies30d: 1,
      lastReplyAt: '2026-05-14T10:00:00.000Z',
      tags: [
        'newsletter_reply',
        'gmail_reply_confidence:strong',
        'campaign:What to do when I do not want to do?',
      ],
    });
    expect(report.replyActivities[0]).toMatchObject({
      gmailMessageId: 'gmail-msg-1',
      gmailThreadId: 'thread-1',
      email: 'reader@example.com',
      fromName: 'Reader Example',
      rawBodyExported: false,
      mutationsPerformed: false,
    });
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  test('keeps older medium replies as historical reply signals but outside replies30d', () => {
    const report = buildCrmVNextGmailReplyEngagementSignals({
      now: NOW,
      windowDays: 30,
      snapshot: {
        replyActivities: [
          {
            gmailMessageId: 'gmail-msg-old',
            date: '2026-03-01T10:00:00.000Z',
            fromEmail: 'old-reader@example.com',
            replyConfidence: 'medium',
            candidateType: 'human_reply_candidate',
            reasonCodes: ['human_sender', 'reply_subject_prefix'],
          },
        ],
      },
    });

    expect(report.summary).toMatchObject({
      recordsRead: 1,
      signalsGenerated: 1,
      mediumSignals: 1,
    });
    expect(report.signals[0]).toMatchObject({
      email: 'old-reader@example.com',
      replies30d: 0,
      lastReplyAt: '2026-03-01T10:00:00.000Z',
    });
  });

  test('skips weak review-only and false positive rows instead of scoring them', () => {
    const report = buildCrmVNextGmailReplyEngagementSignals({
      now: NOW,
      snapshot: {
        representativeExamples: [
          {
            messageId: 'gmail-msg-weak',
            date: '2026-05-14T10:00:00.000Z',
            fromEmail: 'weak@example.com',
            replyConfidence: 'weak',
            candidateType: 'human_reply_candidate',
            reasonCodes: ['human_sender'],
          },
          {
            messageId: 'gmail-msg-bulk',
            date: '2026-05-14T10:00:00.000Z',
            fromEmail: 'notasdealejandro@coherenciacreativa.com',
            replyConfidence: 'strong',
            candidateType: 'false_positive_auto_or_bounce',
            reasonCodes: ['feedback_id', 'bulk_headers'],
          },
          {
            messageId: 'gmail-msg-missing-email',
            date: '2026-05-14T10:00:00.000Z',
            replyConfidence: 'strong',
            candidateType: 'human_reply_candidate',
            reasonCodes: ['human_sender'],
          },
        ],
      },
    });

    expect(report.summary).toMatchObject({
      recordsRead: 3,
      signalsGenerated: 0,
      skippedRecords: 3,
      falsePositiveSkipped: 1,
      weakReviewOnly: 1,
      missingMatchIdentity: 1,
    });
    expect(report.skippedRecords.map((record) => record.reason)).toEqual([
      'weak_or_review_only',
      'false_positive_auto_or_bounce',
      'missing_match_identity',
    ]);
  });
});

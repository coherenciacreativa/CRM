import { describe, expect, test } from 'vitest';
import {
  buildCrmVNextEngagementDecisionBriefFromQueue,
} from '../lib/crm/crm-vnext-engagement-decision-brief.js';
import {
  formatCrmVNextEngagementDecisionBriefMarkdown,
} from '../lib/crm/crm-vnext-engagement-decision-brief-markdown.js';

const NOW = '2026-05-21T15:00:00.000Z';

const queue = () => ({
  ok: true,
  generatedAt: NOW,
  source: {
    snapshots: 1,
    latestCapturedAt: NOW,
  },
  summary: {
    rows: 3,
    unmatchedRows: 1,
    warmedRows: 3,
    cooledRows: 0,
  },
  rows: [
    {
      rowId: 'snapshot:reply',
      personId: 'email:reader@example.com',
      displayName: 'Reader Example',
      movement: 'warmer',
      sourceFamily: 'gmail_replies',
      before: { priorityScore: 7 },
      after: { priorityScore: 22 },
      delta: { priorityScore: 15 },
      operatorAction: {
        code: 'review_reply_context',
        label: 'Review reply context',
        reviewRequired: false,
        reason: 'A human email reply matters.',
      },
      signals: {
        email: { label: '1 email reply in 30d' },
        instagram: { label: null },
        tags: ['newsletter_reply'],
      },
      reasonCodes: ['email_replies'],
      riskCodes: [],
      card: {
        identities: {
          email: 'reader@example.com',
          instagramHandle: 'reader',
          city: 'Bogota',
          country: 'Colombia',
        },
      },
    },
    {
      rowId: 'snapshot:warm',
      personId: 'ig:cielo_gom_g',
      displayName: 'Cielo Gomez',
      movement: 'warmer',
      sourceFamily: 'mailerlite_engagement',
      before: { priorityScore: 8 },
      after: { priorityScore: 18 },
      delta: { priorityScore: 10 },
      operatorAction: {
        code: 'review_warm_contact',
        label: 'Review warm contact',
        reviewRequired: false,
        reason: 'Priority moved meaningfully.',
      },
      signals: {
        email: { label: '13 opens in 90d' },
        instagram: { label: null },
        tags: ['Onboarding complete'],
      },
      reasonCodes: ['email_reads_90d'],
      riskCodes: [],
      card: {
        identities: {
          email: 'cielo@example.com',
          instagramHandle: 'cielo_gom_g',
          city: 'Bogota',
          country: 'Colombia',
        },
      },
    },
    {
      rowId: 'snapshot:observe',
      personId: 'email:observe@example.com',
      displayName: 'Observe Example',
      movement: 'warmer',
      sourceFamily: 'mailerlite_engagement',
      before: { priorityScore: 2 },
      after: { priorityScore: 3 },
      delta: { priorityScore: 1 },
      operatorAction: {
        code: 'keep_observing',
        label: 'Keep observing',
        reviewRequired: false,
        reason: 'Weak signal.',
      },
      signals: {
        email: { label: 'email signal present' },
        instagram: { label: null },
        tags: [],
      },
      reasonCodes: [],
      riskCodes: [],
      card: {
        identities: {
          email: 'observe@example.com',
        },
      },
    },
  ],
  unmatchedRows: [
    {
      rowId: 'snapshot:unmatched',
      sourceKind: 'gmail_reply_activity',
      sourceFamily: 'gmail_replies',
      email: 'orphan@example.com',
      reason: 'no_matching_card',
      safeNextStep: 'Run identity stitching first.',
      operatorAction: {
        code: 'stitch_identity',
        label: 'Stitch identity',
        reviewRequired: true,
        reason: 'Signal did not match a stable local person card.',
      },
    },
  ],
});

describe('CRM vNext engagement decision brief', () => {
  test('turns movement queue rows into a bounded no-send decision brief', () => {
    const brief = buildCrmVNextEngagementDecisionBriefFromQueue(queue(), {
      now: NOW,
      limit: 5,
    });

    expect(brief.schemaVersion).toBe('crm-vnext-engagement-decision-brief-2026-05-21');
    expect(brief.mode).toBe('read_only_engagement_decision_brief');
    expect(brief.summary).toMatchObject({
      urgency: 'notify',
      totalCandidates: 3,
      returnedCandidates: 3,
      requiresAlejandroDecision: true,
    });
    expect(brief.candidates.map((candidate) => candidate.decisionNeed)).toEqual([
      'identity_stitching_required',
      'email_reply_context_review',
      'warm_contact_review',
    ]);
    expect(brief.candidates.some((candidate) => candidate.displayName === 'Observe Example')).toBe(false);
    expect(JSON.stringify(brief)).not.toContain('/Users/');
    expect(brief.safety.outboundProhibited).toBe(true);
    expect(brief.safety.recordMutationProhibited).toBe(true);
  });

  test('can include observation-only candidates when explicitly requested', () => {
    const brief = buildCrmVNextEngagementDecisionBriefFromQueue(queue(), {
      now: NOW,
      includeObservationOnly: true,
    });

    expect(brief.candidates.some((candidate) => candidate.decisionNeed === 'observation_only')).toBe(true);
  });

  test('formats concise markdown for Mantis and Alejandro', () => {
    const brief = buildCrmVNextEngagementDecisionBriefFromQueue(queue(), {
      now: NOW,
      limit: 2,
    });
    const markdown = formatCrmVNextEngagementDecisionBriefMarkdown(brief);

    expect(markdown).toContain('# CRM vNext Engagement Decision Brief');
    expect(markdown).toContain('Requires Alejandro decision: yes');
    expect(markdown).toContain('Reader Example');
    expect(markdown).toContain('No outbound messages.');
    expect(markdown).not.toContain('message draft');
    expect(markdown).not.toContain('/Users/');
  });
});


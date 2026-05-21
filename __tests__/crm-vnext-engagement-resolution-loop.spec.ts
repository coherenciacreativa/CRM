import { describe, expect, test } from 'vitest';
import {
  buildCrmVNextEngagementResolutionLoopFromBrief,
} from '../lib/crm/crm-vnext-engagement-resolution-loop.js';
import {
  formatCrmVNextEngagementResolutionLoopMarkdown,
} from '../lib/crm/crm-vnext-engagement-resolution-loop-markdown.js';

const NOW = '2026-05-21T16:00:00.000Z';

const brief = () => ({
  ok: true,
  schemaVersion: 'crm-vnext-engagement-decision-brief-2026-05-21' as const,
  generatedAt: NOW,
  mode: 'read_only_engagement_decision_brief' as const,
  source: {
    movementRows: 2,
    unmatchedRows: 0,
    warmedRows: 2,
    cooledRows: 0,
    sourceSnapshots: 1,
    latestCapturedAt: NOW,
    includeObservationOnly: false,
  },
  summary: {
    urgency: 'watch' as const,
    totalCandidates: 2,
    returnedCandidates: 2,
    requiresAlejandroDecision: true,
    recommendedQuestion: 'Which warmed contacts deserve context review?',
    approvalBoundary: 'No outbound or writes.',
  },
  decisionOptions: [],
  candidates: [
    {
      rowId: 'snapshot:reader',
      personId: 'email:reader@example.com',
      displayName: 'Reader Example',
      identities: {
        email: 'reader@example.com',
        instagramHandle: 'reader',
        city: 'Bogota',
        country: 'Colombia',
      },
      movement: 'warmer',
      sourceFamily: 'gmail_replies',
      priority: {
        before: 7,
        after: 22,
        delta: 15,
      },
      operatorAction: {
        code: 'review_reply_context',
        label: 'Review reply context',
        reviewRequired: false,
        reason: 'A human email reply is a richer signal.',
      },
      decisionNeed: 'email_reply_context_review',
      primarySignals: ['1 email reply in 30d', 'newsletter_reply'],
      reasonCodes: ['email_replies'],
      riskCodes: [],
      suggestedQuestion: 'What should we understand from this reply?',
      suggestedInternalNextStep: 'Inspect reply context.',
      allowedWithoutApproval: [],
      blockedUntilApproval: [],
    },
    {
      rowId: 'snapshot:cielo',
      personId: 'ig:cielo_gom_g',
      displayName: 'Cielo Gomez',
      identities: {
        email: 'cielo@example.com',
        instagramHandle: 'cielo_gom_g',
        city: 'Bogota',
        country: 'Colombia',
      },
      movement: 'warmer',
      sourceFamily: 'mailerlite_engagement',
      priority: {
        before: 8,
        after: 18,
        delta: 10,
      },
      operatorAction: {
        code: 'review_warm_contact',
        label: 'Review warm contact',
        reviewRequired: false,
        reason: 'Priority moved meaningfully.',
      },
      decisionNeed: 'warm_contact_review',
      primarySignals: ['13 opens in 90d', 'Onboarding complete'],
      reasonCodes: ['email_reads_90d'],
      riskCodes: [],
      suggestedQuestion: 'Does this warmth matter?',
      suggestedInternalNextStep: 'Review card context.',
      allowedWithoutApproval: [],
      blockedUntilApproval: [],
    },
  ],
  safety: {
    localOnly: true as const,
    readOnly: true as const,
    outboundProhibited: true as const,
    recordMutationProhibited: true as const,
    scoreMutationProhibited: true as const,
    allowedUse: [],
    prohibitedActions: [],
  },
});

describe('CRM vNext engagement resolution loop', () => {
  test('turns an engagement decision brief into answer-ready human questions', () => {
    const packet = buildCrmVNextEngagementResolutionLoopFromBrief(brief(), {
      now: NOW,
    });

    expect(packet.schemaVersion).toBe('crm-vnext-engagement-resolution-loop-2026-05-21');
    expect(packet.mode).toBe('read_only_engagement_resolution_loop');
    expect(packet.summary).toMatchObject({
      questions: 2,
      highPriority: 1,
      mediumPriority: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
      factStoreWriteReady: false,
      outboundReady: false,
    });
    expect(packet.questions[0]).toMatchObject({
      personId: 'email:reader@example.com',
      priority: 'high',
      subject: {
        label: 'Reader Example (@reader)',
      },
      batchStatus: {
        status: 'engagement_decision_candidate',
        recommendedAction: 'review_reply_context',
      },
    });
    expect(packet.questions[0].known.memoryCues).toContain('1 email reply in 30d');
    expect(packet.resolutionPlan.nextCommands[0]).toContain('human-enrichment-response-evidence');
    expect(packet.safety.outboundProhibited).toBe(true);
    expect(JSON.stringify(packet)).not.toContain('/Users/');
  });

  test('formats markdown compatible with the freestyle answer parser', () => {
    const packet = buildCrmVNextEngagementResolutionLoopFromBrief(brief(), {
      now: NOW,
    });
    const markdown = formatCrmVNextEngagementResolutionLoopMarkdown(packet);

    expect(markdown).toContain('# CRM vNext - Engagement Resolution Loop');
    expect(markdown).toContain('## 1. Reader Example (@reader)');
    expect(markdown).toContain('Respuesta libre:');
    expect(markdown).toContain('human-enrichment-response-evidence');
    expect(markdown).toContain('No outbound.');
    expect(markdown).not.toContain('message draft');
    expect(markdown).not.toContain('/Users/');
  });
});


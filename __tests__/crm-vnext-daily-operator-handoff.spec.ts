import { describe, expect, test } from 'vitest';
import { buildCommunityDailyBrief } from '../lib/crm/community-daily-brief.js';
import {
  buildCrmVNextDailyOperatorHandoffFromInputs,
} from '../lib/crm/crm-vnext-daily-operator-handoff.js';
import {
  formatCrmVNextDailyOperatorHandoffMarkdown,
} from '../lib/crm/crm-vnext-daily-operator-handoff-markdown.js';

const NOW = '2026-05-21T17:10:00.000Z';

const dailyBrief = () => buildCommunityDailyBrief([], {
  now: NOW,
  engagementMovementQueue: {
    source: {
      latestCapturedAt: '2026-05-21T16:50:00.000Z',
      totalSignals: 18,
    },
    summary: {
      rows: 3,
      unmatchedRows: 0,
      reviewRows: 0,
    },
    rows: [
      {
        operatorAction: {
          code: 'review_reply_context',
          label: 'Review reply context',
          category: 'context_review',
          reviewRequired: false,
          outboundApprovalRequired: true,
          reason: 'A human email reply is richer than passive opens.',
        },
      },
      {
        operatorAction: {
          code: 'keep_observing_email',
          label: 'Keep observing email',
          category: 'observation',
          reviewRequired: false,
          outboundApprovalRequired: true,
          reason: 'Passive reading exists but does not justify outreach.',
        },
      },
    ],
  },
});

describe('CRM vNext daily operator handoff', () => {
  test('turns daily brief and resolution loop into an ordered no-send task list', () => {
    const handoff = buildCrmVNextDailyOperatorHandoffFromInputs(dailyBrief(), {
      now: NOW,
      sourceGeneratedAt: NOW,
      resolutionLoop: {
        summary: {
          questions: 1,
          highPriority: 1,
          broadQuestionsSuppressed: 2,
        },
      },
    });

    expect(handoff.schemaVersion).toBe('crm-vnext-daily-operator-handoff-2026-05-21');
    expect(handoff.mode).toBe('read_only_daily_operator_handoff');
    expect(handoff.summary).toMatchObject({
      urgency: 'notify',
      highPriority: 1,
      humanAskRecommended: true,
      operationsExecuted: 0,
    });
    expect(handoff.tasks.map((task) => task.taskId)).toEqual([
      'ask_compact_engagement_context',
      'review_context_covered_signals_internally',
      'keep_observation_lanes_quiet',
    ]);
    expect(handoff.tasks[0]).toMatchObject({
      lane: 'engagement_context',
      approvalRequired: false,
      recommendedSurface: {
        api: '/api/crm-vnext/engagement-resolution-loop?limit=5',
      },
    });
    expect(handoff.doNotDo).toContain('Do not turn passive opens or light observation into outreach.');
    expect(handoff.safety.outboundProhibited).toBe(true);
    expect(JSON.stringify(handoff)).not.toContain('/Users/');
  });

  test('formats a compact handoff markdown for Mantis', () => {
    const handoff = buildCrmVNextDailyOperatorHandoffFromInputs(dailyBrief(), {
      now: NOW,
      resolutionLoop: {
        summary: {
          questions: 0,
          highPriority: 0,
          broadQuestionsSuppressed: 0,
        },
      },
    });
    const markdown = formatCrmVNextDailyOperatorHandoffMarkdown(handoff);

    expect(markdown).toContain('# CRM vNext - Daily Operator Handoff');
    expect(markdown).toContain('## Executive Brief');
    expect(markdown).toContain('Keep observation lanes quiet');
    expect(markdown).toContain('## Do Not Do');
    expect(markdown).toContain('No outbound messages.');
    expect(markdown).not.toContain('message draft');
    expect(markdown).not.toContain('/Users/');
  });
});

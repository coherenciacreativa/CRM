import { describe, expect, test } from 'vitest';
import {
  buildCrmVNextEngagementMovementQueueFromLedger,
} from '../lib/crm/crm-vnext-engagement-movement-queue.js';
import { buildPersonCardVNext, type PersonCardVNext } from '../lib/crm/person-card-vnext.js';

const NOW = '2026-05-21T12:00:00.000Z';

const buildCard = (input: Parameters<typeof buildPersonCardVNext>[0]): PersonCardVNext =>
  buildPersonCardVNext({ now: NOW, ...input });

const ledger = () => ({
  summary: {
    snapshots: 1,
    latestCapturedAt: NOW,
    totalSignals: 4,
  },
  snapshots: [
    {
      snapshotRecordId: 'engagement_snapshot_test',
      capturedAt: NOW,
      unmatchedSignals: [
        {
          unmatchedItemId: 'unmatched_1',
          sourceKind: 'gmail_reply_activity',
          email: 'orphan@example.com',
          reason: 'no_matching_card',
          safeNextStep: 'Run identity stitching first.',
        },
      ],
    },
  ],
  latestMovements: [
    {
      snapshotRecordId: 'engagement_snapshot_test',
      movementItemId: 'movement_reply',
      capturedAt: NOW,
      personId: 'email:reader@example.com',
      displayName: 'Reader Example',
      movement: 'warmer',
      recommendedQueue: 'keep_observing',
      match: {
        sourceKinds: ['gmail_reply_activity'],
      },
      before: {
        stage: 'SEMILLA',
        priorityScore: 7,
      },
      after: {
        stage: 'SEMILLA',
        priorityScore: 22,
      },
      delta: {
        priorityScore: 15,
        commercialWarmth: 6,
        communityDepth: 20,
        relationshipEngagement: 24,
        dataConfidence: 8,
      },
      newReasonCodes: ['email_replies'],
      newRiskCodes: [],
      aggregatedSignals: {
        email: {
          replies30d: 1,
          lastReplyAt: '2026-05-20T12:00:00.000Z',
        },
        instagram: {},
        tags: ['newsletter_reply'],
      },
    },
    {
      snapshotRecordId: 'engagement_snapshot_test',
      movementItemId: 'movement_open',
      capturedAt: NOW,
      personId: 'ig:cielo_gom_g',
      displayName: 'Cielo Gómez',
      movement: 'warmer',
      recommendedQueue: 'keep_observing',
      match: {
        sourceKinds: ['mailerlite_subscriber_activity'],
      },
      before: {
        stage: 'SEMILLA',
        priorityScore: 8,
      },
      after: {
        stage: 'SEMILLA',
        priorityScore: 14,
      },
      delta: {
        priorityScore: 6,
        commercialWarmth: 0,
        communityDepth: 10,
        relationshipEngagement: 12,
        dataConfidence: 2,
      },
      newReasonCodes: ['email_reads_90d'],
      newRiskCodes: [],
      aggregatedSignals: {
        email: {
          opens90d: 5,
          lifetimeOpens: 9,
          subscriberStatus: 'active',
        },
        instagram: {},
        tags: ['Onboarding complete'],
      },
    },
    {
      snapshotRecordId: 'engagement_snapshot_test',
      movementItemId: 'movement_steady',
      capturedAt: NOW,
      personId: 'email:steady@example.com',
      displayName: 'Steady Example',
      movement: 'unchanged',
      recommendedQueue: 'keep_observing',
      match: {
        sourceKinds: ['mailerlite_subscriber_activity'],
      },
      before: {
        stage: 'SEMILLA',
        priorityScore: 6,
      },
      after: {
        stage: 'SEMILLA',
        priorityScore: 6,
      },
      delta: {
        priorityScore: 0,
      },
      newReasonCodes: [],
      newRiskCodes: [],
      aggregatedSignals: {
        email: {},
        instagram: {},
      },
    },
  ],
});

const cards = () => [
  buildCard({
    personId: 'email:reader@example.com',
    displayName: 'Reader Example',
    identities: { email: 'reader@example.com' },
    evidence: [{ source: 'test' }],
  }),
  buildCard({
    personId: 'ig:cielo_gom_g',
    displayName: 'Cielo Gómez',
    identities: { email: 'cielotago@gmail.com', instagramHandle: 'cielo_gom_g' },
    evidence: [{ source: 'test' }],
  }),
  buildCard({
    personId: 'email:steady@example.com',
    displayName: 'Steady Example',
    identities: { email: 'steady@example.com' },
    evidence: [{ source: 'test' }],
  }),
];

describe('CRM vNext engagement movement queue', () => {
  test('turns latest movement history into Mantis-ready operator rows', () => {
    const queue = buildCrmVNextEngagementMovementQueueFromLedger(ledger(), cards(), {
      now: NOW,
    });

    expect(queue.schemaVersion).toBe('crm-vnext-engagement-movement-queue-2026-05-21');
    expect(queue.summary).toMatchObject({
      rows: 2,
      warmedRows: 2,
      unmatchedRows: 1,
      reviewRows: 1,
    });
    expect(queue.rows[0]).toMatchObject({
      personId: 'email:reader@example.com',
      sourceFamily: 'gmail_replies',
      operatorAction: {
        code: 'review_reply_context',
        reviewRequired: false,
      },
      signals: {
        email: {
          replies30d: 1,
        },
      },
    });
    expect(queue.rows[0].card?.identities.email).toBe('reader@example.com');
    expect(queue.unmatchedRows[0]).toMatchObject({
      email: 'orphan@example.com',
      operatorAction: {
        code: 'stitch_identity',
        reviewRequired: true,
      },
    });
    expect(queue.safety.outboundProhibited).toBe(true);
  });

  test('can include unchanged rows when the operator requests them', () => {
    const queue = buildCrmVNextEngagementMovementQueueFromLedger(ledger(), cards(), {
      now: NOW,
      includeUnchanged: true,
    });

    expect(queue.summary.rows).toBe(3);
    expect(queue.rows.some((row) => row.personId === 'email:steady@example.com')).toBe(true);
  });

  test('does not expose source ids or local paths from movement history', () => {
    const payload: any = ledger();
    payload.latestMovements[0].match.sourceIds = ['/Users/alejandrogomez/private/source.json'];

    const queue = buildCrmVNextEngagementMovementQueueFromLedger(payload, cards(), {
      now: NOW,
    });

    expect(JSON.stringify(queue)).not.toContain('/Users/');
    expect(JSON.stringify(queue)).not.toContain('private/source.json');
  });

  test('routes ClassBot participation movement to care instead of automatic warm follow-up', () => {
    const payload: any = ledger();
    payload.snapshots[0].unmatchedSignals = [];
    payload.latestMovements = [
      {
        snapshotRecordId: 'engagement_snapshot_test',
        movementItemId: 'movement_yoga',
        capturedAt: NOW,
        personId: 'phone:+573001112233',
        displayName: 'Yoga Student',
        movement: 'warmer',
        recommendedQueue: 'keep_observing',
        match: {
          sourceKinds: ['classbot_activity'],
        },
        before: {
          stage: 'SEMILLA',
          priorityScore: 12,
        },
        after: {
          stage: 'GERMINADA',
          priorityScore: 31,
          commercialWarmth: 22,
          communityDepth: 72,
          relationshipEngagement: 45,
          dataConfidence: 41,
        },
        delta: {
          priorityScore: 19,
          commercialWarmth: 8,
          communityDepth: 40,
          relationshipEngagement: 18,
          dataConfidence: 6,
        },
        newReasonCodes: ['community_participation'],
        newRiskCodes: [],
        aggregatedSignals: {
          email: {},
          instagram: {},
          participation: {
            yogaClasses90d: 8,
            lastAttendanceAt: NOW,
          },
          tags: ['yoga'],
        },
      },
    ];

    const queue = buildCrmVNextEngagementMovementQueueFromLedger(
      payload,
      [
        ...cards(),
        buildCard({
          personId: 'phone:+573001112233',
          displayName: 'Yoga Student',
          identities: {
            email: 'yoga@example.com',
            phone: '+573001112233',
            city: 'Medellin',
            country: 'Colombia',
          },
          evidence: [{ source: 'classbot' }, { source: 'human_review' }],
        }),
      ],
      { now: NOW },
    );

    expect(queue.rows[0].operatorAction).toMatchObject({
      code: 'care_or_retention',
      category: 'care',
      reviewRequired: false,
    });
    expect(queue.rows[0].operatorAction.reason).toContain('not automatic sales heat');
  });
});

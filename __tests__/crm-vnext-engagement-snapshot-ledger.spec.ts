import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import handler from '../pages/api/crm-vnext/engagement-snapshots.js';
import {
  appendCrmEngagementSnapshotLedger,
  buildCrmEngagementSnapshotFromPreview,
  readCrmEngagementSnapshotLedger,
} from '../lib/crm/crm-vnext-engagement-snapshot-ledger.js';

const NOW = '2026-05-15T12:00:00.000Z';

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempLedger = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'crm-vnext-engagement-snapshots-'));
  dirs.push(dir);
  return join(dir, 'ledger.jsonl');
};

const previewPayload = () => ({
  ok: true,
  mode: 'read_only_engagement_signal_preview',
  generatedAt: NOW,
  summary: {
    cardsAvailable: 10,
    signalsRead: 3,
    matchedSignals: 2,
    unmatchedSignals: 1,
    cardsPreviewed: 2,
    warmedCards: 1,
    cooledCards: 0,
    humanFollowUpReview: 0,
    emailNurtureCandidates: 0,
    suppressionReviews: 0,
    operationsExecuted: 0,
    cardMutationReady: false,
  },
  previewItems: [
    {
      previewItemId: 'engagement_preview_reader',
      personId: 'email:reader@example.com',
      displayName: 'Reader Example',
      match: {
        matchedBy: 'email',
        signalCount: 1,
        sourceKinds: ['mailerlite_subscriber_activity'],
        sourceIds: ['/Users/alejandrogomez/private/mailerlite.json'],
      },
      before: {
        stage: 'SEMILLA',
        priorityScore: 8,
        commercialWarmth: 3,
        communityDepth: 4,
        relationshipEngagement: 5,
        dataConfidence: 40,
        nextBestAction: 'keep_observing',
      },
      after: {
        stage: 'GERMINADA',
        priorityScore: 18,
        commercialWarmth: 8,
        communityDepth: 8,
        relationshipEngagement: 18,
        dataConfidence: 50,
        nextBestAction: 'keep_observing',
      },
      delta: {
        priorityScore: 10,
        commercialWarmth: 5,
        communityDepth: 4,
        relationshipEngagement: 13,
        dataConfidence: 10,
      },
      movement: 'warmer',
      newReasonCodes: ['email_recent_opens'],
      newRiskCodes: [],
      recommendedQueue: 'keep_observing',
      aggregatedSignals: {
        email: {
          opens30d: 2,
          clicks30d: 0,
          opens90d: 7,
          clicks90d: 1,
          lifetimeOpens: 20,
          lifetimeClicks: 2,
          lifetimeSent: 30,
          openRate: 67,
          clickRate: 6,
          lastOpenAt: '2026-05-14T10:00:00.000Z',
          subscriberStatus: 'active',
        },
        instagram: {},
        tags: ['Newsletter'],
      },
      safeNextStep: 'Keep observing engagement until a stronger pattern emerges.',
    },
    {
      previewItemId: 'engagement_preview_steady',
      personId: 'email:steady@example.com',
      displayName: 'Steady Example',
      match: {
        matchedBy: 'email',
        signalCount: 1,
        sourceKinds: ['mailerlite_subscriber_activity'],
        sourceIds: ['ml-steady'],
      },
      before: {
        stage: 'GERMINADA',
        priorityScore: 12,
        commercialWarmth: 6,
        communityDepth: 9,
        relationshipEngagement: 10,
        dataConfidence: 50,
        nextBestAction: 'keep_observing',
      },
      after: {
        stage: 'GERMINADA',
        priorityScore: 12,
        commercialWarmth: 6,
        communityDepth: 9,
        relationshipEngagement: 10,
        dataConfidence: 50,
        nextBestAction: 'keep_observing',
      },
      delta: {
        priorityScore: 0,
        commercialWarmth: 0,
        communityDepth: 0,
        relationshipEngagement: 0,
        dataConfidence: 0,
      },
      movement: 'unchanged',
      newReasonCodes: [],
      newRiskCodes: [],
      recommendedQueue: 'keep_observing',
      aggregatedSignals: { email: {}, instagram: {}, tags: [] },
      safeNextStep: 'Keep observing engagement until a stronger pattern emerges.',
    },
  ],
  unmatchedSignals: [
    {
      unmatchedItemId: 'engagement_unmatched_orphan',
      sourceKind: 'mailerlite_campaign_activity',
      sourceId: 'ml-orphan',
      email: 'orphan@example.com',
      reason: 'no_matching_card',
      safeNextStep: 'Run identity stitching first.',
    },
  ],
  safety: {
    readOnly: true,
    outboundProhibited: true,
    cardMutationProhibited: true,
    factStoreWriteProhibited: true,
    credentialReadProhibited: true,
    liveApiCallsProhibited: true,
    engagementPreviewOnly: true,
  },
});

describe('CRM vNext engagement snapshot ledger', () => {
  test('builds a compact stored snapshot from a read-only preview', () => {
    const snapshot = buildCrmEngagementSnapshotFromPreview(previewPayload(), {
      now: NOW,
      approvedBy: 'Alejandro',
      sourceLabel: 'MailerLite test snapshot',
    });

    expect(snapshot.schemaVersion).toBe('crm-vnext-stored-engagement-snapshot-2026-05-15');
    expect(snapshot.previewSummary).toMatchObject({
      signalsRead: 3,
      matchedSignals: 2,
      warmedCards: 1,
      operationsExecuted: 0,
      cardMutationReady: false,
    });
    expect(snapshot.movements).toHaveLength(2);
    expect(snapshot.movements[0]).toMatchObject({
      personId: 'email:reader@example.com',
      movement: 'warmer',
      delta: { priorityScore: 10 },
    });
    expect(snapshot.safety).toMatchObject({
      cardMutationExecuted: false,
      factStoreWriteExecuted: false,
      outboundExecuted: false,
      previewOnly: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain('/Users/');
  });

  test('previews, commits, reads, and skips duplicate snapshots', async () => {
    const ledgerPath = await tempLedger();

    const preview = await appendCrmEngagementSnapshotLedger({
      preview: previewPayload(),
      approvedBy: 'Alejandro',
      commit: false,
      ledgerPath,
      now: NOW,
    });
    expect(preview.committed).toBe(false);
    expect(preview.added).toHaveLength(1);
    expect(preview.summaryAfter.snapshots).toBe(0);

    const committed = await appendCrmEngagementSnapshotLedger({
      preview: previewPayload(),
      approvedBy: 'Alejandro',
      commit: true,
      ledgerPath,
      now: NOW,
    });
    expect(committed.committed).toBe(true);
    expect(committed.added).toHaveLength(1);
    expect(committed.summaryAfter).toMatchObject({
      snapshots: 1,
      totalSignals: 3,
      totalMatchedSignals: 2,
      totalWarmedCards: 1,
    });

    const duplicate = await appendCrmEngagementSnapshotLedger({
      preview: previewPayload(),
      approvedBy: 'Alejandro',
      commit: true,
      ledgerPath,
      now: NOW,
    });
    expect(duplicate.added).toHaveLength(0);
    expect(duplicate.duplicatesSkipped).toHaveLength(1);

    const ledger = await readCrmEngagementSnapshotLedger(ledgerPath, { now: NOW });
    expect(ledger.summary.snapshots).toBe(1);
    expect(ledger.latestMovements[0]).toMatchObject({
      personId: 'email:reader@example.com',
      movement: 'warmer',
    });
    expect(ledger.safety.cardMutationProhibited).toBe(true);
  });

  test('rejects mutating preview payloads and requires approver for writes', async () => {
    const ledgerPath = await tempLedger();
    await expect(appendCrmEngagementSnapshotLedger({
      preview: previewPayload(),
      approvedBy: '',
      commit: true,
      ledgerPath,
    })).rejects.toThrow('engagement_snapshot_approved_by_required');

    const badPreview = previewPayload();
    badPreview.summary.operationsExecuted = 1;
    await expect(appendCrmEngagementSnapshotLedger({
      preview: badPreview,
      approvedBy: 'Alejandro',
      commit: false,
      ledgerPath,
    })).rejects.toThrow('engagement_snapshot_preview_must_be_non_mutating');
  });

  test('serves the local ledger through the read-only API', async () => {
    const ledgerPath = await tempLedger();
    await appendCrmEngagementSnapshotLedger({
      preview: previewPayload(),
      approvedBy: 'Alejandro',
      commit: true,
      ledgerPath,
      now: NOW,
    });

    const response = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        response.statusCode = code;
        return response;
      },
      json(payload: unknown) {
        response.body = payload;
        return response;
      },
    };

    await handler(
      {
        method: 'GET',
        query: { ledgerPath, limit: '5' },
        headers: {},
        socket: {},
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(200);
    expect((response.body as { ok?: boolean }).ok).toBe(true);
    expect((response.body as { ledger: { summary: { snapshots: number } } }).ledger.summary.snapshots).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain('/Users/');
  });
});

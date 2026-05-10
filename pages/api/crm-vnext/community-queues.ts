import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCommunityQueues,
  summarizeCommunityQueues,
  type CommunityQueueSummary,
} from '../../../lib/crm/community-queues';
import {
  evaluateCommunityQueueStatus,
  type CommunityQueueStatusReport,
} from '../../../lib/crm/community-queue-status';
import {
  buildCommunityQueueSnapshot,
  readCommunityQueueSnapshot,
  snapshotToPreviousMatched,
  type CommunityQueueSnapshot,
} from '../../../lib/crm/community-queue-snapshots';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PersonCardsVNextSourceResult,
} from '../../../lib/crm/community-insights-source';

type ApiBody =
  | {
      ok: true;
      source: Omit<PersonCardsVNextSourceResult['source'], 'path'>;
      queues: CommunityQueueSummary[];
      status: CommunityQueueStatusReport;
      snapshot: {
        current: CommunityQueueSnapshot;
        previousLoaded: boolean;
        previousGeneratedAt: string | null;
      };
    }
  | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  const allowLocalQueryOverrides = allowCrmVNextLocalQueryOverrides(req);
  const sourcePath =
    typeof req.query.sourcePath === 'string' && allowLocalQueryOverrides
      ? req.query.sourcePath
      : process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
  const previousSnapshotPath =
    typeof req.query.previousSnapshotPath === 'string' && allowLocalQueryOverrides
      ? req.query.previousSnapshotPath
      : process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH || null;

  try {
    const payload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    const queues = summarizeCommunityQueues(buildCommunityQueues(payload.cards));
    const previousSnapshot = previousSnapshotPath ? await readCommunityQueueSnapshot(previousSnapshotPath) : null;
    const generatedAt = new Date().toISOString();
    return res.status(200).json({
      ok: true,
      source: publicLegacyPersonCardsV1Source(payload.source),
      queues,
      status: evaluateCommunityQueueStatus(queues, {
        now: generatedAt,
        previousMatched: snapshotToPreviousMatched(previousSnapshot),
      }),
      snapshot: {
        current: buildCommunityQueueSnapshot(queues, payload.source, { now: generatedAt }),
        previousLoaded: Boolean(previousSnapshot),
        previousGeneratedAt: previousSnapshot?.generatedAt ?? null,
      },
    });
  } catch (error) {
    console.error('crm-vnext community-queues error', error);
    return res.status(500).json({ ok: false, error: 'community_queues_failed' });
  }
}

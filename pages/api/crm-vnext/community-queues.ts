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
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../../lib/crm/community-insights-source';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      source: PublicPersonCardsVNextSource;
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
  const sourceOptions = resolveCrmVNextReadSourceOptions(req);
  const previousSnapshotPath =
    typeof req.query.previousSnapshotPath === 'string' && allowLocalQueryOverrides
      ? req.query.previousSnapshotPath
      : process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH || null;

  try {
    const payload = await loadPersonCardsVNext(sourceOptions);
    const queues = summarizeCommunityQueues(buildCommunityQueues(payload.cards));
    const previousSnapshot = previousSnapshotPath ? await readCommunityQueueSnapshot(previousSnapshotPath) : null;
    const generatedAt = new Date().toISOString();
    return res.status(200).json({
      ok: true,
      source: publicPersonCardsVNextSource(payload.source),
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

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCommunityDailyBrief,
  type CommunityDailyBrief,
} from '../../../lib/crm/community-daily-brief';
import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../../lib/crm/community-insights-source';
import {
  readCommunityQueueSnapshot,
  snapshotToPreviousMatched,
} from '../../../lib/crm/community-queue-snapshots';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      source: PublicPersonCardsVNextSource;
      snapshot: {
        previousLoaded: boolean;
        previousGeneratedAt: string | null;
      };
      brief: CommunityDailyBrief;
    }
  | { ok: false; error: string };

const parsePositiveInt = (value: string | string[] | undefined, fallback: number, max: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

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
  const focusQueueLimit = parsePositiveInt(req.query.focusQueueLimit, 3, 5);
  const peoplePerQueue = parsePositiveInt(req.query.peoplePerQueue, 3, 10);

  try {
    const payload = await loadPersonCardsVNext(sourceOptions);
    const previousSnapshot = previousSnapshotPath ? await readCommunityQueueSnapshot(previousSnapshotPath) : null;

    return res.status(200).json({
      ok: true,
      source: publicPersonCardsVNextSource(payload.source),
      snapshot: {
        previousLoaded: Boolean(previousSnapshot),
        previousGeneratedAt: previousSnapshot?.generatedAt ?? null,
      },
      brief: buildCommunityDailyBrief(payload.cards, {
        previousMatched: snapshotToPreviousMatched(previousSnapshot),
        focusQueueLimit,
        peoplePerQueue,
      }),
    });
  } catch (error) {
    console.error('crm-vnext community-daily-brief error', error);
    return res.status(500).json({ ok: false, error: 'community_daily_brief_failed' });
  }
}

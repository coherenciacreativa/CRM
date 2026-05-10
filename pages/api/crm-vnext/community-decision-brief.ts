import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCommunityDecisionBrief,
  type CommunityDecisionBrief,
} from '../../../lib/crm/community-decision-brief';
import {
  COMMUNITY_QUEUE_DEFINITIONS,
  type CommunityQueueId,
} from '../../../lib/crm/community-queues';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  type PersonCardsVNextSourceResult,
} from '../../../lib/crm/community-insights-source';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      source: Omit<PersonCardsVNextSourceResult['source'], 'path'>;
      brief: CommunityDecisionBrief;
    }
  | { ok: false; error: string };

const QUEUE_IDS = new Set(COMMUNITY_QUEUE_DEFINITIONS.map((queue) => queue.id));

const parseQueueId = (value: string | string[] | undefined): CommunityQueueId | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !QUEUE_IDS.has(raw as CommunityQueueId)) return null;
  return raw as CommunityQueueId;
};

const parsePositiveInt = (value: string | string[] | undefined, fallback: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 10);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  const queueId = parseQueueId(req.query.queueId);
  if (!queueId) {
    return res.status(400).json({ ok: false, error: 'invalid_queue_id' });
  }

  const sourcePath =
    typeof req.query.sourcePath === 'string' && allowCrmVNextLocalQueryOverrides(req)
      ? req.query.sourcePath
      : process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
  const limit = parsePositiveInt(req.query.limit, 5);

  try {
    const payload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    return res.status(200).json({
      ok: true,
      source: {
        kind: payload.source.kind,
        generatedAt: payload.source.generatedAt,
        cards: payload.source.cards,
      },
      brief: buildCommunityDecisionBrief(payload.cards, queueId, { limit }),
    });
  } catch (error) {
    console.error('crm-vnext community-decision-brief error', error);
    return res.status(500).json({ ok: false, error: 'community_decision_brief_failed' });
  }
}

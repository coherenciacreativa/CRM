import type { NextApiRequest, NextApiResponse } from 'next';
import {
  loadPersonCardsVNextInsights,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../../lib/crm/community-insights-source';
import type { CommunityInsightsSummary } from '../../../lib/crm/community-insights';
import { authorizeCrmVNextInternalRead } from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      source: PublicPersonCardsVNextSource;
      summary: CommunityInsightsSummary;
    }
  | { ok: false; error: string };

const parsePositiveInt = (value: string | string[] | undefined, fallback: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  const sourceOptions = resolveCrmVNextReadSourceOptions(req);
  const topLimit = parsePositiveInt(req.query.topLimit, 10);

  try {
    const payload = await loadPersonCardsVNextInsights({
      ...sourceOptions,
      topLimit,
    });
    return res.status(200).json({
      ok: true,
      source: publicPersonCardsVNextSource(payload.source),
      summary: payload.summary,
    });
  } catch (error) {
    console.error('crm-vnext community-insights error', error);
    return res.status(500).json({ ok: false, error: 'community_insights_failed' });
  }
}

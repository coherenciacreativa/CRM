import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1Insights,
} from '../../../lib/crm/community-insights-source';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | Awaited<ReturnType<typeof loadLegacyPersonCardsV1Insights>>
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

  const sourcePath =
    typeof req.query.sourcePath === 'string' && allowCrmVNextLocalQueryOverrides(req)
      ? req.query.sourcePath
      : process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
  const topLimit = parsePositiveInt(req.query.topLimit, 10);

  try {
    const payload = await loadLegacyPersonCardsV1Insights(sourcePath, {
      topLimit,
    });
    return res.status(200).json(payload);
  } catch (error) {
    console.error('crm-vnext community-insights error', error);
    return res.status(500).json({ ok: false, error: 'community_insights_failed' });
  }
}

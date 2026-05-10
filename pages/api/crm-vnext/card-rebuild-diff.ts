import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  buildCrmVNextCardRebuildDiff,
  type CrmCardRebuildDiffReport,
} from '../../../lib/crm/crm-vnext-card-rebuild-diff';
import { buildCrmVNextIdentityReview } from '../../../lib/crm/crm-vnext-identity-review';
import { readCrmFactStore } from '../../../lib/crm/crm-vnext-fact-store';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      source: PublicLegacyPersonCardsV1Source;
      diff: CrmCardRebuildDiffReport;
    }
  | { ok: false; error: string };

const cleanString = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
};

const cleanLimit = (value: string | string[] | undefined): number => {
  const parsed = Number.parseInt(cleanString(value) ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 50;
  return Math.min(parsed, 100);
};

const pathOverride = (
  req: NextApiRequest,
  queryKey: string,
  fallback: string | null = null,
): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return fallback;
  return cleanString(req.query[queryKey]) ?? fallback;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  try {
    const sourcePath =
      pathOverride(req, 'sourcePath', process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH)
      ?? DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
    const storePath = pathOverride(req, 'storePath');
    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    const store = await readCrmFactStore(storePath ?? undefined, { limit: cleanLimit(req.query.limit) });
    const review = buildCrmVNextIdentityReview({
      cards: cardsPayload.cards,
      facts: store.facts,
    });

    return res.status(200).json({
      ok: true,
      source: publicLegacyPersonCardsV1Source(cardsPayload.source),
      diff: buildCrmVNextCardRebuildDiff({
        cards: cardsPayload.cards,
        review,
      }),
    });
  } catch (error) {
    console.error('crm-vnext card-rebuild-diff api error', error);
    return res.status(500).json({ ok: false, error: 'card_rebuild_diff_failed' });
  }
}

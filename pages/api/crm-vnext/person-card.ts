import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardV1ByPersonId,
  type PersonCardVNextSourceResult,
} from '../../../lib/crm/community-insights-source';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import type { PersonCardVNext } from '../../../lib/crm/person-card-vnext';

type ApiBody =
  | {
      ok: true;
      source: Omit<PersonCardVNextSourceResult['source'], 'path'>;
      card: PersonCardVNext;
    }
  | { ok: false; error: string };

const getParam = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  const personId = getParam(req.query.personId);
  if (!personId) {
    return res.status(400).json({ ok: false, error: 'invalid_person_id' });
  }

  const sourcePath =
    typeof req.query.sourcePath === 'string' && allowCrmVNextLocalQueryOverrides(req)
      ? req.query.sourcePath
      : process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;

  try {
    const payload = await loadLegacyPersonCardV1ByPersonId(personId, sourcePath);
    if (!payload.card) {
      return res.status(404).json({ ok: false, error: 'person_card_not_found' });
    }

    return res.status(200).json({
      ok: true,
      source: {
        kind: payload.source.kind,
        generatedAt: payload.source.generatedAt,
        cards: payload.source.cards,
      },
      card: payload.card,
    });
  } catch (error) {
    console.error('crm-vnext person-card api error', error);
    return res.status(500).json({ ok: false, error: 'person_card_failed' });
  }
}

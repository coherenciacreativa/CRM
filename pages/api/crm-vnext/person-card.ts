import type { NextApiRequest, NextApiResponse } from 'next';
import {
  loadPersonCardVNextByPersonId,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../../lib/crm/community-insights-source';
import { authorizeCrmVNextInternalRead } from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';
import type { PersonCardVNext } from '../../../lib/crm/person-card-vnext';

type ApiBody =
  | {
      ok: true;
      source: PublicPersonCardsVNextSource;
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

  const sourceOptions = resolveCrmVNextReadSourceOptions(req);

  try {
    const payload = await loadPersonCardVNextByPersonId(personId, sourceOptions);
    if (!payload.card) {
      return res.status(404).json({ ok: false, error: 'person_card_not_found' });
    }

    return res.status(200).json({
      ok: true,
      source: publicPersonCardsVNextSource(payload.source),
      card: payload.card,
    });
  } catch (error) {
    console.error('crm-vnext person-card api error', error);
    return res.status(500).json({ ok: false, error: 'person_card_failed' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextReadiness,
  buildCrmVNextUnavailableReadiness,
  type CrmVNextReadiness,
  type CrmVNextReadinessUnavailable,
} from '../../../lib/crm/crm-vnext-readiness';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
} from '../../../lib/crm/community-insights-source';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      readiness: CrmVNextReadiness | CrmVNextReadinessUnavailable;
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

  const sourcePath =
    typeof req.query.sourcePath === 'string' && allowCrmVNextLocalQueryOverrides(req)
      ? req.query.sourcePath
      : process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;

  try {
    const payload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    return res.status(200).json({
      ok: true,
      readiness: buildCrmVNextReadiness(payload.cards, payload.source),
    });
  } catch {
    return res.status(200).json({
      ok: true,
      readiness: buildCrmVNextUnavailableReadiness({
        reason: 'The configured local person-cards source could not be loaded.',
      }),
    });
  }
}

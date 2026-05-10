import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextReadiness,
  buildCrmVNextUnavailableReadiness,
  type CrmVNextReadiness,
  type CrmVNextReadinessUnavailable,
} from '../../../lib/crm/crm-vnext-readiness';
import {
  loadPersonCardsVNext,
} from '../../../lib/crm/community-insights-source';
import {
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

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

  const sourceOptions = resolveCrmVNextReadSourceOptions(req);

  try {
    const payload = await loadPersonCardsVNext(sourceOptions);
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

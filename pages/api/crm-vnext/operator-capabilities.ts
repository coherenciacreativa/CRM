import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextOperatorCapabilities,
  type CrmVNextOperatorCapabilities,
} from '../../../lib/crm/crm-vnext-operator-capabilities';
import { authorizeCrmVNextInternalRead } from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      capabilities: CrmVNextOperatorCapabilities;
    }
  | { ok: false; error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  return res.status(200).json({
    ok: true,
    capabilities: buildCrmVNextOperatorCapabilities(),
  });
}

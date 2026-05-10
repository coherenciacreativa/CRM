import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextSourceLedger,
  DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS,
  type CrmVNextSourceLedger,
} from '../../../lib/crm/crm-vnext-source-ledger';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      ledger: CrmVNextSourceLedger;
    }
  | { ok: false; error: string };

const parsePositiveInt = (value: string | string[] | undefined): number | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const pathOverride = (
  req: NextApiRequest,
  queryKey: string,
  fallback: string,
): string => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return fallback;
  const value = req.query[queryKey];
  return typeof value === 'string' && value.trim() ? value : fallback;
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
    const ledger = await buildCrmVNextSourceLedger({
      expectedMailerLiteContacts: parsePositiveInt(req.query.expectedMailerLiteContacts),
      paths: {
        personCards: pathOverride(req, 'personCardsPath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.personCards),
        mailerSnapshot: pathOverride(req, 'mailerSnapshotPath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.mailerSnapshot),
        mailerBridge: pathOverride(req, 'mailerBridgePath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.mailerBridge),
        skippedMailerRows: pathOverride(req, 'skippedMailerRowsPath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.skippedMailerRows),
        igUiSignals: pathOverride(req, 'igUiSignalsPath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.igUiSignals),
        igApiInbox: pathOverride(req, 'igApiInboxPath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.igApiInbox),
        igWebProbe: pathOverride(req, 'igWebProbePath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.igWebProbe),
        factStore: pathOverride(req, 'factStorePath', DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS.factStore),
      },
    });

    return res.status(200).json({ ok: true, ledger });
  } catch (error) {
    console.error('crm-vnext source-ledger api error', error);
    return res.status(500).json({ ok: false, error: 'source_ledger_failed' });
  }
}

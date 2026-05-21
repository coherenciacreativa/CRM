import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextDailyOperatorHandoff,
  type CrmVNextDailyOperatorHandoff,
} from '../../../lib/crm/crm-vnext-daily-operator-handoff';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      handoff: CrmVNextDailyOperatorHandoff;
    }
  | { ok: false; error: string };

const cleanString = (value: unknown): string | null => {
  if (Array.isArray(value)) return cleanString(value[0]);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanPositiveInt = (value: unknown, fallback: number, max: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const cleanBoolean = (value: unknown): boolean => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === true || raw === 'true' || raw === '1';
};

const getLocalPath = (req: NextApiRequest, key: string): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return null;
  return cleanString(req.query[key]);
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

  try {
    return res.status(200).json({
      ok: true,
      handoff: await buildCrmVNextDailyOperatorHandoff({
        ...sourceOptions,
        ledgerPath: getLocalPath(req, 'ledgerPath'),
        previousSnapshotPath: getLocalPath(req, 'previousSnapshotPath'),
        factStorePath: getLocalPath(req, 'factStorePath'),
        contextFactLedgerPath: getLocalPath(req, 'contextFactLedgerPath'),
        focusQueueLimit: cleanPositiveInt(req.query.focusQueueLimit, 3, 5),
        peoplePerQueue: cleanPositiveInt(req.query.peoplePerQueue, 3, 10),
        resolutionLimit: cleanPositiveInt(req.query.resolutionLimit, 5, 10),
        queueLimit: cleanPositiveInt(req.query.queueLimit, 40, 100),
        snapshotLimit: cleanPositiveInt(req.query.snapshotLimit, 5, 25),
        movementLimit: cleanPositiveInt(req.query.movementLimit, 100, 250),
        includeObservationOnly: cleanBoolean(req.query.includeObservationOnly),
        includeResolutionLoop: !cleanBoolean(req.query.skipResolutionLoop),
      }),
    });
  } catch (error) {
    console.error('crm-vnext daily-operator-handoff api error', error);
    return res.status(500).json({ ok: false, error: 'daily_operator_handoff_failed' });
  }
}

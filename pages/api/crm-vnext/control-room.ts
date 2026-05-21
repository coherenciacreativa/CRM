import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextControlRoom,
  type CrmVNextControlRoom,
} from '../../../lib/crm/crm-vnext-control-room';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      controlRoom: CrmVNextControlRoom;
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
      controlRoom: await buildCrmVNextControlRoom({
        ...sourceOptions,
        reportsDir: getLocalPath(req, 'reportsDir'),
        ledgerPath: getLocalPath(req, 'ledgerPath'),
        factStorePath: getLocalPath(req, 'factStorePath'),
        contextFactLedgerPath: getLocalPath(req, 'contextFactLedgerPath'),
        signalSinceDays: cleanPositiveInt(req.query.signalSinceDays, 14, 60),
        signalLimit: cleanPositiveInt(req.query.signalLimit, 120, 500),
        resolutionLimit: cleanPositiveInt(req.query.resolutionLimit, 5, 10),
        includeResolutionLoop: !cleanBoolean(req.query.skipResolutionLoop),
      }),
    });
  } catch (error) {
    console.error('crm-vnext control-room api error', error);
    return res.status(500).json({ ok: false, error: 'control_room_failed' });
  }
}

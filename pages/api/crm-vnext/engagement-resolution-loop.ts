import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmVNextEngagementResolutionLoop,
} from '../../../lib/crm/crm-vnext-engagement-resolution-loop';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      packet: Awaited<ReturnType<typeof buildCrmVNextEngagementResolutionLoop>>;
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

const getLedgerPath = (req: NextApiRequest): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return null;
  return cleanString(req.query.ledgerPath);
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
      packet: await buildCrmVNextEngagementResolutionLoop({
        ...sourceOptions,
        ledgerPath: getLedgerPath(req),
        limit: cleanPositiveInt(req.query.limit, 5, 10),
        queueLimit: cleanPositiveInt(req.query.queueLimit, 40, 100),
        snapshotLimit: cleanPositiveInt(req.query.snapshotLimit, 5, 25),
        movementLimit: cleanPositiveInt(req.query.movementLimit, 100, 250),
        includeUnchanged: cleanBoolean(req.query.includeUnchanged),
        includeObservationOnly: cleanBoolean(req.query.includeObservationOnly),
      }),
    });
  } catch (error) {
    console.error('crm-vnext engagement-resolution-loop api error', error);
    return res.status(500).json({ ok: false, error: 'engagement_resolution_loop_failed' });
  }
}


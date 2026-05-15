import type { NextApiRequest, NextApiResponse } from 'next';
import {
  readCrmEngagementSnapshotLedger,
} from '../../../lib/crm/crm-vnext-engagement-snapshot-ledger';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      ledger: Awaited<ReturnType<typeof readCrmEngagementSnapshotLedger>>;
    }
  | { ok: false; error: string };

const cleanString = (value: unknown): string | null => {
  if (Array.isArray(value)) return cleanString(value[0]);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanLimit = (value: unknown, fallback: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, 100);
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

  try {
    return res.status(200).json({
      ok: true,
      ledger: await readCrmEngagementSnapshotLedger(getLedgerPath(req) ?? undefined, {
        limit: cleanLimit(req.query.limit, 10),
        movementLimit: cleanLimit(req.query.movementLimit, 12),
      }),
    });
  } catch (error) {
    console.error('crm-vnext engagement-snapshots api error', error);
    return res.status(500).json({ ok: false, error: 'engagement_snapshots_failed' });
  }
}

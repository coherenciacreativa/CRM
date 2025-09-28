import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sbReady, sbSelect } from '../../../lib/utils/sb';

function parseLimit(value: unknown, fallback: number): number {
  const numeric = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(200, Math.max(1, Math.floor(numeric)));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!sbReady()) {
    return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
  }

  const limit = parseLimit(req.query?.limit, 20);
  const selectResult = await sbSelect('webhook_events', {
    select: 'id,provider,contact_id,message_id,extracted_email,status,created_at',
    order: 'created_at.desc',
    limit,
  });

  if (!selectResult.ok || !Array.isArray(selectResult.json)) {
    return res.status(500).json({ ok: false, error: 'select_failed', detail: selectResult.json });
  }

  return res.status(200).json({
    ok: true,
    items: selectResult.json,
    count: selectResult.json.length,
  });
}

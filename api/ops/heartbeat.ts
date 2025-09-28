import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sbReady, sbSelect } from '../../lib/utils/sb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!sbReady()) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const result = await sbSelect(
      'event_log?select=id,source,action,level,data,created_at&action=eq.reprocess&order=created_at.desc&limit=1',
    );
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: 'select_failed', detail: result.json });
    }

    const items = Array.isArray(result.json) ? result.json : [];
    return res.status(200).json({ ok: true, last: items[0] ?? null });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
